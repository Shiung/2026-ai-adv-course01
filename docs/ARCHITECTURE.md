# ARCHITECTURE.md

## 目錄結構

```
.
├── app.js                        # Express app 設定（middleware + 路由掛載）
├── server.js                     # HTTP 啟動入口（檢查 JWT_SECRET，listen）
├── generate-openapi.js           # 產生 OpenAPI JSON 的腳本
├── swagger-config.js             # swagger-jsdoc 選項設定
├── vitest.config.js              # Vitest 測試設定
├── public/
│   ├── css/input.css             # Tailwind 來源，輸出至 output.css
│   └── js/
│       ├── api.js                # 所有頁面共用的 fetch wrapper
│       ├── auth.js               # 登入/登出狀態管理
│       ├── header-init.js        # header 動態初始化
│       ├── notification.js       # Toast 通知元件
│       └── pages/               # 各頁面專屬 JS（index、cart、checkout…）
├── src/
│   ├── database.js               # DB 初始化（建表 + seed）+ 匯出 db 實例
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT Bearer token 驗證
│   │   ├── adminMiddleware.js    # role=admin 檢查（需先過 authMiddleware）
│   │   ├── sessionMiddleware.js  # 從 X-Session-Id header 注入 req.sessionId
│   │   └── errorHandler.js      # Express 全域錯誤處理
│   └── routes/
│       ├── authRoutes.js         # /api/auth — 註冊、登入、個人資料
│       ├── productRoutes.js      # /api/products — 前台商品列表 / 詳情（公開）
│       ├── cartRoutes.js         # /api/cart — 購物車（dualAuth）
│       ├── orderRoutes.js        # /api/orders — 訂單建立 / 列表 / 詳情 / 付款
│       ├── adminProductRoutes.js # /api/admin/products — 後台商品 CRUD
│       ├── adminOrderRoutes.js   # /api/admin/orders — 後台訂單列表 / 詳情
│       └── pageRoutes.js         # 所有 EJS 頁面路由（SSR）
├── tests/
│   ├── setup.js                  # 共用輔助：getAdminToken()、registerUser()
│   ├── auth.test.js
│   ├── products.test.js
│   ├── cart.test.js
│   ├── orders.test.js
│   ├── adminProducts.test.js
│   └── adminOrders.test.js
└── views/
    ├── layouts/
    │   ├── front.ejs             # 前台 layout（含 header、footer）
    │   └── admin.ejs             # 後台 layout（含 sidebar）
    ├── pages/                    # 各頁面 EJS（傳入 layout 包裹）
    └── partials/                 # 共用片段（head、header、footer…）
```

## 啟動流程

```
server.js
  ├─ 確認 JWT_SECRET（缺少則 exit(1)）
  └─ require('./app')
        ├─ require('./src/database')   ← 自動建表 + seed admin + seed products
        ├─ 掛載 global middleware
        └─ 掛載 API / Page 路由
```

`database.js` 在 `require` 時立即呼叫 `initializeDatabase()`，使用 `CREATE TABLE IF NOT EXISTS`，冪等安全。

## API 路由總覽

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| POST | /api/auth/register | 公開 | 註冊（回傳 JWT） |
| POST | /api/auth/login | 公開 | 登入（回傳 JWT） |
| GET  | /api/auth/profile | JWT | 取得個人資料 |
| GET  | /api/products | 公開 | 商品列表（分頁） |
| GET  | /api/products/:id | 公開 | 商品詳情 |
| GET  | /api/cart | dualAuth | 查看購物車 |
| POST | /api/cart | dualAuth | 加入購物車 |
| PATCH | /api/cart/:itemId | dualAuth | 修改數量 |
| DELETE | /api/cart/:itemId | dualAuth | 移除品項 |
| POST | /api/orders | JWT | 從購物車建立訂單 |
| GET  | /api/orders | JWT | 自己的訂單列表 |
| GET  | /api/orders/:id | JWT | 訂單詳情 |
| PATCH | /api/orders/:id/pay | JWT | 模擬付款（success/fail） |
| GET  | /api/admin/products | JWT + admin | 後台商品列表 |
| POST | /api/admin/products | JWT + admin | 新增商品 |
| PUT  | /api/admin/products/:id | JWT + admin | 更新商品 |
| DELETE | /api/admin/products/:id | JWT + admin | 刪除商品 |
| GET  | /api/admin/orders | JWT + admin | 後台訂單列表（可篩 status） |
| GET  | /api/admin/orders/:id | JWT + admin | 後台訂單詳情（含 user 資訊） |

## 統一回應格式

所有 API 一律回傳此結構：

```json
{
  "data": { ... } | null,
  "error": "ERROR_CODE" | null,
  "message": "說明文字"
}
```

成功時 `error` 為 `null`；失敗時 `data` 為 `null`，`error` 為大寫錯誤碼。

## 認證機制

### JWT（authMiddleware）
- Header：`Authorization: Bearer <token>`
- 驗證流程：解碼 → 確認 user 存在於 DB → 注入 `req.user = { userId, email, role }`
- 演算法：HS256；有效期：7 天
- JWT payload：`{ userId, email, role }`

### 雙模式認證（dualAuth，僅購物車）
購物車路由使用自訂 `dualAuth`，支援訪客與登入用戶：

1. 若有 `Authorization: Bearer <token>`：驗證 JWT，失敗直接回 401（不繼續）
2. 若無 Authorization，但有 `X-Session-Id` header：以 session ID 識別訪客
3. 兩者皆無：回 401

cart_items 用 `user_id`（登入）或 `session_id`（訪客）其中一個欄位標識擁有者。

### admin 檢查（adminMiddleware）
必須在 authMiddleware 之後使用，確認 `req.user.role === 'admin'`，否則 403 FORBIDDEN。

## 資料庫 Schema

```sql
users
  id           TEXT PRIMARY KEY      -- UUID v4
  email        TEXT UNIQUE NOT NULL
  password_hash TEXT NOT NULL        -- bcrypt hash
  name         TEXT NOT NULL
  role         TEXT DEFAULT 'user'   -- CHECK IN ('user', 'admin')
  created_at   TEXT DEFAULT datetime('now')

products
  id           TEXT PRIMARY KEY
  name         TEXT NOT NULL
  description  TEXT
  price        INTEGER NOT NULL      -- CHECK price > 0（台幣整數）
  stock        INTEGER DEFAULT 0     -- CHECK stock >= 0
  image_url    TEXT
  created_at   TEXT
  updated_at   TEXT

cart_items
  id           TEXT PRIMARY KEY
  session_id   TEXT                  -- 訪客模式用
  user_id      TEXT                  -- 登入模式用，FK → users.id
  product_id   TEXT NOT NULL         -- FK → products.id
  quantity     INTEGER DEFAULT 1     -- CHECK quantity > 0

orders
  id           TEXT PRIMARY KEY
  order_no     TEXT UNIQUE NOT NULL  -- 格式：ORD-YYYYMMDD-XXXXX
  user_id      TEXT NOT NULL         -- FK → users.id
  recipient_name    TEXT NOT NULL
  recipient_email   TEXT NOT NULL
  recipient_address TEXT NOT NULL
  total_amount INTEGER NOT NULL      -- 台幣整數
  status       TEXT DEFAULT 'pending' -- CHECK IN ('pending', 'paid', 'failed')
  created_at   TEXT

order_items
  id           TEXT PRIMARY KEY
  order_id     TEXT NOT NULL         -- FK → orders.id
  product_id   TEXT NOT NULL
  product_name TEXT NOT NULL         -- 快照（避免商品改名影響歷史訂單）
  product_price INTEGER NOT NULL     -- 快照（避免改價影響歷史訂單）
  quantity     INTEGER NOT NULL
```

## 錯誤處理

`errorHandler.js` 的回應規則：
- 500：一律回傳「伺服器內部錯誤」（隱藏內部細節）
- 其他狀態碼 + `err.isOperational = true`：顯示 `err.message`
- 其他狀態碼：使用 `SAFE_MESSAGES` 對照表中的通用文字
