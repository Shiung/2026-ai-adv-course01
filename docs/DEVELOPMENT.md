# DEVELOPMENT.md

## 命名規則對照表

| 情境 | 風格 | 範例 |
|------|------|------|
| DB 欄位 | snake_case | `product_id`, `created_at`, `recipient_name` |
| JS 變數 / 函式 | camelCase | `productId`, `cartItems`, `getAdminToken` |
| API 請求 body | camelCase | `{ productId, recipientName, recipientEmail }` |
| API 回應 body | snake_case（直接回傳 DB 行） | `{ product_name, product_price }` |
| 路由檔案 | camelCase + Routes 後綴 | `cartRoutes.js`, `adminProductRoutes.js` |
| EJS 頁面檔案 | kebab-case | `product-detail.ejs`, `order-detail.ejs` |
| 前端 JS 頁面檔案 | kebab-case | `admin-products.js`, `order-detail.js` |

## 模組系統

專案使用 **CommonJS**（`require` / `module.exports`），不使用 ESM（`import`/`export`）。
Vitest 設定使用 `import`（ESM 語法），但測試檔案本身使用 CommonJS。

## 新增 API 路由步驟

1. 在 `src/routes/` 建立新路由檔（如 `fooRoutes.js`）
2. 在 `app.js` 掛載：`app.use('/api/foo', require('./src/routes/fooRoutes'))`
3. 在路由 handler 上方加上 `@openapi` JSDoc 標注，供 swagger-jsdoc 解析
4. 執行 `npm run openapi` 驗證 spec 是否正確產生
5. 在 `tests/` 建立對應測試檔，並更新 `vitest.config.js` 的 `sequence.files`

## 新增 Middleware 步驟

1. 在 `src/middleware/` 建立 middleware 檔案
2. 函式簽章：`function myMiddleware(req, res, next) { ... }`
3. 路由級使用：`router.use(myMiddleware)` 或在個別 handler 前加入
4. 若是 Error middleware，簽章需為 4 個參數：`function(err, req, res, next)`

## 新增 DB Table 步驟

1. 在 `src/database.js` 的 `initializeDatabase()` 中 `db.exec()` 加入 `CREATE TABLE IF NOT EXISTS`
2. 欄位命名用 snake_case，ID 統一為 `TEXT PRIMARY KEY`（UUID v4）
3. 時間欄位使用 `TEXT DEFAULT (datetime('now'))`（SQLite ISO 8601 字串）
4. 有參照關係加 `FOREIGN KEY` + `db.pragma('foreign_keys = ON')`（已全域開啟）

## 環境變數

| 變數 | 用途 | 必要性 | 預設值 |
|------|------|--------|--------|
| `JWT_SECRET` | JWT 簽發與驗證密鑰 | **必要**（缺少 server exit） | 無 |
| `PORT` | server 監聽埠 | 選填 | `3001` |
| `FRONTEND_URL` | CORS 允許的 origin | 選填 | `http://localhost:3001` |
| `BASE_URL` | 應用程式基礎 URL | 選填 | — |
| `ADMIN_EMAIL` | 初始管理員 Email（seed） | 選填 | `admin@hexschool.com` |
| `ADMIN_PASSWORD` | 初始管理員密碼（seed） | 選填 | `12345678` |
| `NODE_ENV` | 環境識別 | 選填 | — |
| `ECPAY_MERCHANT_ID` | 綠界特店編號 | 預留 | — |
| `ECPAY_HASH_KEY` | 綠界 HashKey | 預留 | — |
| `ECPAY_HASH_IV` | 綠界 HashIV | 預留 | — |
| `ECPAY_ENV` | 綠界環境（staging/production） | 預留 | — |

> ECPay 變數已在 `.env.example` 定義但尚未在程式碼中使用（預留整合）。

## 重要實作細節

### bcrypt saltRounds
`NODE_ENV=test` 時 saltRounds 為 `1`（加速測試），其他環境為 `10`。此邏輯在 `src/database.js` 的 `seedAdminUser()` 中。路由中的 register handler 固定使用 `10`。

### 訂單號碼格式
```
ORD-{YYYYMMDD}-{UUID前5碼大寫}
例：ORD-20260505-A3F2B
```
由 `orderRoutes.js` 中的 `generateOrderNo()` 產生。

### 商品 ID 與訂單快照
建立訂單時，`order_items` 會快照 `product_name` 和 `product_price`，不使用外鍵查詢。這確保日後修改商品資料不影響歷史訂單記錄。

### 敏感錯誤隱藏
`errorHandler.js` 對 500 錯誤永遠回傳通用訊息，避免 stack trace 外洩。非 500 的 operational error（`err.isOperational = true`）才直接顯示 `err.message`。

## 計畫歸檔流程

1. 計畫檔案命名格式：`YYYY-MM-DD-<feature-name>.md`
2. 計畫文件結構：User Story → Spec → Tasks
3. 功能完成後：移至 `docs/plans/archive/`
4. 更新 `docs/FEATURES.md` 狀態 → 更新 `docs/CHANGELOG.md`
