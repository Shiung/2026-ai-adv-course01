# 測試規範

---

## 測試框架

- **Vitest**：測試執行器（設定於 `vitest.config.js`）
- **supertest**：HTTP 請求模擬，直接注入 Express app 實例，不啟動真實 port

---

## 測試環境特性

測試使用與正式相同的 SQLite 資料庫（`src/database.sqlite`），**不使用 in-memory 或 mock**。每次執行 `npm test` 時，資料庫狀態會累積（seed 資料在第一次建立後不再重建）。

**`NODE_ENV === 'test'` 時的特殊行為**：
- `src/database.js` 的 bcrypt saltRounds 降為 1（避免 bcrypt 拖慢測試）
- Vitest 不會自動設定 `NODE_ENV=test`，需由測試啟動指令設定（`npm test` 腳本中已包含）

---

## 測試檔案總覽

| 檔案 | 對應模組 | 主要測試情境 |
|---|---|---|
| `tests/setup.js` | — | 共用 helper 函式（非測試套件） |
| `tests/auth.test.js` | authRoutes.js | 註冊成功/重複 Email、登入成功/密碼錯誤、取得 profile |
| `tests/products.test.js` | productRoutes.js | 商品列表、分頁、商品詳情、404 |
| `tests/cart.test.js` | cartRoutes.js | 訪客模式 CRUD、會員模式加入、商品不存在 |
| `tests/orders.test.js` | orderRoutes.js | 建立訂單、空購物車、未認證、列表、詳情、404 |
| `tests/adminProducts.test.js` | adminProductRoutes.js | CRUD 完整流程、一般用戶被拒（403）、未認證（401） |
| `tests/adminOrders.test.js` | adminOrderRoutes.js | 列表、status 篩選、詳情（含 user 資訊）、一般用戶被拒 |

---

## 執行順序與依賴關係

`vitest.config.js` 設定 `fileParallelism: false` 且固定執行順序：

```
auth → products → cart → orders → adminProducts → adminOrders
```

**順序的必要性**：
- `products.test.js` 要求資料庫中已有商品（依賴 seed 資料）
- `cart.test.js` 的 `beforeAll` 需先取得商品 ID（從 `/api/products` 取第一筆）
- `orders.test.js` 的 `beforeAll` 需先建購物車項目才能下訂單
- `adminOrders.test.js` 的 `beforeAll` 需先建立一筆訂單才能測試後台查詢

**切勿啟用並行執行**（`fileParallelism: true`），多個測試套件同時操作同一個 SQLite 資料庫會產生競態條件。

---

## 共用 Helper 函式（tests/setup.js）

```js
const { app, request, getAdminToken, registerUser } = require('./setup');
```

### `getAdminToken()`

```js
async function getAdminToken()
// 回傳: Promise<string>  — 管理員 JWT token
```

使用 seed 管理員帳號（`admin@hexschool.com` / `12345678`）登入並回傳 token。每次呼叫都會發送真實 HTTP 請求。若需要在多個測試用到，應在 `beforeAll` 中呼叫一次並存入變數。

### `registerUser(overrides?)`

```js
async function registerUser(overrides = {})
// overrides 可選欄位: { email, password, name }
// 回傳: Promise<{ token: string, user: object }>
```

以隨機 email 自動註冊新用戶，避免測試間的 email 衝突。若不指定 email，格式為 `test-<timestamp>-<random>@example.com`。

---

## 撰寫新測試的步驟

### 1. 建立測試檔案

在 `tests/` 目錄下建立 `<module>.test.js`。

### 2. 在 vitest.config.js 加入執行順序

```js
// vitest.config.js
sequence: {
  files: [
    'tests/auth.test.js',
    'tests/products.test.js',
    // ... 現有檔案
    'tests/yourNew.test.js',  // ← 加在適當位置
  ],
},
```

### 3. 使用 setup.js 的 helper

```js
const { app, request, getAdminToken, registerUser } = require('./setup');

describe('Your Module API', () => {
  let adminToken;
  let resourceId;

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  it('should do something', async () => {
    const res = await request(app)
      .post('/api/your-endpoint')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ key: 'value' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error', null);
    expect(res.body).toHaveProperty('message');
  });
});
```

### 4. 回應格式斷言模式

所有成功回應的標準斷言：

```js
expect(res.status).toBe(200); // 或 201
expect(res.body).toHaveProperty('data');
expect(res.body).toHaveProperty('error', null);
expect(res.body).toHaveProperty('message');
```

所有失敗回應的標準斷言：

```js
expect(res.status).toBe(400); // 或 401、403、404、409
expect(res.body).toHaveProperty('data', null);
expect(res.body).toHaveProperty('error');
expect(res.body.error).not.toBeNull();
```

### 5. 購物車雙模式測試範例

```js
// 訪客模式：使用 X-Session-Id
const sessionId = 'test-session-' + Date.now();
const res = await request(app)
  .post('/api/cart')
  .set('X-Session-Id', sessionId)
  .send({ productId, quantity: 1 });

// 會員模式：使用 Authorization
const { token } = await registerUser();
const res = await request(app)
  .post('/api/cart')
  .set('Authorization', `Bearer ${token}`)
  .send({ productId, quantity: 1 });
```

---

## 常見陷阱

### 1. 資料庫狀態累積

測試不會自動清空資料庫，多次執行 `npm test` 後資料庫會累積大量測試資料（users、orders 等）。  
**影響**：若測試依賴「資料庫只有 seed 資料」的假設（如 `expect(orders.length).toBe(1)`），在第二次執行時會失敗。  
**解決**：測試中只斷言「大於某個下限」或「包含特定項目」，而非精確數量。

### 2. bcrypt 測試環境未加速

若直接執行測試（非透過 `npm test` 腳本），需確認 `NODE_ENV=test`，否則 bcrypt 使用 10 rounds，每次 `registerUser()` 都會耗費數秒。

### 3. 訂單測試依賴購物車狀態

`orders.test.js` 的第一個測試（建立訂單）需要購物車中有商品，且購物車商品在下完第一個訂單後會被清空。若要測試「空購物車建立訂單」，需在第一個成功訂單測試之後執行（如現有測試的順序）。

### 4. Admin 測試的 adminToken 重用

`getAdminToken()` 每次呼叫都發送 HTTP 請求。若套件內有多個 `it` 需要 admin token，應在 `beforeAll` 中呼叫一次，不要在每個 `it` 內重複呼叫。

### 5. 執行單一測試檔案

若需只執行某個套件：

```bash
npx vitest run tests/auth.test.js
```

但要注意，若該套件依賴前一個套件建立的資料（如 adminOrders 依賴有訂單存在），單獨執行可能因資料不足而失敗。

---

## 執行測試

```bash
# 執行全部（固定順序，循序執行）
npm test

# 執行單一檔案
npx vitest run tests/cart.test.js

# Watch 模式（開發時）
npx vitest tests/auth.test.js
```
