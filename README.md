# 🏮 溫馨成語接龍遊戲 🏮

一個專為長輩設計、字體大且清晰、介面溫馨的成語接龍網頁遊戲。玩家可以點擊成語卡片中的任何一個字進行分支接龍，並可點擊已解鎖的成語查看注音與意思解釋。

## 🌟 遊戲特色

- 👴 **長者友善設計**：字體超大、色彩溫馨護眼（暖米與松針綠）、按鈕好點擊。
- 🎋 **分支成語樹接龍**：首創「成語樹」玩法，點擊卡片中任意字均可往外生長接龍。
- 🧩 **字盤拼字免打字**：提供大字備選字盤，免除長輩辛苦打字的挫折感。
- 📖 **成語小字典**：點擊已解鎖成語，即可彈出注音與詳細釋義，寓教於樂。
- 💾 **進度隨時存**：支援註冊/登入，自動將分數與關卡進度儲存至 Firebase 雲端或本機快取。
- 🏆 **榮譽金榜**：即時更新排行榜，與家人朋友一較高下！

## 🛠️ 技術棧

- **前端核心**：React + TypeScript + Vite
- **樣式設計**：Vanilla CSS (精緻溫馨配色與微動效)
- **後端服務**：Firebase Authentication & Firestore Database
- **資料來源**：教育部成語資料精簡版 (共 1642 筆主條四字成語)

## 🚀 快速啟動

### 1. 安裝依賴

本專案使用符號連結優化 Google 雲端硬碟讀寫。請在本機執行：

```bash
npm install
```

### 2. 設定環境變數

在根目錄建立 `.env.local` 檔案並填入您的 Firebase 設定值：

```ini
VITE_FIREBASE_API_KEY=您的_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=您的_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=您的_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=您的_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=您的_SENDER_ID
VITE_FIREBASE_APP_ID=您的_APP_ID
```

### 3. 本地開發

啟動開發伺服器：

```bash
npm run dev
```

### 4. 專案打包

```bash
npm run build
```

## 🔒 安全性說明

- 所有 Firebase API Keys 均放置於 `.env.local` 中，此檔案已加入 `.gitignore`，確保敏感憑證不會流出至網路或 GitHub 上。
