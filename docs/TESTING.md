# 測試規範

## 測試技術棧

- **框架**：Vitest 2.1（配置於 `vitest.config.js`）
- **HTTP 測試**：supertest 7.2
- **執行指令**：`npm test`（等同 `vitest run`）

## 測試檔案

| 測試檔案 | 說明 |
|---------|------|
| `tests/setup.js` | 輔助函式（非測試檔案） |
| `tests/auth.test.js` | 用戶認證：register、login、profile |
| `tests/products.test.js` | 前台商品列表、詳情 |
| `tests/cart.test.js` | 購物車 CRUD（JWT + session 雙模式） |
| `tests/orders.test.js` | 訂單建立、列表、詳情、模擬付款 |
| `tests/adminProducts.test.js` | 後台商品 CRUD（包含刪除保護驗證） |
| `tests/adminOrders.test.js` | 後台訂單列表（含 status 篩選）、詳情 |

## 執行順序與依賴關係

**關鍵**：`vitest.config.js` 設定 `fileParallelism: false` 且固定 `sequence.files` 順序。必須按以下順序執行：

```
auth → products → cart → orders → adminProducts → adminOrders
```

原因：
- `cart` 測試需要先有商品（`products` seed）和可登入的用戶（`auth`）
- `orders` 測試需要購物車中有資料
- `adminProducts` 刪除保護測試需要先有訂單（`orders`）

**測試共享同一個 SQLite DB**（`database.sqlite`），使用 seed 資料起點。各測試以 `Date.now()` 動態產生唯一 email，避免衝突。

## 輔助函式（tests/setup.js）

### `getAdminToken()`

```js
async function getAdminToken() // → string (JWT token)
```

用 seed admin 帳號（`admin@hexschool.com` / `12345678`）呼叫 `/api/auth/login` 取得 token。適用於所有需要 admin 認證的測試。

### `registerUser(overrides = {})`

```js
async function registerUser(overrides) // → { token, user }
```

自動產生唯一 email（`test-${Date.now()}-${random}@example.com`）並呼叫 `/api/auth/register`。可傳入 `{ email, password, name }` 覆寫預設值。

### `request`

直接從 setup.js 匯出的 supertest 實例：`const { app, request } = require('./setup')`

## 撰寫新測試步驟

1. 在對應的測試檔（或新建）引入 setup.js：
   ```js
   const { app, request, getAdminToken, registerUser } = require('./setup');
   ```

2. 使用 `describe` 分組相關測試：
   ```js
   describe('Feature API', () => {
     let token;
     beforeAll(async () => { token = await getAdminToken(); });
     it('should ...', async () => { ... });
   });
   ```

3. 使用 supertest 發送請求：
   ```js
   const res = await request(app)
     .get('/api/xxx')
     .set('Authorization', `Bearer ${token}`);
   expect(res.status).toBe(200);
   expect(res.body).toHaveProperty('data');
   expect(res.body.error).toBeNull();
   ```

4. 若新測試檔有順序依賴，更新 `vitest.config.js` 的 `sequence.files` 陣列

## 常見陷阱

- **不要並行執行**：`fileParallelism: false` 是刻意設定，因為測試共享 DB 狀態。不要更改此設定。
- **session 測試**：測試購物車的 session 模式時，以 `.set('X-Session-Id', 'test-session-xxx')` 傳入 header
- **bcrypt 在測試環境只用 1 round**：`database.js` 透過 `process.env.NODE_ENV === 'test'` 判斷。Vitest 預設會設定 `NODE_ENV=test`，無需手動設定。
- **購物車訪客 → 登入轉換未自動合併**：測試訪客購物車時，登入後購物車不會自動合併，需分開測試兩種模式。
- **Admin seed 每次啟動只建立一次**：`database.js` 的 `seedAdminUser()` 使用 `SELECT id WHERE email = ?` 檢查是否已存在，不會重複建立。
