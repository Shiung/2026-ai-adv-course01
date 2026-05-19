# TESTING.md

## 測試框架

- **框架：** Vitest 2
- **HTTP 工具：** supertest 7
- **測試類型：** 整合測試（直接使用 SQLite，不 mock 資料庫）

---

## 測試檔案總覽

| 檔案 | 涵蓋範圍 | 執行順序 |
|------|----------|----------|
| `tests/setup.js` | 共用輔助函式（非測試檔） | — |
| `tests/auth.test.js` | 註冊、登入、個人資料 | 1 |
| `tests/products.test.js` | 商品列表、詳情、分頁、404 | 2 |
| `tests/cart.test.js` | 購物車 CRUD（Guest + JWT 兩模式） | 3 |
| `tests/orders.test.js` | 建立訂單、訂單列表、詳情、付款 | 4 |
| `tests/adminProducts.test.js` | 後台商品 CRUD、權限檢查 | 5 |
| `tests/adminOrders.test.js` | 後台訂單列表（含 status 篩選）、詳情、權限檢查 | 6 |

---

## 執行順序與依賴關係

`vitest.config.js` 設定 `fileParallelism: false`，測試檔案**依序**執行（非並行）。

順序的關鍵原因：
- 所有測試共用同一個 `database.sqlite`（即時寫入 / 讀取）
- `orders.test.js` 依賴種子商品資料存在（products 測試驗證後商品確定存在）
- `adminOrders.test.js` 在 `beforeAll` 中建立真實訂單（需要 products 已存在）
- `cart.test.js` 和 `orders.test.js` 建立的資料不會互相干擾（各自使用不同用戶）

**禁止**：不要在 `vitest.config.js` 開啟 `fileParallelism: true`，會導致 DB 競爭寫入失敗。

---

## 測試設定（vitest.config.js）

```js
{
  test: {
    globals: true,          // 無需 import describe/it/expect
    fileParallelism: false, // 檔案序列執行（重要！）
    sequence: {
      files: [...]          // 明確指定順序
    },
    hookTimeout: 10000      // beforeAll 最多等 10 秒（bcrypt + DB 初始化）
  }
}
```

---

## 輔助函式（tests/setup.js）

### `getAdminToken()`

```js
async function getAdminToken()
// 回傳：string (JWT token)
```

呼叫 `POST /api/auth/login` 使用種子管理員帳號（`admin@hexschool.com` / `12345678`），回傳 JWT token。

使用時機：需要 admin 權限的 `beforeAll`。

### `registerUser(overrides = {})`

```js
async function registerUser(overrides = {})
// 回傳：{ token: string, user: object }
```

呼叫 `POST /api/auth/register` 建立測試用一般用戶。Email 預設以 `test-${Date.now()}-${random}@example.com` 產生，確保每次不重複。

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `overrides.email` | 自動產生 | 可指定固定 Email |
| `overrides.password` | `'password123'` | — |
| `overrides.name` | `'測試使用者'` | — |

---

## 執行測試

```bash
# 執行全部測試
npm test

# 若要只執行特定檔案（vitest CLI）
npx vitest run tests/cart.test.js
```

---

## 撰寫新測試的步驟

1. 在 `tests/` 建立 `<module>.test.js`
2. 在頂部 require setup：
   ```js
   const { app, request, getAdminToken, registerUser } = require('./setup');
   ```
3. 需要登入狀態時，在 `beforeAll` 取得 token：
   ```js
   beforeAll(async () => {
     adminToken = await getAdminToken();
     // 或
     const { token, user } = await registerUser();
   });
   ```
4. 驗證回應結構，確保符合統一格式：
   ```js
   expect(res.body).toHaveProperty('data');
   expect(res.body).toHaveProperty('error', null);
   expect(res.body).toHaveProperty('message');
   ```
5. 將新測試檔加入 `vitest.config.js` 的 `sequence.files` 陣列（放在依賴的測試之後）

---

## 常見陷阱

### 1. cart.test.js 中 guest 模式的 session_id

Guest 購物車以 `X-Session-Id` header 識別。測試中使用固定 sessionId：
```js
const sessionId = 'test-session-' + Date.now();
```
確保不同測試執行間不衝突（但同一次執行內共用）。

### 2. orders.test.js 的購物車清空

建立訂單後購物車自動清空。`should fail to create order with empty cart` 測試利用前一個測試建立訂單後的空購物車，這兩個 case **必須按順序執行**。

### 3. adminProducts.test.js 中的刪除測試

刪除產品後驗證方式：
```js
const getRes = await request(app).get(`/api/products/${createdProductId}`);
expect(getRes.status).toBe(404);
```
直接對公開 API 查詢，確認商品已不存在。

### 4. 種子管理員的 bcrypt rounds

`NODE_ENV=test` 時 bcrypt salt rounds 為 1，讓 `getAdminToken()` 的登入驗證速度更快。但 `database.sqlite` 中種子管理員的密碼在首次 seed 時雜湊，之後不重新雜湊，若切換環境不刪除 DB 可能遇到 rounds 不匹配（實際上 bcrypt 自動讀取 hash 中的 rounds，不影響驗證）。

### 5. 共用資料庫導致的測試污染

測試結束後 SQLite 中的測試資料會殘留（用戶、訂單、商品）。這不影響正確性，但若需乾淨狀態可手動刪除 `database.sqlite`。目前設計接受資料累積，依靠 Email 唯一性（動態 Email）避免衝突。
