# 開發規範

---

## 模組系統

專案使用 **CommonJS**（`require` / `module.exports`），測試設定（vitest.config.js）使用 ES Module 語法（`import`），但測試檔案本身使用 CommonJS。

**不可**混用：在 `src/` 和 `tests/` 目錄下的所有檔案一律用 `require()`；若需修改 vitest.config.js 則保留 ESM。

---

## 命名規則

### 檔案命名

| 類型 | 規則 | 範例 |
|---|---|---|
| Route 檔案 | camelCase + Routes 後綴 | `cartRoutes.js`、`adminOrderRoutes.js` |
| Middleware 檔案 | camelCase + Middleware 後綴 | `authMiddleware.js`、`sessionMiddleware.js` |
| 測試檔案 | camelCase + .test.js 後綴 | `adminProducts.test.js` |
| 頁面 JS | kebab-case，與 pageScript 值一致 | `admin-products.js`、`order-detail.js` |
| EJS 頁面 | kebab-case | `product-detail.ejs`、`order-detail.ejs` |
| 開發計畫 | `YYYY-MM-DD-<feature-name>.md` | `2026-05-10-payment-gateway.md` |

### 程式碼命名

| 類型 | 規則 | 範例 |
|---|---|---|
| 函式 / 變數 | camelCase | `getOwnerCondition`、`adminToken` |
| 常數（模組層級） | SCREAMING_SNAKE_CASE | `SAFE_MESSAGES` |
| DB 欄位 | snake_case | `product_name`、`created_at` |
| API request body 欄位 | camelCase | `productId`、`recipientName` |
| API response 欄位 | snake_case（沿用 DB 欄位） | `product_id`、`order_no` |
| 環境變數 | SCREAMING_SNAKE_CASE | `JWT_SECRET`、`ADMIN_EMAIL` |

**注意**：request body 用 camelCase（前端慣例），response data 用 snake_case（DB 直接回傳），兩者不一致是刻意設計，新功能請沿用此模式。

---

## 環境變數

| 變數 | 用途 | 必要性 | 預設值 |
|---|---|---|---|
| `JWT_SECRET` | JWT 簽名密鑰 | **必填**（未設定則啟動失敗） | 無 |
| `PORT` | HTTP 監聽埠 | 選填 | `3001` |
| `FRONTEND_URL` | CORS 允許的 origin | 選填 | `http://localhost:3001` |
| `ADMIN_EMAIL` | Seed 管理員帳號 Email | 選填 | `admin@hexschool.com` |
| `ADMIN_PASSWORD` | Seed 管理員帳號密碼 | 選填 | `12345678` |
| `ECPAY_MERCHANT_ID` | 綠界特店編號（預留） | 選填 | `3002607`（測試商號） |
| `ECPAY_HASH_KEY` | 綠界 HashKey（預留） | 選填 | — |
| `ECPAY_HASH_IV` | 綠界 HashIV（預留） | 選填 | — |
| `ECPAY_ENV` | 綠界環境（預留） | 選填 | `staging` |

`ADMIN_EMAIL` 與 `ADMIN_PASSWORD` 僅在第一次啟動時（users 表無此 Email）生效；之後修改 .env 並重啟不會更新已存在的帳號。

---

## 新增 API Endpoint 步驟

### 1. 找到或建立對應的 route 檔案

現有 route 檔案位於 `src/routes/`。若新功能屬於既有模組（如新增 cart 功能），直接在對應檔案中加入。若是全新模組，建立 `src/routes/<name>Routes.js`，並在 `app.js` 掛載：

```js
// app.js
app.use('/api/<prefix>', require('./src/routes/<name>Routes'));
```

### 2. 在 route 檔案中撰寫 JSDoc（OpenAPI）

所有 endpoint 必須有 `@openapi` JSDoc，格式參考既有 route 檔案。swagger-jsdoc 會掃描 `src/routes/*.js`。

```js
/**
 * @openapi
 * /api/example:
 *   post:
 *     summary: 說明
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
router.post('/example', authMiddleware, (req, res) => {
  // 實作
});
```

### 3. 認證 middleware 掛載位置

- **整個 router 需要認證**：在 route 檔案頂部 `router.use(authMiddleware)` 或 `router.use(authMiddleware, adminMiddleware)`
- **個別 endpoint 需要認證**：在 route handler 前加 `authMiddleware` 參數（如 authRoutes.js 的 `/profile`）
- **雙模式認證**：參考 cartRoutes.js 的 `dualAuth` 函式，不要直接使用 `authMiddleware`

### 4. 回應格式

所有 API 回應必須遵循統一格式：

```js
// 成功
res.json({ data: <物件或陣列>, error: null, message: '成功' });
res.status(201).json({ data: <物件>, error: null, message: '建立成功' });

// 失敗
res.status(400).json({ data: null, error: 'VALIDATION_ERROR', message: '欄位說明' });
res.status(404).json({ data: null, error: 'NOT_FOUND', message: '資源不存在' });
```

### 5. 錯誤代碼規範

使用大寫底線（SCREAMING_SNAKE_CASE）。現有代碼見 ARCHITECTURE.md「統一回應格式」章節；新增時若情境無法對應現有代碼，自訂新代碼並更新 ARCHITECTURE.md。

---

## 新增 Middleware 步驟

1. 在 `src/middleware/` 建立 `<name>Middleware.js`
2. 函式簽名：
   - 一般 middleware：`function <name>Middleware(req, res, next) {}`
   - 錯誤處理 middleware：`function <name>Handler(err, req, res, _next) {}` （四個參數，Express 以此識別）
3. 以 `module.exports = <name>Middleware` 匯出
4. 在 `app.js` 或 route 檔案中掛載

---

## 新增資料庫欄位或資料表步驟

1. 編輯 `src/database.js` 的 `initializeDatabase()` 函式
2. 在 `db.exec()` 的 SQL 字串中加入新的 `CREATE TABLE IF NOT EXISTS` 或修改現有 CREATE TABLE
3. **注意**：better-sqlite3 不支援 `ALTER TABLE ADD COLUMN IF NOT EXISTS`。若要為已建立的資料庫增加欄位，需要：
   - 方法一：刪除 `src/database.sqlite` 重新啟動（開發環境）
   - 方法二：手動執行 migration SQL（正式環境）
4. 更新 `docs/ARCHITECTURE.md` 的 Schema 表格

---

## JSDoc 格式說明

本專案的 JSDoc 用途為 OpenAPI 文件產生（不是型別文件）。格式遵循 swagger-jsdoc 的 `@openapi` 標記。

**重要**：`@openapi` 區塊必須緊鄰對應的 route handler，且路徑需與 `router.get/post/...` 的實際路徑一致（包含 router 掛載的前綴）。

```js
/**
 * @openapi
 * /api/cart/{itemId}:      ← 完整路徑（含 router 前綴 /api/cart）
 *   patch:
 *     summary: 修改購物車商品數量
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []   ← 對應 swagger-config.js 中定義的 security scheme
 *       - sessionId: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: 數量已更新
 *       400:
 *         description: 庫存不足
 *       404:
 *         description: 購物車項目不存在
 */
router.patch('/:itemId', dualAuth, (req, res) => {
  // ...
});
```

產生文件：

```bash
npm run openapi   # 輸出 openapi.json 至專案根目錄
```

---

## 計畫歸檔流程

### 計畫檔案命名格式

```
docs/plans/YYYY-MM-DD-<feature-name>.md
```

範例：`docs/plans/2026-05-10-payment-gateway.md`

### 計畫文件結構

```markdown
# [功能名稱]

## User Story
身為 <角色>，我希望 <行為>，以便 <目的>。

## Spec
- 詳細規格說明
- API endpoint 設計
- 資料結構設計

## Tasks
- [ ] 任務 1
- [ ] 任務 2
- [x] 已完成任務
```

### 歸檔步驟

功能完成後，依序執行：

1. 移動計畫檔案至 archive：
   ```bash
   mv docs/plans/YYYY-MM-DD-<feature-name>.md docs/plans/archive/
   ```

2. 更新 `docs/FEATURES.md`：
   - 新功能加入功能狀態總覽表，標記 ✅
   - 加入詳細行為描述章節

3. 更新 `docs/CHANGELOG.md`：
   - 放入對應版本區塊（或 `[Unreleased]`）
   - 格式：`### Added / Changed / Fixed / Removed`

4. 若有新增 API 路由或 DB 欄位，同步更新 `docs/ARCHITECTURE.md`
