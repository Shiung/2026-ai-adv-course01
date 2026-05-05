# TESTING.md

## 測試框架

- **Vitest**（runner）
- **supertest**（HTTP 請求）
- 使用真實 SQLite DB（`database.sqlite`），不 mock

## 執行測試

```bash
# 必須先設定 JWT_SECRET
JWT_SECRET=test-secret npm test

# 或在 .env 中設定後直接執行
npm test
```

## 測試檔案與執行順序

測試**必須依序執行**（`fileParallelism: false`），因為各檔案共用同一 SQLite DB，且部分測試依賴前一測試的 seed 資料或產生的記錄。

| 順序 | 檔案 | 說明 |
|------|------|------|
| 1 | `tests/auth.test.js` | 註冊、登入、profile |
| 2 | `tests/products.test.js` | 前台商品列表、詳情 |
| 3 | `tests/cart.test.js` | 訪客 + 登入購物車操作 |
| 4 | `tests/orders.test.js` | 訂單建立、付款模擬 |
| 5 | `tests/adminProducts.test.js` | 後台商品 CRUD |
| 6 | `tests/adminOrders.test.js` | 後台訂單列表、詳情 |

順序由 `vitest.config.js` 的 `sequence.files` 控制，**不得任意調整**。

## 輔助函式（tests/setup.js）

```js
const { app, request, getAdminToken, registerUser } = require('./setup');
```

| 函式 | 說明 |
|------|------|
| `app` | Express app 實例 |
| `request` | supertest（已綁定 app） |
| `getAdminToken()` | 以 seed admin 帳號登入，回傳 JWT token |
| `registerUser(overrides?)` | 註冊新用戶，回傳 `{ token, user }`；`overrides` 可帶 `{ email, password, name }` |

## 撰寫新測試步驟

1. 在 `tests/` 建立 `<feature>.test.js`
2. 在 `vitest.config.js` 的 `sequence.files` 陣列中加入（放在適當位置）
3. 在 `tests/setup.js` 匯入 `app` 與 `request`
4. 認證情境：用 `getAdminToken()` 取得 admin token，或用 `registerUser()` 取得 user token
5. 每個測試函式用 `it('應該...', async () => { ... })`

### 範例

```js
const { app, request, getAdminToken } = require('./setup');

describe('Foo API', () => {
  let adminToken;

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  it('should return 200', async () => {
    const res = await request(app)
      .get('/api/foo')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error', null);
  });
});
```

## 常見陷阱

| 陷阱 | 說明 |
|------|------|
| 不設 JWT_SECRET | server.js 不會 exit（測試直接 require app），但 jwt.sign/verify 會拋錯 |
| 測試共用同一 DB | 前面的測試改動（新增商品、訂單）會影響後面的測試；需注意插入的記錄不清除 |
| 購物車測試需先有商品 | `beforeAll` 中先呼叫 `GET /api/products` 取得 `productId` |
| 訂單測試需以 JWT 模式加入購物車 | 訪客（session）購物車無法結帳，需切換為登入模式再加入 |
| bcrypt 在測試環境 | seed admin 用 `saltRounds=1`（`NODE_ENV=test`），新 register 在路由中固定用 `10` |
