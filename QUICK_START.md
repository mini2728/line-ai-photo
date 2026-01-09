# 🚀 快速開始指南

## 📦 安裝步驟（5 分鐘）

### 1. 安裝 Node.js
如果還沒有安裝 Node.js，請先下載安裝：
- 前往 https://nodejs.org/
- 下載 LTS 版本（推薦）
- 安裝完成後，開啟終端機確認：
  ```bash
  node --version
  npm --version
  ```

### 2. 下載專案
```bash
# 如果是從 Git 下載
git clone <repository-url>
cd line-sticker-generator

# 或直接解壓縮下載的 ZIP 檔案
```

### 3. 安裝依賴套件
```bash
npm install
```

### 4. 安裝瀏覽器驅動
```bash
npm run install-browsers
```

完成！現在可以開始使用了。

---

## 🎯 使用方式

### 方式 A：網頁介面（推薦新手）

#### 步驟 1：啟動伺服器
```bash
npm start
```

看到以下訊息表示成功：
```
🎨 LINE 貼圖生成器伺服器已啟動
📡 伺服器位址：http://localhost:3000
```

#### 步驟 2：開啟瀏覽器
在瀏覽器輸入：`http://localhost:3000`

#### 步驟 3：上傳圖片
1. 點擊「上傳母圖」區域，選擇您的角色原圖
2. 點擊「上傳錨點圖」區域，選擇風格參考圖
3. 確認預覽圖片正確

#### 步驟 4：開始生成
1. 點擊「開始生成 40 張貼圖」按鈕
2. **首次使用**：會開啟 ChatGPT 網頁，請手動登入
3. 登入後，系統會自動開始生成
4. 等待 10-20 分鐘（可以看到即時進度）

#### 步驟 5：下載結果
1. 生成完成後，可以看到所有貼圖
2. 點擊「下載所有貼圖 (ZIP)」打包下載
3. 或單獨下載每張貼圖

---

### 方式 B：命令列執行（適合進階使用者）

#### 步驟 1：準備圖片
將圖片放在專案根目錄：
- `mother.png` - 母圖
- `anchor.png` - 錨點圖

#### 步驟 2：執行生成
```bash
node generate.js mother.png anchor.png
```

#### 步驟 3：查看結果
生成的貼圖會儲存在 `output/` 資料夾

---

## 💡 首次使用注意事項

### ⚠️ 必須有 ChatGPT Plus
此工具需要 ChatGPT Plus 訂閱（$20/月）才能使用圖片生成功能。

### 🔐 首次登入流程
1. 執行程式後會自動開啟瀏覽器
2. 前往 ChatGPT 登入頁面
3. 輸入您的 OpenAI 帳號密碼
4. 完成任何驗證步驟（如有）
5. 看到 ChatGPT 對話介面後，回到終端機
6. 按下 Enter 繼續

**重要**：登入資訊會儲存在 `session.json`，下次不需要再登入。

### 📷 圖片準備建議
- **母圖**：清楚展示角色的臉部特徵、髮型、服裝
- **錨點圖**：展示期望的畫風和風格
- **格式**：JPG、PNG、WEBP 都可以
- **大小**：建議 1MB 以下
- **解析度**：建議至少 512x512 像素

---

## 📊 生成過程說明

### 時間軸
```
0:00 - 上傳圖片 (10秒)
0:10 - ChatGPT 分析角色特徵 (30秒)
0:40 - 開始生成第 1 張貼圖 (30秒)
1:10 - 生成第 2 張貼圖 (30秒)
...
15:00 - 完成所有 40 張貼圖
```

### 進度顯示
- 網頁介面：即時進度條 + 當前貼圖名稱
- 命令列：文字進度 `[15/40] 生成：加油`

### 可能遇到的情況
- **生成較慢**：正常現象，ChatGPT 需要時間生成圖片
- **偶爾失敗**：系統會記錄失敗的貼圖，可以稍後重試
- **角色不一致**：調整母圖或在 prompt 中加強描述

---

## 📁 檔案位置

### 輸入檔案
- `mother.png` - 您的母圖（放在專案根目錄）
- `anchor.png` - 您的錨點圖（放在專案根目錄）

### 輸出檔案
- `output/sticker_01_你好.png` - 生成的貼圖
- `output/sticker_02_哈囉.png`
- `output/...`
- `output/generation-report.json` - 生成報告

### 系統檔案
- `session.json` - ChatGPT 登入資訊（自動生成）
- `uploads/` - 網頁上傳的圖片（自動建立）

---

## 🔧 常見問題快速解決

### Q1: 執行 `npm start` 後沒反應？
```bash
# 檢查是否有其他程式佔用 3000 埠
# Windows:
netstat -ano | findstr :3000

# Mac/Linux:
lsof -i :3000

# 解決方法：關閉佔用的程式，或修改 server.js 中的 PORT
```

### Q2: 找不到 `node` 指令？
```bash
# 重新安裝 Node.js
# 或檢查環境變數是否設定正確
```

### Q3: 瀏覽器沒有自動開啟？
```bash
# 手動開啟瀏覽器，輸入：
http://localhost:3000
```

### Q4: 登入後還是失敗？
```bash
# 刪除 session.json 重新登入
rm session.json  # Mac/Linux
del session.json  # Windows
```

### Q5: 生成的圖片在哪裡？
```bash
# 檢查 output 資料夾
ls output/  # Mac/Linux
dir output\  # Windows
```

---

## 🎓 下一步

### 自訂貼圖文字
編輯 `presets.json` 檔案，修改或新增貼圖文字。

### 調整生成參數
編輯 `chatgpt-automation.js`，修改 prompt 內容。

### 查看完整文件
閱讀 `README.md` 了解更多進階功能。

---

## 📞 需要幫助？

- 查看 [README.md](README.md) 完整文件
- 查看 [常見問題](README.md#-常見問題)
- 開啟 GitHub Issue 回報問題

---

**🎉 祝您生成順利！**
