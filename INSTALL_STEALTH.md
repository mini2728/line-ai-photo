# 安裝 Stealth Plugin 來迴避 Cloudflare 偵測

## 🔧 安裝步驟

### 1. 安裝新的依賴套件

```bash
npm install
```

這會安裝：
- `playwright-extra` - Playwright 的增強版本
- `puppeteer-extra-plugin-stealth` - 隱藏自動化特徵的插件

### 2. 重新啟動伺服器

```bash
# 停止目前的伺服器（Ctrl+C）
npm start
```

### 3. 測試

前往 http://localhost:3000 並嘗試生成貼圖

## 🎯 Stealth Plugin 的作用

這個插件會：
- ✅ 隱藏 `navigator.webdriver` 標記
- ✅ 模擬真實的瀏覽器指紋
- ✅ 移除自動化工具的痕跡
- ✅ 繞過大部分的機器人偵測

## ⚠️ 重要提醒

**不保證 100% 有效**

Cloudflare 的偵測機制會不斷更新，stealth plugin 可能：
- ✅ 有時候有效
- ❌ 有時候還是會被偵測到
- ⚠️ 取決於 Cloudflare 的當前設定

## 🔄 如果還是被偵測到

### 方案 A：多試幾次
有時候重新執行程式就能通過

### 方案 B：等待一段時間
Cloudflare 可能會暫時封鎖您的 IP，等待 10-30 分鐘後再試

### 方案 C：使用 VPN
更換 IP 位址可能有幫助

### 方案 D：切換到官方 API（最推薦）

**OpenAI 官方 API**
- 成本：$1.60 / 40 張
- 優點：完全合法、無驗證碼、穩定可靠
- 實作：需要修改程式碼使用 OpenAI API

**Stability AI**
- 成本：$0.10 / 40 張（便宜 16 倍！）
- 優點：支援 image-to-image、角色一致性最好
- 實作：需要修改程式碼使用 Stability AI API

## 📝 技術說明

### 修改的檔案

1. **package.json**
   - 新增 `playwright-extra`
   - 新增 `puppeteer-extra-plugin-stealth`

2. **chatgpt-automation.js**
   - 從 `playwright` 改為 `playwright-extra`
   - 載入並使用 stealth plugin

### 程式碼變更

```javascript
// 之前
const { chromium } = require('playwright');

// 之後
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
```

## 🎉 測試結果

執行後觀察：
- ✅ 如果能順利進入 ChatGPT 對話介面 → 成功！
- ❌ 如果還是卡在 Cloudflare 驗證頁面 → 需要其他方案

## 💡 下一步

如果 stealth plugin 無效，建議：
1. 切換到 OpenAI 官方 API
2. 或使用 Stability AI（成本最低、效果最好）

需要協助實作官方 API 版本嗎？請告訴我！
