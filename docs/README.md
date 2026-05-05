# 花店電商平台

以 Express.js 為核心的全端花店電商系統，提供前台購物流程與後台管理功能，前後台整合於同一 Node.js 服務中。

## 技術棧

| 層次 | 技術 |
|------|------|
| 後端框架 | Express.js 4.x（CommonJS） |
| 檢視引擎 | EJS 5.x（front / admin 雙 layout） |
| CSS 框架 | Tailwind CSS 4.x |
| 資料庫 | SQLite（better-sqlite3），WAL 模式 |
| 認證 | JWT（HS256，7 天）+ bcrypt |
| 測試 | Vitest + supertest |
| API 文件 | swagger-jsdoc（OpenAPI 3.0） |

## 快速開始

```bash
# 1. 複製環境變數
cp .env.example .env
# 編輯 .env，至少設定 JWT_SECRET

# 2. 安裝依賴
npm install

# 3. 啟動開發伺服器（需另開終端跑 CSS watch）
npm run dev:server
npm run dev:css   # 另一個終端

# 4. 或直接啟動（含 CSS 一次性 build）
npm start
```

伺服器預設在 `http://localhost:3001`。

## 帳號

| 角色 | Email | 密碼 | 說明 |
|------|-------|------|------|
| 管理員 | admin@hexschool.com | 12345678 | 從環境變數 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 讀取，不存在則使用預設值 |

## 常用指令

```bash
npm start          # Build CSS + 啟動 server
npm run dev:server # 只啟動 server
npm run dev:css    # Tailwind watch
npm run css:build  # 一次性 build + minify CSS
npm run openapi    # 產生 OpenAPI spec
npm test           # 執行全套測試（需設定 JWT_SECRET）
```

## 文件索引

| 文件 | 說明 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 架構、目錄結構、API 路由、DB schema |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 開發規範、命名規則、新增模組步驟 |
| [FEATURES.md](./FEATURES.md) | 功能清單與完成狀態 |
| [TESTING.md](./TESTING.md) | 測試規範與執行指南 |
| [CHANGELOG.md](./CHANGELOG.md) | 更新日誌 |
