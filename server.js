const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const ChatGPTAutomation = require('./chatgpt-automation');

const app = express();
const PORT = 3000;

// 中介軟體
app.use(cors());
app.use(express.json());

// 提供 presets.json 給前端（必須在 static 之前）
app.get('/presets.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(__dirname, 'presets.json'));
});

app.use(express.static('public'));
app.use('/output', express.static('output'));

// 設定檔案上傳
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB（增加限制以支援高解析度圖片）
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片檔案 (jpg, png, webp)'));
    }
  }
});

// 全域變數儲存當前任務狀態
let currentTask = {
  status: 'idle', // idle, running, completed, failed
  progress: 0,
  total: 0,
  currentSticker: '',
  results: [],
  error: null,
  startTime: null,
  endTime: null
};

// ==================== API 路由 ====================

/**
 * 首頁
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'generator.html'));
});

/**
 * 上傳母圖和錨點圖
 */
app.post('/api/upload', upload.fields([
  { name: 'motherImage', maxCount: 1 },
  { name: 'anchorImage', maxCount: 1 }
]), (req, res) => {
  try {
    if (!req.files || !req.files.motherImage || !req.files.anchorImage) {
      return res.status(400).json({ 
        success: false, 
        error: '請上傳母圖和錨點圖' 
      });
    }

    const motherImage = req.files.motherImage[0];
    const anchorImage = req.files.anchorImage[0];

    res.json({
      success: true,
      message: '圖片上傳成功',
      files: {
        motherImage: {
          filename: motherImage.filename,
          path: motherImage.path,
          size: motherImage.size
        },
        anchorImage: {
          filename: anchorImage.filename,
          path: anchorImage.path,
          size: anchorImage.size
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 開始生成貼圖
 */
app.post('/api/generate/start', async (req, res) => {
  try {
    // 檢查是否有任務正在執行
    if (currentTask.status === 'running') {
      return res.status(400).json({
        success: false,
        error: '已有任務正在執行中'
      });
    }

    const { motherImagePath, anchorImagePath, selectedPresets, customPrompt } = req.body;

    if (!motherImagePath || !anchorImagePath) {
      return res.status(400).json({
        success: false,
        error: '請提供母圖和錨點圖路徑'
      });
    }

    // 載入預設文字
    const allPresets = JSON.parse(fs.readFileSync('presets.json', 'utf8'));
    
    // 如果有指定要生成的貼圖，只生成那些
    const presetsToGenerate = selectedPresets && selectedPresets.length > 0
      ? allPresets.filter((p, i) => selectedPresets.includes(i))
      : allPresets;

    // 初始化任務狀態
    currentTask = {
      status: 'running',
      progress: 0,
      total: presetsToGenerate.length,
      currentSticker: '',
      results: [],
      error: null,
      startTime: new Date().toISOString(),
      endTime: null
    };

    // 立即回應，開始背景執行
    res.json({
      success: true,
      message: '開始生成貼圖',
      taskId: 'task_' + Date.now(),
      total: presetsToGenerate.length
    });

    // 背景執行生成任務
    generateStickersBackground(motherImagePath, anchorImagePath, presetsToGenerate, customPrompt);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 查詢任務狀態
 */
app.get('/api/generate/status', (req, res) => {
  res.json({
    success: true,
    task: currentTask
  });
});

/**
 * 取得生成結果
 */
app.get('/api/generate/results', (req, res) => {
  if (currentTask.status !== 'completed') {
    return res.status(400).json({
      success: false,
      error: '任務尚未完成'
    });
  }

  res.json({
    success: true,
    results: currentTask.results,
    summary: {
      total: currentTask.total,
      success: currentTask.results.filter(r => r.success).length,
      failed: currentTask.results.filter(r => !r.success).length,
      startTime: currentTask.startTime,
      endTime: currentTask.endTime
    }
  });
});

/**
 * 下載單張貼圖
 */
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'output', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: '檔案不存在'
    });
  }

  res.download(filePath);
});

/**
 * 下載所有貼圖（ZIP）
 */
app.get('/api/download-all', async (req, res) => {
  try {
    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.attachment('line-stickers.zip');
    archive.pipe(res);

    // 將 output 目錄中的所有 PNG 檔案加入 ZIP
    const outputDir = path.join(__dirname, 'output');
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.png'));
      files.forEach(file => {
        archive.file(path.join(outputDir, file), { name: file });
      });
    }

    await archive.finalize();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 重置任務
 */
app.post('/api/reset', (req, res) => {
  if (currentTask.status === 'running') {
    return res.status(400).json({
      success: false,
      error: '無法重置正在執行的任務'
    });
  }

  currentTask = {
    status: 'idle',
    progress: 0,
    total: 0,
    currentSticker: '',
    results: [],
    error: null,
    startTime: null,
    endTime: null
  };

  res.json({
    success: true,
    message: '任務已重置'
  });
});

// ==================== 背景任務 ====================

/**
 * 背景執行生成任務
 */
async function generateStickersBackground(motherImagePath, anchorImagePath, presets, customPrompt) {
  const bot = new ChatGPTAutomation();

  try {
    console.log('\n🚀 開始背景生成任務...\n');

    // 初始化瀏覽器
    await bot.init();

    // 登入
    await bot.login();

    // 生成貼圖（帶進度更新）
    const results = await bot.generateStickers(
      presets,
      motherImagePath,
      anchorImagePath,
      'output',
      customPrompt  // 傳遞自訂 Prompt
    );

    // 更新任務狀態
    currentTask.status = 'completed';
    currentTask.progress = presets.length;
    currentTask.results = results;
    currentTask.endTime = new Date().toISOString();

    console.log('\n✅ 背景任務完成\n');

  } catch (error) {
    console.error('\n❌ 背景任務失敗：', error);
    currentTask.status = 'failed';
    currentTask.error = error.message;
    currentTask.endTime = new Date().toISOString();
  } finally {
    await bot.close();
  }
}

// ==================== 啟動伺服器 ====================

app.listen(PORT, () => {
  console.log('\n🎨 ========================================');
  console.log('🎨 LINE 貼圖生成器伺服器已啟動');
  console.log('🎨 ========================================\n');
  console.log(`📡 伺服器位址：http://localhost:${PORT}`);
  console.log(`📁 輸出目錄：${path.resolve('output')}`);
  console.log(`📤 上傳目錄：${path.resolve('uploads')}\n`);
  console.log('💡 提示：');
  console.log('   1. 在瀏覽器開啟 http://localhost:3000');
  console.log('   2. 上傳母圖和錨點圖');
  console.log('   3. 點擊「開始生成」\n');
  console.log('⚠️  注意：首次執行需要手動登入 ChatGPT\n');
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n\n👋 正在關閉伺服器...');
  process.exit(0);
});
