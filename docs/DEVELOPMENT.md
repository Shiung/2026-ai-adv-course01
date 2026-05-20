# 開發規範

## 命名規則

| 情境 | 規則 | 範例 |
|------|------|------|
| 資料庫欄位 | snake_case | `user_id`, `created_at`, `image_url` |
| JavaScript 變數/函式 | camelCase | `userId`, `getAdminToken`, `cartItems` |
| API request body | camelCase | `productId`, `recipientName`, `recipientEmail` |
| API response 欄位 | snake_case（與 DB 欄位一致） | `product_id`, `order_no`, `total_amount` |
| 路由檔案 | camelCase + Routes | `authRoutes.js`, `adminProductRoutes.js` |
| Middleware 檔案 | camelCase + Middleware | `authMiddleware.js`, `sessionMiddleware.js` |
| EJS 模板 | kebab-case | `product-detail.ejs`, `admin-header.ejs` |
| 前端 JS 頁面 | kebab-case | `product-detail.js`, `admin-products.js` |
| UUID | 全部使用 `uuidv4()` 作為主鍵 | `id: uuidv4()` |

## 模組系統

專案使用 **CommonJS**（`require` / `module.exports`），除了 `vitest.config.js` 使用 ES module（`import`/`export default`）。

在路由和 middleware 檔案中統一使用 `require`：

```js
const express = require('express');
const db = require('../database');
```

## 新增 API 路由步驟

1. **在 `src/routes/` 建立或編輯路由檔**：加上 `@openapi` JSDoc 和路由處理函式
2. **在 `app.js` 掛載路由**：`app.use('/api/xxx', require('./src/routes/xxxRoutes'))`
3. **套用適當 middleware**：公開路由無需認證；一般路由加 `authMiddleware`；admin 路由加 `authMiddleware + adminMiddleware`
4. **使用 parameterized SQL**：`db.prepare('SELECT * FROM xxx WHERE id = ?').get(id)`，禁止字串拼接
5. **回應格式**：成功回傳 `{ data: ..., error: null, message: '...' }`；失敗回傳 `{ data: null, error: 'ERROR_CODE', message: '...' }`
6. **執行 `npm run openapi`** 更新 API 文件
7. **在 `tests/` 新增對應測試**（參見 TESTING.md）

## 新增 Middleware 步驟

1. 在 `src/middleware/` 建立 `xxxMiddleware.js`
2. 函式簽名：`function xxxMiddleware(req, res, next) { ... }`
3. 正常情況呼叫 `next()`，異常情況直接 `res.status(xxx).json(...)`
4. 在需要的路由檔最頂端 `router.use(xxxMiddleware)` 或在個別路由套用

## 新增資料庫表格步驟

1. 在 `src/database.js` 的 `initializeDatabase()` 函式中的 `db.exec(...)` 新增 `CREATE TABLE IF NOT EXISTS`
2. 添加 UUID 主鍵：`id TEXT PRIMARY KEY`
3. 添加 `FOREIGN KEY` 約束（foreign_keys pragma 已啟用）
4. 若需要 seed 資料，在 `initializeDatabase()` 中呼叫新的 seed 函式

## 環境變數

| 變數 | 用途 | 必要 | 預設值 |
|------|------|------|--------|
| `JWT_SECRET` | JWT 簽發與驗證密鑰 | **必要**（server.js 啟動時強制檢查） | 無 |
| `PORT` | HTTP 伺服器 port | 選填 | `3001` |
| `FRONTEND_URL` | CORS 允許的前端來源 | 選填 | `http://localhost:3001` |
| `BASE_URL` | 伺服器本身的 URL | 選填 | `http://localhost:3001` |
| `ADMIN_EMAIL` | Seed admin 帳號的 email | 選填 | `admin@hexschool.com` |
| `ADMIN_PASSWORD` | Seed admin 帳號的密碼 | 選填 | `12345678` |
| `ECPAY_MERCHANT_ID` | 綠界商店代號 | **必要**（使用 ECPay 金流時） | — |
| `ECPAY_HASH_KEY` | 綠界 Hash Key | **必要**（使用 ECPay 金流時） | — |
| `ECPAY_HASH_IV` | 綠界 Hash IV | **必要**（使用 ECPay 金流時） | — |
| `ECPAY_ENV` | 綠界環境（`staging` / `production`） | 選填 | `staging` |

> ECPay 相關變數缺少時，呼叫 `GET /api/orders/:id/ecpay-form` 或 `POST /api/orders/:id/verify-payment` 會因 `buildAIOParams` / `queryTradeInfo` 無法取得憑證而失敗。本地開發請以 ECPay 測試帳號（staging）填入 `.env`。

## 計畫歸檔流程

1. 計畫檔案命名格式：`YYYY-MM-DD-<feature-name>.md`（例如：`2026-05-20-payment-integration.md`）
2. 計畫文件結構：

```markdown
# [功能名稱] 開發計畫

## User Story
身為...，我希望...，以便...

## Spec
- API 端點與行為描述
- 資料庫異動

## Tasks
- [ ] 任務一
- [ ] 任務二
```

3. 計畫存放位置：`docs/plans/`（進行中）→ `docs/plans/archive/`（完成後移入）
4. 功能完成後：更新 `docs/FEATURES.md` 和 `docs/CHANGELOG.md`

## 前端頁面 JS 規範

每個頁面對應一個 `public/js/pages/*.js` 檔案，透過 layout 的 `pageScript` 變數動態載入。頁面 JS 使用瀏覽器原生 DOM API，透過 `public/js/api.js` 呼叫後端 API。

Auth 相關操作（取得 token、登入狀態判斷）統一透過 `public/js/auth.js`。
