const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');
const path = require('path');

// 使用 stealth plugin 來避免被偵測
chromium.use(stealth);

class ChatGPTAutomation {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.sessionFile = 'session.json';
  }

  /**
   * 初始化瀏覽器
   */
  async init() {
    console.log('🚀 啟動瀏覽器...');
    
    // 使用已安裝的 Chrome 和使用者設定檔
    const userDataDir = 'C:\\Users\\mini2\\AppData\\Local\\Google\\Chrome\\User Data\\Default';
    
    // 使用 launchPersistentContext 來載入使用者設定檔
    this.context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,  // 顯示瀏覽器視窗
      channel: 'chrome', // 使用已安裝的 Chrome
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    // 取得第一個頁面或建立新頁面
    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
    
    // browser 物件在 persistentContext 中不存在，設為 null
    this.browser = null;
    
    console.log('✅ 瀏覽器啟動完成（使用已登入的 Chrome 設定檔）');
  }

  /**
   * 登入 ChatGPT
   */
  async login() {
    console.log('🔐 前往 ChatGPT...');
    
    try {
      await this.page.goto('https://chat.openai.com', {
        waitUntil: 'networkidle',
        timeout: 90000
      });
    } catch (error) {
      console.log('⚠️ 頁面載入超時，繼續嘗試...');
    }

    // 等待頁面穩定
    console.log('⏳ 等待頁面穩定...');
    await this.page.waitForTimeout(5000);

    // 檢查是否已登入 - 使用多個選擇器
    console.log('🔍 檢查登入狀態...');
    
    const loginSelectors = [
      'textarea[placeholder*="提出"]',  // 中文版
      'textarea[placeholder*="Message"]',  // 英文版
      'textarea[name="prompt-textarea"]',  // 通用
      'textarea',  // 任何 textarea
      '#prompt-textarea',  // ID 選擇器
      'div[contenteditable="true"]'  // 可編輯的 div
    ];

    // 嘗試所有選擇器
    for (const selector of loginSelectors) {
      try {
        const element = await this.page.waitForSelector(selector, { timeout: 3000 });
        if (element) {
          console.log(`✅ 已經登入（偵測到：${selector}）`);
          return true;
        }
      } catch (e) {
        // 繼續嘗試下一個選擇器
      }
    }

    // 如果都找不到，顯示提示並等待
    console.log('⚠️ 需要登入或通過驗證');
    console.log('📝 請在瀏覽器中：');
    console.log('   1. 完成 Cloudflare 驗證（如果有）');
    console.log('   2. 登入 ChatGPT（如果需要）');
    console.log('   3. 等待進入對話介面');
    console.log('⏳ 最多等待 10 分鐘...');
    
    // 等待任一選擇器出現
    try {
      await Promise.race(
        loginSelectors.map(selector =>
          this.page.waitForSelector(selector, { timeout: 600000 })
        )
      );
      console.log('✅ 登入成功');
      return true;
    } catch (error) {
      console.error('❌ 等待登入超時');
      throw new Error('無法偵測到 ChatGPT 輸入框，請確認是否已登入');
    }
  }

  /**
   * 上傳圖片並發送訊息
   */
  async uploadAndSend(message, imagePaths = []) {
    try {
      // 確保頁面還在
      if (this.page.isClosed()) {
        throw new Error('頁面已關閉');
      }

      // 上傳圖片
      if (imagePaths.length > 0) {
        console.log(`📤 上傳 ${imagePaths.length} 張圖片...`);
        
        // 找到檔案上傳按鈕（可能是隱藏的 input）
        const fileInput = this.page.locator('input[type="file"]').first();
        
        for (const imgPath of imagePaths) {
          const absolutePath = path.resolve(imgPath);
          if (!fs.existsSync(absolutePath)) {
            console.error(`❌ 找不到圖片：${absolutePath}`);
            continue;
          }
          await fileInput.setInputFiles(absolutePath);
          await this.page.waitForTimeout(3000); // 增加等待時間
        }
        
        console.log('✅ 圖片上傳完成');
        await this.page.waitForTimeout(2000); // 等待圖片處理
      }

      // 等待並確認 textarea 可見
      console.log('⏳ 等待輸入框...');
      
      // 上傳圖片後，輸入框可能需要更長時間才能使用
      // 嘗試多個選擇器
      const textareaSelectors = [
        'textarea[name="prompt-textarea"]',
        '#prompt-textarea',
        'textarea[placeholder*="提出"]',
        'textarea[placeholder*="Message"]',
        'textarea'
      ];
      
      let textarea = null;
      let foundSelector = null;
      
      // 嘗試找到可用的輸入框
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`嘗試找到輸入框 (${attempt}/3)...`);
        
        for (const selector of textareaSelectors) {
          try {
            const element = this.page.locator(selector).first();
            await element.waitFor({ state: 'attached', timeout: 5000 });
            
            // 檢查是否可見
            const isVisible = await element.isVisible();
            if (isVisible) {
              textarea = element;
              foundSelector = selector;
              console.log(`✅ 找到輸入框：${selector}`);
              break;
            }
          } catch (e) {
            // 繼續嘗試下一個
          }
        }
        
        if (textarea) break;
        
        // 如果沒找到，等待後重試
        console.log('⏳ 輸入框尚未就緒，等待 5 秒...');
        await this.page.waitForTimeout(5000);
      }
      
      if (!textarea) {
        throw new Error('無法找到可用的輸入框');
      }
      
      // 等待輸入框完全可用
      await this.page.waitForTimeout(2000);
      
      // 輸入訊息
      console.log('📝 輸入訊息...');
      await textarea.click({ timeout: 10000 });
      await this.page.waitForTimeout(500);
      await textarea.fill(message);
      await this.page.waitForTimeout(1000);

      // 發送訊息（按 Enter）
      await this.page.keyboard.press('Enter');
      console.log('📨 訊息已發送');

      // 等待回應開始
      await this.page.waitForTimeout(5000);

    } catch (error) {
      console.error(`❌ 發送訊息失敗：${error.message}`);
      
      // 嘗試截圖以便除錯
      try {
        const screenshotPath = `error-screenshot-${Date.now()}.png`;
        await this.page.screenshot({ path: screenshotPath });
        console.log(`📸 錯誤截圖已儲存：${screenshotPath}`);
      } catch (e) {
        // 忽略截圖錯誤
      }
      
      throw error;
    }
  }

  /**
   * 等待 ChatGPT 回應完成（偵測圖片生成）
   */
  async waitForResponse() {
    console.log('⏳ 等待 ChatGPT 生成圖片...');
    
    const startTime = Date.now();
    const maxWaitTime = 15 * 60 * 1000; // 最多等待 15 分鐘
    
    try {
      // 方法 1: 等待「停止生成」按鈕出現並消失
      const stopButton = this.page.locator('button:has-text("Stop generating")');
      
      // 等待按鈕出現（最多 30 秒）
      try {
        await stopButton.waitFor({ state: 'visible', timeout: 30000 });
        console.log('⏳ 正在生成圖片...');
      } catch (e) {
        // 如果沒有出現停止按鈕，可能已經生成完成
        console.log('⏳ 未偵測到生成按鈕，嘗試偵測圖片...');
      }

      // 等待按鈕消失（最多 15 分鐘）
      try {
        await stopButton.waitFor({ state: 'hidden', timeout: maxWaitTime });
        console.log('✅ 生成按鈕已消失');
      } catch (e) {
        console.log('⚠️ 等待超時，嘗試偵測圖片...');
      }

      // 方法 2: 偵測圖片是否已生成
      console.log('🔍 偵測生成的圖片...');
      const imageSelectors = [
        'img[alt*="Generated"]',
        'img[src*="dalle"]',
        'img[src*="oaidalleapiprodscus"]',
        'div[data-message-author-role="assistant"] img'
      ];

      let imageFound = false;
      for (let attempt = 1; attempt <= 30; attempt++) {
        for (const selector of imageSelectors) {
          try {
            const images = await this.page.locator(selector).all();
            if (images.length > 0) {
              console.log(`✅ 偵測到圖片（${selector}）`);
              imageFound = true;
              break;
            }
          } catch (e) {
            // 繼續嘗試
          }
        }
        
        if (imageFound) break;
        
        // 每 10 秒檢查一次
        if (attempt % 6 === 0) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          console.log(`⏳ 已等待 ${elapsed} 秒，繼續偵測圖片...`);
        }
        await this.page.waitForTimeout(10000);
      }

      if (!imageFound) {
        console.log('⚠️ 未偵測到圖片，但繼續執行下載步驟');
      }

      // 額外等待確保圖片完全載入
      await this.page.waitForTimeout(5000);
      
      const totalTime = Math.floor((Date.now() - startTime) / 1000);
      console.log(`✅ 回應完成（總耗時：${totalTime} 秒）`);

    } catch (error) {
      console.error(`⚠️ 等待回應時發生錯誤：${error.message}`);
      // 等待一段時間後繼續
      await this.page.waitForTimeout(10000);
    }
  }

  /**
   * 下載最新生成的圖片
   */
  async downloadLatestImage(savePath) {
    console.log('💾 下載生成的圖片...');
    
    try {
      // 等待圖片載入
      await this.page.waitForTimeout(3000);

      // 尋找生成的圖片（多種可能的選擇器）
      const selectors = [
        'img[alt*="Generated"]',
        'img[src*="dalle"]',
        'img[src*="oaidalleapiprodscus"]',
        'div[data-message-author-role="assistant"] img'
      ];

      let images = [];
      for (const selector of selectors) {
        images = await this.page.locator(selector).all();
        if (images.length > 0) break;
      }

      if (images.length === 0) {
        console.error('❌ 找不到生成的圖片');
        return false;
      }

      // 取得最後一張圖片
      const lastImage = images[images.length - 1];
      const imgSrc = await lastImage.getAttribute('src');

      if (!imgSrc) {
        console.error('❌ 無法取得圖片 URL');
        return false;
      }

      // 下載圖片
      console.log(`📥 下載中：${imgSrc.substring(0, 50)}...`);
      
      // 使用 Playwright 的 request 下載
      const response = await this.page.request.get(imgSrc);
      const buffer = await response.body();

      // 確保目錄存在
      const dir = path.dirname(savePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 儲存檔案
      fs.writeFileSync(savePath, buffer);
      console.log(`✅ 已儲存：${savePath}`);
      
      return true;

    } catch (error) {
      console.error(`❌ 下載失敗：${error.message}`);
      return false;
    }
  }

  /**
   * 批次生成所有貼圖
   */
  async generateStickers(presets, motherImgPath, anchorImgPath, outputDir = 'output') {
    const results = [];
    const startTime = Date.now();

    console.log('\n🎨 ========================================');
    console.log('🎨 開始生成 LINE 貼圖');
    console.log('🎨 ========================================\n');

    try {
      // 讀取前端自訂的 Prompt（如果有）
      const customPromptPath = path.join(__dirname, 'custom-prompt.txt');
      let basePrompt = `請根據我上傳的「母圖（原始角色範例）」作為 【角色唯一身份定義來源】， 以及我上傳的「錨點圖（已生成且最像的角色圖）」作為 【風格與比例校正參考】。

【角色一致性（最高優先）】
- 角色只能有「一個人」
- 臉型、五官比例、眼型、鼻型、嘴型、臉部氣質 必須與「母圖」完全一致
- 髮型、髮色、服裝、配色、畫風 必須同時符合「母圖」與「錨點圖」
- 若母圖與錨點圖有任何差異， 一律以「母圖」為最終標準
- 禁止融合、重新詮釋或美化角色外觀
- 禁止生成新角色或改變角色設定

【畫風與用途】
- 寫實素描風格
- 線條清楚、顏色柔和
- 表情誇張但可愛（不可破壞臉型與五官比例）
- 適合作為 LINE 原創靜態貼圖

【LINE 官方上架規範（必須遵守）】
- 圖片尺寸：370 x 320 px
- 圖片格式：PNG
- 背景：透明
- 檔案大小：小於 1MB
- 角色不可貼邊裁切，四周保留安全邊界
- 角色需清楚可辨
- 文字清楚可讀，不可過小
- 不可包含任何商標、品牌或侵權角色

【構圖要求】
- 單一角色
- 半身或全身皆可
- 角色置中
- 背景保持透明

【重要限制（請嚴格遵守）】
- 表情與動作只能改變「肢體與情緒」 不可改變臉型、五官比例或角色氣質
- 不可加入多餘物件或背景
- 不可改變畫風或風格

請只輸出「一張符合 LINE 規範的貼圖圖片」`;

      // 如果有自訂 prompt，使用它
      if (fs.existsSync(customPromptPath)) {
        basePrompt = fs.readFileSync(customPromptPath, 'utf8');
        console.log('✅ 使用自訂 Prompt');
      }

      // 生成所有貼圖（每次都重新上傳母圖和錨點圖）
      console.log(`📋 開始生成 ${presets.length} 張貼圖\n`);

      for (let i = 0; i < presets.length; i++) {
        const preset = presets[i];
        const stickerNum = i + 1;
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📝 [${stickerNum}/${presets.length}] ${preset.title}`);
        console.log(`${'='.repeat(60)}\n`);

        // 組合完整 prompt：基礎 Prompt + 指定動作
        const fullPrompt = `${basePrompt}

${preset.content}`;

        try {
          // 每次都重新上傳母圖和錨點圖
          console.log('📤 上傳母圖和錨點圖...');
          await this.uploadAndSend(fullPrompt, [motherImgPath, anchorImgPath]);
          
          // 等待至少 10 分鐘
          await this.waitForResponse();

          // 下載圖片
          const filename = `sticker_${String(stickerNum).padStart(2, '0')}_${preset.title}.png`;
          const savePath = path.join(outputDir, filename);
          const success = await this.downloadLatestImage(savePath);

          results.push({
            index: stickerNum,
            title: preset.title,
            success: success,
            path: success ? savePath : null,
            timestamp: new Date().toISOString()
          });

          if (success) {
            console.log(`\n✅ 第 ${stickerNum} 張完成`);
          } else {
            console.log(`\n❌ 第 ${stickerNum} 張失敗`);
          }

          // 等待 3 秒後繼續下一張
          await this.page.waitForTimeout(3000);

        } catch (error) {
          console.error(`\n❌ 生成第 ${stickerNum} 張時發生錯誤：${error.message}`);
          results.push({
            index: stickerNum,
            title: preset.title,
            success: false,
            path: null,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      // 顯示結果統計
      console.log('\n\n📋 生成結果統計\n');
      console.log('🎉 ========================================');
      console.log('🎉 所有貼圖生成完成！');
      console.log('🎉 ========================================\n');

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      const elapsedTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

      console.log(`✅ 成功：${successCount}/${presets.length}`);
      console.log(`❌ 失敗：${failCount}/${presets.length}`);
      console.log(`⏱️  總耗時：${elapsedTime} 分鐘`);
      console.log(`📁 輸出目錄：${path.resolve(outputDir)}\n`);

      // 儲存結果報告
      const reportPath = path.join(outputDir, 'generation-report.json');
      fs.writeFileSync(reportPath, JSON.stringify({
        summary: {
          total: presets.length,
          success: successCount,
          failed: failCount,
          elapsedMinutes: parseFloat(elapsedTime)
        },
        results: results,
        generatedAt: new Date().toISOString()
      }, null, 2));

      console.log(`📄 詳細報告已儲存：${reportPath}\n`);

      return results;

    } catch (error) {
      console.error('\n❌ 生成過程發生嚴重錯誤：', error);
      throw error;
    }
  }

  /**
   * 關閉瀏覽器
   */
  async close() {
    if (this.context) {
      console.log('🔒 關閉瀏覽器...');
      await this.context.close();
      console.log('✅ 已關閉');
    }
  }
}

module.exports = ChatGPTAutomation;
