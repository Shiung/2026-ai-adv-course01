# ARCHITECTURE.md

## 應用架構概述

本專案是 MPA（Multi-Page Application）架構：Express 同時提供 SSR 頁面（EJS）與 REST API。前台頁面在瀏覽器渲染後，再以 JavaScript `fetch` 呼叫 API 取得資料；後台管理頁面亦同。

```
Client Browser
  ├── GET /page → Express (EJS render) → HTML
  └── fetch /api/... → Express Router → SQLite → JSON { data, error, message }
```

## 目錄結構

```
.
├── app.js                    # Express 應用初始化、middleware 掛載、路由組裝
├── server.js                 # 進程入口：啟動監聽、JWT_SECRET 檢查
├── swagger-config.js         # swagger-jsdoc 設定（OpenAPI 3.0.3）
├── generate-openapi.js       # 產生 openapi.json 的腳本
├── vitest.config.js          # Vitest 測試設定（測試順序、全域 globals）
├── database.sqlite           # SQLite 資料庫檔案（自動產生）
├── .env                      # 本地環境變數（不進 git）
├── .env.example              # 環境變數範本
│
├── src/
│   ├── database.js           # DB 初始化：建表、seed admin、seed products；匯出 db 實例
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT Bearer 驗證；將 { userId, email, role } 寫入 req.user
│   │   ├── adminMiddleware.js   # 角色檢查：req.user.role 必須為 'admin'
│   │   ├── sessionMiddleware.js # 讀取 X-Session-Id header，寫入 req.sessionId
│   │   └── errorHandler.js     # Express 錯誤處理（5xx 不洩漏內部訊息）
│   ├── services/
│   │   └── ecpayService.js      # 綠界金流：CheckMacValue（SHA256）、AIO 參數組裝、QueryTradeInfo
│   └── routes/
│       ├── authRoutes.js        # POST /register, POST /login, GET /profile
│       ├── productRoutes.js     # GET /api/products, GET /api/products/:id（公開）
│       ├── cartRoutes.js        # GET|POST|PATCH|DELETE /api/cart（雙模式認證）
│       ├── orderRoutes.js       # POST|GET /api/orders, GET|PATCH /api/orders/:id（JWT）
│       ├── ecpayRoutes.js       # POST /api/ecpay/checkout|return|notify（綠界金流）
│       ├── adminProductRoutes.js # GET|POST /api/admin/products, PUT|DELETE /:id（admin）
│       ├── adminOrderRoutes.js   # GET /api/admin/orders, GET /:id（admin）
│       └── pageRoutes.js        # 所有頁面路由（/, /products/:id, /cart, /admin/...）
│
├── views/
│   ├── layouts/
│   │   ├── front.ejs         # 前台 layout（head, header, footer, notification）
│   │   └── admin.ejs         # 後台 layout（admin-header, admin-sidebar）
│   ├── pages/                # 各頁面 body 片段（由 layout 包覆）
│   │   ├── index.ejs         # 首頁商品列表
│   │   ├── product-detail.ejs
│   │   ├── cart.ejs
│   │   ├── checkout.ejs
│   │   ├── login.ejs
│   │   ├── orders.ejs
│   │   ├── order-detail.ejs
│   │   └── 404.ejs
│   └── partials/             # 可複用的 EJS 片段
│       ├── head.ejs          # <head> 標籤
│       ├── header.ejs        # 前台 navbar
│       ├── footer.ejs
│       ├── notification.ejs  # Toast 通知元件
│       ├── admin-header.ejs
│       └── admin-sidebar.ejs
│
├── public/
│   ├── css/
│   │   ├── input.css         # Tailwind 來源（@import "tailwindcss"）
│   │   └── output.css        # 建置後的 CSS（由 CLI 產生，不手動編輯）
│   ├── js/
│   │   ├── auth.js           # 客戶端 Auth 物件（localStorage token/session 管理）
│   │   ├── api.js            # apiFetch() wrapper（統一處理 401 跳轉）
│   │   ├── header-init.js    # 初始化 header 狀態（登入/未登入 UI）
│   │   └── notification.js   # Toast 通知顯示邏輯
│   └── stylesheets/
│       └── style.css         # 自定義 CSS（非 Tailwind 部分）
│
└── tests/
    ├── setup.js              # 測試輔助：getAdminToken(), registerUser()
    ├── auth.test.js
    ├── products.test.js
    ├── cart.test.js
    ├── orders.test.js
    ├── adminProducts.test.js
    └── adminOrders.test.js
```

## 啟動流程

```
node server.js
  │
  ├── 檢查 JWT_SECRET（未設定則 process.exit(1)）
  └── require('./app')
        ├── dotenv.config()
        ├── require('./src/database')   ← 建立 SQLite 表、seed 資料
        ├── 掛載 middleware（cors, json, urlencoded, sessionMiddleware）
        ├── 掛載 API 路由（/api/auth, /api/products, /api/cart, /api/orders, /api/ecpay, /api/admin/...）
        ├── 掛載 Page 路由（/）
        ├── 404 handler（API → JSON；頁面 → 404.ejs）
        └── errorHandler（Express 錯誤 middleware，4 個參數）
```

## API 路由總覽

| 前綴 | 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|------|
| `/api/auth` | POST | `/register` | 無 | 註冊，回傳 JWT |
| `/api/auth` | POST | `/login` | 無 | 登入，回傳 JWT |
| `/api/auth` | GET | `/profile` | JWT | 取得個人資料 |
| `/api/products` | GET | `/` | 無 | 商品列表（分頁） |
| `/api/products` | GET | `/:id` | 無 | 商品詳情 |
| `/api/cart` | GET | `/` | JWT \| Session | 查看購物車 |
| `/api/cart` | POST | `/` | JWT \| Session | 加入購物車 |
| `/api/cart` | PATCH | `/:itemId` | JWT \| Session | 修改數量 |
| `/api/cart` | DELETE | `/:itemId` | JWT \| Session | 移除品項 |
| `/api/orders` | POST | `/` | JWT | 從購物車建立訂單 |
| `/api/orders` | GET | `/` | JWT | 我的訂單列表 |
| `/api/orders` | GET | `/:id` | JWT | 訂單詳情 |
| `/api/orders` | PATCH | `/:id/pay` | JWT | 模擬付款（測試用） |
| `/api/orders` | POST | `/:id/verify-payment` | JWT | 主動查詢綠界付款狀態 |
| `/api/ecpay` | POST | `/checkout` | JWT | 產生 AIO 付款表單參數 |
| `/api/ecpay` | POST | `/return` | 無 | OrderResultURL：接收付款結果、更新訂單 |
| `/api/ecpay` | POST | `/notify` | 無 | ReturnURL（S2S）：回 1\|OK |
| `/api/admin/products` | GET | `/` | JWT + admin | 後台商品列表（分頁） |
| `/api/admin/products` | POST | `/` | JWT + admin | 新增商品 |
| `/api/admin/products` | PUT | `/:id` | JWT + admin | 更新商品 |
| `/api/admin/products` | DELETE | `/:id` | JWT + admin | 刪除商品 |
| `/api/admin/orders` | GET | `/` | JWT + admin | 後台訂單列表（分頁 + 篩選） |
| `/api/admin/orders` | GET | `/:id` | JWT + admin | 後台訂單詳情（含 user 資訊） |

## 統一回應格式

所有 API 回應皆遵循以下結構：

```json
// 成功
{
  "data": { ... },
  "error": null,
  "message": "成功"
}

// 失敗
{
  "data": null,
  "error": "VALIDATION_ERROR",
  "message": "email、password、name 為必填欄位"
}
```

**常見 error code：**

| error | HTTP | 說明 |
|-------|------|------|
| `VALIDATION_ERROR` | 400 | 欄位缺失或格式錯誤 |
| `UNAUTHORIZED` | 401 | 未登入、Token 無效 |
| `FORBIDDEN` | 403 | 角色不足（非 admin） |
| `NOT_FOUND` | 404 | 資源不存在 |
| `CONFLICT` | 409 | Email 重複、商品有未完成訂單 |
| `STOCK_INSUFFICIENT` | 400 | 庫存不足 |
| `CART_EMPTY` | 400 | 購物車為空 |
| `INVALID_STATUS` | 400 | 訂單狀態不是 pending |
| `INTERNAL_ERROR` | 500 | 伺服器內部錯誤 |

## 認證與授權機制

### JWT 認證（authMiddleware）

- **讀取**：`Authorization: Bearer <token>` header
- **驗證**：`jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })`
- **資料庫確認**：驗證 token 後再查詢 users 表，確認使用者存在
- **寫入**：通過後將 `{ userId, email, role }` 寫入 `req.user`
- **JWT payload**：`{ userId, email, role }`，簽發演算法 HS256，有效期 7 天

### Admin 角色檢查（adminMiddleware）

- 必須在 authMiddleware 之後掛載
- 檢查 `req.user.role === 'admin'`，否則回傳 403

### 購物車雙模式認證（dualAuth，僅 cartRoutes）

```
有 Authorization header？
  ├── Yes → jwt.verify()
  │     ├── 成功 → req.user = { userId, email, role }，進入 next()
  │     └── 失敗（含 token 無效）→ 401（不退回 session 模式）
  └── No → 有 req.sessionId？
        ├── Yes → 以 session_id 存取，進入 next()
        └── No → 401
```

**重要**：若同時傳 Authorization header（即使 token 無效），不會退回 session 模式，直接回 401。

### 客戶端認證（public/js/auth.js）

- JWT token 存於 `localStorage.flower_token`
- User 資料存於 `localStorage.flower_user`（JSON）
- Session ID 存於 `localStorage.flower_session_id`（首次自動以 `crypto.randomUUID()` 產生）
- `getAuthHeaders()` 同時送出 Authorization Bearer 與 X-Session-Id，讓伺服器優先使用 JWT

## 資料庫 Schema

### users

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| email | TEXT | UNIQUE NOT NULL | 登入帳號 |
| password_hash | TEXT | NOT NULL | bcrypt 雜湊（rounds: 10，測試環境 1） |
| name | TEXT | NOT NULL | 顯示名稱 |
| role | TEXT | NOT NULL, DEFAULT 'user', CHECK IN ('user','admin') | 角色 |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | ISO8601 字串 |

### products

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| name | TEXT | NOT NULL | 商品名稱 |
| description | TEXT | — | 商品描述 |
| price | INTEGER | NOT NULL, CHECK > 0 | 單價（新台幣） |
| stock | INTEGER | NOT NULL, DEFAULT 0, CHECK >= 0 | 庫存數量 |
| image_url | TEXT | — | 商品圖片 URL |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | — |
| updated_at | TEXT | NOT NULL, DEFAULT datetime('now') | PUT 時更新 |

### cart_items

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| session_id | TEXT | — | Guest 模式：X-Session-Id |
| user_id | TEXT | FK → users.id | 登入模式 |
| product_id | TEXT | NOT NULL, FK → products.id | — |
| quantity | INTEGER | NOT NULL, DEFAULT 1, CHECK > 0 | — |

> `session_id` 與 `user_id` 互斥，依認證模式擇一填入。

### orders

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| order_no | TEXT | UNIQUE NOT NULL | 格式：`ORD-YYYYMMDD-XXXXX` |
| user_id | TEXT | NOT NULL, FK → users.id | — |
| recipient_name | TEXT | NOT NULL | 收件人 |
| recipient_email | TEXT | NOT NULL | — |
| recipient_address | TEXT | NOT NULL | — |
| total_amount | INTEGER | NOT NULL | 建立時計算，不隨商品價格異動 |
| status | TEXT | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','paid','failed') | — |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | — |

### order_items

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| order_id | TEXT | NOT NULL, FK → orders.id | — |
| product_id | TEXT | NOT NULL, FK — | 僅作參考，無 FK 約束（允許商品被刪） |
| product_name | TEXT | NOT NULL | 建立時快照，不受商品改名影響 |
| product_price | INTEGER | NOT NULL | 建立時快照 |
| quantity | INTEGER | NOT NULL | — |

> `order_items.product_name` 與 `order_items.product_price` 是下單時的快照，即使後來商品更新或刪除，訂單歷史仍正確。

## 資料流：建立訂單

```
POST /api/orders
  │
  ├── authMiddleware（JWT 驗證）
  ├── 驗證 recipientName / recipientEmail / recipientAddress
  ├── 查詢 cart_items JOIN products（WHERE user_id = ?）
  ├── 購物車為空 → 400 CART_EMPTY
  ├── 庫存不足檢查 → 400 STOCK_INSUFFICIENT
  ├── 計算 total_amount
  └── db.transaction()
        ├── INSERT orders
        ├── INSERT order_items × N（快照 product_name, product_price）
        ├── UPDATE products SET stock = stock - quantity × N
        └── DELETE cart_items WHERE user_id = ?
```

## SQLite 設定

- `PRAGMA journal_mode = WAL`：WAL 模式允許讀寫並發，適合多連線場景
- `PRAGMA foreign_keys = ON`：啟用外鍵約束
- 資料庫檔案位置：根目錄 `database.sqlite`（由 `src/database.js` 的相對路徑決定）
