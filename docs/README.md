# 花卉電商後端

一個以 Node.js / Express 建構的全端電商示範專案，提供花卉商品販售、購物車、訂單管理完整流程，並附帶後台管理介面。

---

## 技術棧

| 層級 | 技術 |
|---|---|
| Runtime | Node.js |
| Web 框架 | Express 4.x |
| 資料庫 | SQLite（better-sqlite3，WAL 模式） |
| 模板引擎 | EJS 5.x（前台 / 後台雙 layout） |
| CSS 框架 | TailwindCSS 4.x（CLI 工具編譯） |
| 認證 | JWT（jsonwebtoken，HS256，有效期 7 天） |
| 密碼雜湊 | bcrypt（正式 10 rounds，測試 1 round） |
| ID 生成 | uuid v4 |
| 測試框架 | Vitest + supertest |
| API 文件 | swagger-jsdoc（OpenAPI 3.0.3） |

---

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

```bash
cp .env.example .env
# 編輯 .env，至少填入 JWT_SECRET
```

`.env` 最小必要設定：

```env
JWT_SECRET=your-super-secret-key
```

### 3. 啟動開發伺服器

```bash
# 終端機 1：啟動 API + 頁面伺服器（port 3001）
node server.js

# 終端機 2：即時編譯 TailwindCSS（可選，若需要修改 CSS）
npm run dev:css
```

瀏覽 `http://localhost:3001` 即可使用。

### 4. 正式啟動（一行指令）

```bash
npm start
# 等同於：npm run css:build && node server.js
```

---

## 預設種子帳號

啟動時自動建立，可透過 `.env` 覆蓋：

| 欄位 | 預設值 |
|---|---|
| Email | `admin@hexschool.com` |
| Password | `12345678` |
| Role | `admin` |

---

## 常用指令

| 指令 | 說明 |
|---|---|
| `npm start` | 建置 CSS 後啟動伺服器 |
| `node server.js` | 直接啟動（不重建 CSS） |
| `npm test` | 執行所有整合測試（循序） |
| `npm run css:build` | 一次性 minify 建置 CSS |
| `npm run dev:css` | TailwindCSS watch 模式 |
| `npm run openapi` | 產生 `openapi.json` |

---

## 文件索引

| 文件 | 說明 |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 目錄結構、啟動流程、API 路由總覽、DB Schema、認證機制 |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 開發規範、命名規則、新增功能步驟、環境變數 |
| [FEATURES.md](./FEATURES.md) | 功能清單與完成狀態、各功能詳細行為描述 |
| [TESTING.md](./TESTING.md) | 測試規範、測試檔案說明、撰寫新測試步驟 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本更新日誌 |
| [plans/](./plans/) | 開發計畫目錄（完成後移至 archive/） |
