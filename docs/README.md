# 花藝電商後台系統

一個全端花藝電商平台，提供前台購物流程與後台管理功能。

## 技術棧

| 類別 | 技術 |
|------|------|
| 後端框架 | Express.js ~4.16.1 |
| 模板引擎 | EJS 5.0 |
| CSS 框架 | Tailwind CSS 4.2.2 |
| 資料庫 | SQLite（better-sqlite3 12.8） |
| 認證 | JWT (jsonwebtoken) + X-Session-Id（訪客） |
| 密碼雜湊 | bcrypt 6.0 |
| 測試 | Vitest 2.1 + supertest 7.2 |
| API 文件 | swagger-jsdoc |
| 其他 | uuid、cors、dotenv |

## 快速開始

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.example .env
# 編輯 .env，至少設定 JWT_SECRET

# 3. 啟動（自動 seed admin 帳號與商品資料）
npm start
# → http://localhost:3001
```

預設 Admin 帳號（seed 資料）：
- Email: `admin@hexschool.com`
- 密碼: `12345678`（或 `.env` 中的 `ADMIN_PASSWORD`）

## 常用指令

| 指令 | 說明 |
|------|------|
| `npm start` | 建置 CSS 並啟動伺服器 |
| `npm run dev:server` | 僅啟動伺服器（開發時不重建 CSS） |
| `npm run dev:css` | 監聽 CSS 變更（另開終端執行） |
| `npm run openapi` | 產生 `openapi.json` |
| `npm test` | 執行所有測試 |

## 前台頁面

| 路徑 | 說明 |
|------|------|
| `/` | 首頁（商品列表） |
| `/products/:id` | 商品詳情 |
| `/cart` | 購物車 |
| `/checkout` | 結帳 |
| `/login` | 登入 |
| `/orders` | 我的訂單列表 |
| `/orders/:id` | 訂單詳情 |

## 後台頁面

| 路徑 | 說明 |
|------|------|
| `/admin/products` | 商品管理（CRUD） |
| `/admin/orders` | 訂單管理（列表 + 詳情） |

## 文件索引

| 文件 | 說明 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 架構、目錄結構、資料流、資料庫 Schema、API 路由總覽 |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 開發規範、命名規則、新增功能步驟、環境變數 |
| [FEATURES.md](./FEATURES.md) | 功能列表、API 行為描述、業務邏輯、錯誤碼 |
| [TESTING.md](./TESTING.md) | 測試規範、測試輔助函式、撰寫指引 |
| [CHANGELOG.md](./CHANGELOG.md) | 更新日誌 |
