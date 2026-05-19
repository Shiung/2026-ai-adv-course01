# 花卉電商網站

以 Node.js / Express 實作的全端花卉電商範例，含前台購物流程與後台管理介面。

## 技術棧

| 層次 | 技術 |
|------|------|
| Web 框架 | Express 4.16 |
| 模板引擎 | EJS 5（Server-Side Rendering） |
| 資料庫 | SQLite（better-sqlite3 12，WAL 模式） |
| 認證 | JWT（jsonwebtoken 9，HS256，7 天有效） |
| 密碼雜湊 | bcrypt 6 |
| ID 生成 | uuid v4 |
| CSS | Tailwind CSS v4（@tailwindcss/cli） |
| API 文件 | swagger-jsdoc 6（OpenAPI 3.0.3） |
| 測試框架 | Vitest 2 + supertest 7 |

## 快速開始

```bash
# 1. 複製環境變數範本並填入
cp .env.example .env
# 編輯 .env，至少設定 JWT_SECRET

# 2. 安裝依賴
npm install

# 3. 啟動開發 server（使用已建置的 CSS）
npm run dev:server

# 4. （另開終端）即時監聽 CSS 變更
npm run dev:css
```

Server 預設在 **http://localhost:3001** 啟動。

首次啟動時，`src/database.js` 會自動建立 `database.sqlite` 並植入種子資料：
- 管理員帳號：`admin@hexschool.com` / `12345678`
- 8 件花卉商品

## 常用指令

| 指令 | 說明 |
|------|------|
| `npm start` | 建置 CSS 後以生產模式啟動 |
| `npm run dev:server` | 僅啟動 server |
| `npm run dev:css` | 監聽 Tailwind CSS 異動 |
| `npm run css:build` | 一次性建置並壓縮 CSS |
| `npm run openapi` | 產生 openapi.json（需先啟動 server） |
| `npm test` | 執行全部 Vitest 測試 |

## 頁面路由

| 路徑 | 說明 |
|------|------|
| `/` | 前台首頁（商品列表） |
| `/products/:id` | 商品詳情 |
| `/cart` | 購物車 |
| `/checkout` | 結帳 |
| `/login` | 登入 / 註冊 |
| `/orders` | 我的訂單 |
| `/orders/:id` | 訂單詳情（含付款結果 `?payment=success|fail`） |
| `/admin/products` | 後台商品管理 |
| `/admin/orders` | 後台訂單管理 |

## 文件索引

| 文件 | 說明 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 目錄結構、API 路由總覽、資料庫 Schema、認證機制 |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 開發規範、命名規則、新增 API/DB 步驟、環境變數 |
| [FEATURES.md](./FEATURES.md) | 功能列表、行為描述、錯誤碼說明 |
| [TESTING.md](./TESTING.md) | 測試結構、執行順序、撰寫新測試步驟 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本更新記錄 |
