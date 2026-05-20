# 架構說明

## 目錄結構

```
├── server.js               # 進入點：設定 PORT、檢查 JWT_SECRET、啟動 HTTP server
├── app.js                  # Express 應用程式：middleware、路由掛載、404 與錯誤處理
├── generate-openapi.js     # 產生 openapi.json 的 CLI 腳本
├── swagger-config.js       # swagger-jsdoc 設定（API 伺服器、securitySchemes）
├── vitest.config.js        # Vitest 設定（測試順序、fileParallelism: false）
├── src/
│   ├── database.js         # 初始化 SQLite DB、建立所有資料表、seed admin + 商品
│   ├── middleware/
│   │   ├── authMiddleware.js    # 驗證 JWT Bearer token，將 decoded user 存入 req.user
│   │   ├── adminMiddleware.js   # 確認 req.user.role === 'admin'
│   │   ├── sessionMiddleware.js # 從 X-Session-Id header 取出 sessionId 存入 req.sessionId
│   │   └── errorHandler.js     # 全域錯誤處理，防止內部錯誤訊息洩漏
│   └── routes/
│       ├── authRoutes.js        # POST /register, POST /login, GET /profile
│       ├── productRoutes.js     # GET /products, GET /products/:id（公開）
│       ├── cartRoutes.js        # 購物車 CRUD（雙模式認證：JWT 或 X-Session-Id）
│       ├── orderRoutes.js       # 訂單 CRUD + 模擬付款（需登入）
│       ├── adminProductRoutes.js # 後台商品 CRUD（需 admin role）
│       ├── adminOrderRoutes.js   # 後台訂單查詢（需 admin role）
│       └── pageRoutes.js        # 所有 EJS 頁面路由（前台 + 後台）
├── views/
│   ├── layouts/
│   │   ├── front.ejs       # 前台 HTML 框架（header、footer、引入 pageScript）
│   │   └── admin.ejs       # 後台 HTML 框架（admin-sidebar、admin-header）
│   ├── pages/
│   │   ├── index.ejs       # 首頁
│   │   ├── product-detail.ejs
│   │   ├── cart.ejs
│   │   ├── checkout.ejs
│   │   ├── login.ejs
│   │   ├── orders.ejs
│   │   ├── order-detail.ejs
│   │   ├── 404.ejs
│   │   └── admin/
│   │       ├── products.ejs
│   │       └── orders.ejs
│   └── partials/
│       ├── head.ejs        # <head> 標籤（CSS 引入）
│       ├── header.ejs      # 前台導覽列
│       ├── footer.ejs
│       ├── admin-header.ejs
│       ├── admin-sidebar.ejs
│       └── notification.ejs # Toast 通知元件
├── public/
│   ├── css/
│   │   ├── input.css       # Tailwind 來源 CSS
│   │   └── output.css      # 建置後的 CSS（git-ignored）
│   ├── js/
│   │   ├── api.js          # 前端 API 呼叫工具函式
│   │   ├── auth.js         # 前端 JWT 管理、登入/登出
│   │   ├── header-init.js  # 初始化導覽列狀態
│   │   ├── notification.js # Toast 通知
│   │   └── pages/          # 各頁面的 JS（index.js、cart.js、checkout.js 等）
│   └── stylesheets/
│       └── style.css       # 非 Tailwind 的自訂樣式
└── tests/
    ├── setup.js            # 測試輔助函式（getAdminToken、registerUser）
    ├── auth.test.js
    ├── products.test.js
    ├── cart.test.js
    ├── orders.test.js
    ├── adminProducts.test.js
    └── adminOrders.test.js
```

## 啟動流程

1. `node server.js` → 載入 `dotenv`（透過 `app.js`）→ 檢查 `JWT_SECRET` 是否存在
2. `require('./app')` → 執行 `require('./src/database')` → 建立 SQLite 資料表 → seed admin + 商品
3. Express middleware 掛載順序：CORS → JSON parser → URL-encoded parser → sessionMiddleware
4. 路由掛載：API 路由 → 頁面路由 → 404 handler → errorHandler
5. `app.listen(3001)` 開始接受請求

## API 路由總覽

| 方法 | 路徑 | 檔案 | 認證 | 說明 |
|------|------|------|------|------|
| POST | /api/auth/register | authRoutes.js | 無 | 註冊 |
| POST | /api/auth/login | authRoutes.js | 無 | 登入 |
| GET | /api/auth/profile | authRoutes.js | JWT | 取得個人資料 |
| GET | /api/products | productRoutes.js | 無 | 商品列表（分頁） |
| GET | /api/products/:id | productRoutes.js | 無 | 商品詳情 |
| GET | /api/cart | cartRoutes.js | JWT 或 Session | 查看購物車 |
| POST | /api/cart | cartRoutes.js | JWT 或 Session | 加入購物車 |
| PATCH | /api/cart/:itemId | cartRoutes.js | JWT 或 Session | 修改數量 |
| DELETE | /api/cart/:itemId | cartRoutes.js | JWT 或 Session | 移除項目 |
| POST | /api/orders | orderRoutes.js | JWT | 從購物車建立訂單 |
| GET | /api/orders | orderRoutes.js | JWT | 我的訂單列表 |
| GET | /api/orders/:id | orderRoutes.js | JWT | 訂單詳情 |
| PATCH | /api/orders/:id/pay | orderRoutes.js | JWT | 模擬付款 |
| GET | /api/admin/products | adminProductRoutes.js | JWT + admin | 後台商品列表 |
| POST | /api/admin/products | adminProductRoutes.js | JWT + admin | 新增商品 |
| PUT | /api/admin/products/:id | adminProductRoutes.js | JWT + admin | 編輯商品 |
| DELETE | /api/admin/products/:id | adminProductRoutes.js | JWT + admin | 刪除商品 |
| GET | /api/admin/orders | adminOrderRoutes.js | JWT + admin | 後台訂單列表 |
| GET | /api/admin/orders/:id | adminOrderRoutes.js | JWT + admin | 後台訂單詳情 |

## 統一回應格式

所有 API 回應均遵循以下格式：

```json
// 成功
{ "data": { ... }, "error": null, "message": "成功" }

// 失敗
{ "data": null, "error": "ERROR_CODE", "message": "錯誤說明" }
```

常見 error 代碼：`VALIDATION_ERROR`、`UNAUTHORIZED`、`FORBIDDEN`、`NOT_FOUND`、`CONFLICT`、`STOCK_INSUFFICIENT`、`CART_EMPTY`、`INVALID_STATUS`

## 認證與授權機制

### 標準 JWT 認證（authMiddleware）

適用路由：`/api/auth/profile`、`/api/orders/**`、`/api/admin/**`

- 從 `Authorization: Bearer <token>` header 取出 token
- 使用 `jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })` 驗證
- 額外查詢 DB 確認 user 仍存在（防止刪除帳號後 token 仍有效）
- 驗證成功後將 `{ userId, email, role }` 存入 `req.user`

JWT payload：`{ userId, email, role }` — 演算法 HS256，有效期 7 天

### 購物車雙模式認證（dualAuth，cartRoutes.js 內）

購物車支援訪客購物，採用以下優先順序：

1. **有 `Authorization: Bearer <token>` header** → 驗證 JWT；若 token 無效立即回傳 401（不 fallback）
2. **無 Authorization header，但有 `X-Session-Id` header** → 以 sessionId 識別訪客購物車
3. **兩者皆無** → 回傳 401

購物車資料以 `user_id`（登入用戶）或 `session_id`（訪客）區分，由 `getOwnerCondition()` 動態決定 WHERE 條件。

### Admin 雙層保護

`/api/admin/**` 路由同時套用兩個 middleware：
```js
router.use(authMiddleware, adminMiddleware);
```
`adminMiddleware` 單純確認 `req.user.role === 'admin'`，否則回傳 403。

## EJS 兩段式渲染

頁面路由使用兩次 `res.render`：

```js
// 先渲染頁面 partial
res.render('pages/index', { title: '首頁' }, function(err, body) {
  // 再將 body 注入 layout
  res.render('layouts/front', { body, title: '首頁', pageScript: 'index' });
});
```

`pageScript` 變數告訴 layout 要載入哪個 `public/js/pages/*.js` 檔案。

## 資料庫 Schema

SQLite 資料庫檔案位於專案根目錄：`database.sqlite`（git-ignored）

WAL 模式（`PRAGMA journal_mode = WAL`）啟用以提升並發讀取效能。
外鍵約束（`PRAGMA foreign_keys = ON`）啟用。

### users

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| email | TEXT | UNIQUE NOT NULL | |
| password_hash | TEXT | NOT NULL | bcrypt hash（10 rounds 生產，1 round 測試） |
| name | TEXT | NOT NULL | |
| role | TEXT | NOT NULL DEFAULT 'user' CHECK IN ('user', 'admin') | |
| created_at | TEXT | NOT NULL DEFAULT datetime('now') | ISO 8601 字串 |

### products

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| name | TEXT | NOT NULL | |
| description | TEXT | | 可為 NULL |
| price | INTEGER | NOT NULL CHECK(price > 0) | 單位：元（整數） |
| stock | INTEGER | NOT NULL DEFAULT 0 CHECK(stock >= 0) | |
| image_url | TEXT | | 可為 NULL |
| created_at | TEXT | NOT NULL DEFAULT datetime('now') | |
| updated_at | TEXT | NOT NULL DEFAULT datetime('now') | PUT 時手動更新 |

### cart_items

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| session_id | TEXT | | 訪客用（與 user_id 擇一填寫） |
| user_id | TEXT | FK → users.id | 登入用戶 |
| product_id | TEXT | NOT NULL, FK → products.id | |
| quantity | INTEGER | NOT NULL DEFAULT 1 CHECK(quantity > 0) | |

### orders

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| order_no | TEXT | UNIQUE NOT NULL | 格式：`ORD-YYYYMMDD-XXXXX` |
| user_id | TEXT | NOT NULL, FK → users.id | |
| recipient_name | TEXT | NOT NULL | |
| recipient_email | TEXT | NOT NULL | |
| recipient_address | TEXT | NOT NULL | |
| total_amount | INTEGER | NOT NULL | 建立時計算，快照價格 |
| status | TEXT | NOT NULL DEFAULT 'pending' CHECK IN ('pending', 'paid', 'failed') | |
| created_at | TEXT | NOT NULL DEFAULT datetime('now') | |

### order_items

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| order_id | TEXT | NOT NULL, FK → orders.id | |
| product_id | TEXT | NOT NULL, FK → products.id | |
| product_name | TEXT | NOT NULL | **快照**，建立時複製商品名稱 |
| product_price | INTEGER | NOT NULL | **快照**，建立時複製商品價格 |
| quantity | INTEGER | NOT NULL | |

> 注意：`order_items` 儲存商品名稱與價格的快照，即使商品後來被修改或刪除，訂單記錄仍保持正確。
