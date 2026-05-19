# DEVELOPMENT.md

## 開發環境設定

1. 複製並編輯環境變數：
   ```bash
   cp .env.example .env
   ```
2. 至少設定 `JWT_SECRET`（任意隨機字串，生產環境請使用 32+ 字元）
3. `npm install`
4. `npm run dev:server`（另開終端 `npm run dev:css` 監聽 CSS）

首次執行 `src/database.js` 時自動建立資料表並植入種子資料，無需手動 migration。

---

## 環境變數

| 變數 | 用途 | 必要 | 預設值 |
|------|------|------|--------|
| `JWT_SECRET` | JWT 簽署密鑰 | **必填**（未設定則啟動失敗） | 無 |
| `PORT` | Server 監聽 port | 否 | `3001` |
| `BASE_URL` | 應用程式對外基礎 URL | 否 | `http://localhost:3001` |
| `FRONTEND_URL` | CORS 允許的前端來源 | 否 | `http://localhost:3001` |
| `ADMIN_EMAIL` | 種子管理員帳號 Email | 否 | `admin@hexschool.com` |
| `ADMIN_PASSWORD` | 種子管理員密碼 | 否 | `12345678` |
| `NODE_ENV` | 執行環境（`test` 時 bcrypt rounds=1） | 否 | 未設定 |
| `ECPAY_MERCHANT_ID` | 綠界商店代號（預留） | 否 | `3002607` |
| `ECPAY_HASH_KEY` | 綠界 HashKey（預留） | 否 | `pwFHCqoQZGmho4w6` |
| `ECPAY_HASH_IV` | 綠界 HashIV（預留） | 否 | `EkRm7iFT261dpevs` |
| `ECPAY_ENV` | 綠界環境（預留） | 否 | `staging` |

> `NODE_ENV=test` 時 bcrypt salt rounds 強制為 1，加快測試速度。

---

## 命名規則

### 檔案命名

| 類型 | 命名規則 | 範例 |
|------|----------|------|
| Route 檔案 | camelCase + `Routes.js` | `cartRoutes.js` |
| Middleware 檔案 | camelCase + `Middleware.js` | `authMiddleware.js` |
| 測試檔案 | camelCase + `.test.js` | `adminOrders.test.js` |
| EJS 頁面 | kebab-case + `.ejs` | `product-detail.ejs` |
| EJS Partial | kebab-case + `.ejs` | `admin-sidebar.ejs` |
| 計畫文件 | `YYYY-MM-DD-<feature-name>.md` | `2026-05-19-payment.md` |

### 程式碼命名

| 類型 | 規則 | 範例 |
|------|------|------|
| 函式、變數 | camelCase | `getAdminToken`, `cartItemId` |
| 常數（模組層） | camelCase（非 ALL_CAPS） | `actionMap`, `dbPath` |
| 資料庫欄位 | snake_case | `product_id`, `created_at` |
| API request body 欄位 | camelCase | `productId`, `recipientName` |
| API response 欄位 | snake_case（與 DB 欄位一致） | `order_no`, `total_amount` |

### API 設計規則

- 回應格式固定為 `{ data, error, message }`
- 成功時 `error: null`，失敗時 `data: null`
- error code 使用 UPPER_SNAKE_CASE（如 `VALIDATION_ERROR`、`NOT_FOUND`）
- Admin 路由前綴：`/api/admin/`

---

## 模組系統

專案使用 **CommonJS**（`require` / `module.exports`）。`vitest.config.js` 是唯一使用 ES Module 語法的檔案（vitest 設定要求）。

---

## 新增 API 路由的步驟

1. 在 `src/routes/` 建立或編輯路由檔案
2. 撰寫 JSDoc `@openapi` 註解（swagger-jsdoc 會自動解析）
3. 在 `app.js` 以 `app.use('/api/prefix', require('./src/routes/yourRoutes'))` 掛載
4. 在 `tests/` 建立對應測試檔案，並加入 `vitest.config.js` 的 `sequence.files` 陣列

---

## 新增 Middleware 的步驟

1. 在 `src/middleware/` 建立 `xxxMiddleware.js`，匯出單一函式
2. 在需要的路由檔案頂端 `require` 並以 `router.use()` 或個別路由掛載
3. 全域 middleware 在 `app.js` 中掛載於路由之前

---

## 新增資料庫表的步驟

1. 在 `src/database.js` 的 `initializeDatabase()` 函式中，於 `db.exec()` 的 SQL 字串裡追加 `CREATE TABLE IF NOT EXISTS ...`
2. 若需要種子資料，新增獨立的 seed 函式並在 `initializeDatabase()` 內呼叫
3. 刪除 `database.sqlite` 後重啟 server，讓資料庫重建（測試環境會在每次測試套件執行時沿用既有 DB）

---

## JSDoc 格式說明

OpenAPI 文件由 `swagger-jsdoc` 從路由檔案的 JSDoc 註解產生，使用 `@openapi` tag：

```js
/**
 * @openapi
 * /api/path:
 *   post:
 *     summary: 簡短說明
 *     tags: [TagName]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [field1]
 *             properties:
 *               field1:
 *                 type: string
 *     responses:
 *       200:
 *         description: 成功
 */
```

安全性方案在 `swagger-config.js` 中定義，可用值：
- `bearerAuth`：JWT Bearer token
- `sessionId`：X-Session-Id header（僅 Cart API）

---

## 計畫歸檔流程

1. 計畫檔案命名格式：`YYYY-MM-DD-<feature-name>.md`
2. 計畫文件結構：
   ```markdown
   ## User Story
   身為 ...，我希望 ...，以便 ...

   ## Spec
   - 功能規格細節

   ## Tasks
   - [ ] 具體待辦事項
   ```
3. 計畫進行中放置於 `docs/plans/`
4. 功能完成後：將計畫檔案移至 `docs/plans/archive/`
5. 同步更新 `docs/FEATURES.md`（勾選完成狀態）與 `docs/CHANGELOG.md`（新增版本記錄）
