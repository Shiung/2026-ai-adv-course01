# 架構說明

---

## 目錄結構

```
.
├── server.js                     # 進入點：讀取 PORT、強制檢查 JWT_SECRET（缺少則 exit(1)）、啟動 HTTP server
├── app.js                        # Express 應用組裝：全域 middleware 鏈、route 掛載、404/錯誤 handler
├── swagger-config.js             # swagger-jsdoc 設定（openapi 版本、API 標題、bearerAuth/sessionId security scheme）
├── generate-openapi.js           # CLI 工具：讀取 JSDoc 產生 openapi.json，執行 npm run openapi 觸發
├── vitest.config.js              # 測試設定：globals=true、fileParallelism=false、固定執行順序
├── .env.example                  # 環境變數範本（複製為 .env 後填入真實值）
│
├── src/
│   ├── database.js               # SQLite 連線（WAL + foreign_keys）、建表、seed 管理員帳號與 8 筆花卉商品
│   └── middleware/
│   │   ├── authMiddleware.js     # JWT 驗證：解碼後查 DB 確認用戶存在，注入 req.user = { userId, email, role }
│   │   ├── adminMiddleware.js    # 角色檢查：req.user.role !== 'admin' → 403；必須在 authMiddleware 之後掛載
│   │   ├── sessionMiddleware.js  # 讀取 X-Session-Id header → 注入 req.sessionId（訪客購物車識別用）
│   │   └── errorHandler.js      # 全域錯誤攔截：500 一律回安全訊息；非 500 且 err.isOperational=true 才用 err.message
│   └── routes/
│       ├── authRoutes.js         # /api/auth：register、login、profile（GET profile 需 authMiddleware）
│       ├── productRoutes.js      # /api/products：公開商品列表（分頁）與詳情
│       ├── cartRoutes.js         # /api/cart：dualAuth（JWT 優先 / X-Session-Id fallback）的購物車 CRUD
│       ├── orderRoutes.js        # /api/orders：整個 router 掛 authMiddleware；建立訂單、查詢、模擬付款
│       ├── adminProductRoutes.js # /api/admin/products：整個 router 掛 authMiddleware + adminMiddleware
│       ├── adminOrderRoutes.js   # /api/admin/orders：整個 router 掛 authMiddleware + adminMiddleware
│       └── pageRoutes.js         # 頁面路由：EJS render 前台（front layout）/ 後台（admin layout）
│
├── views/
│   ├── layouts/
│   │   ├── front.ejs             # 前台 layout：組合 head、header、body、footer、pageScript 載入
│   │   └── admin.ejs             # 後台 layout：組合 admin-header、admin-sidebar、body、pageScript 載入
│   ├── partials/
│   │   ├── head.ejs              # <head> 標籤、CSS 引用（output.css + style.css）
│   │   ├── header.ejs            # 前台導覽列（購物車圖示、登入/登出狀態，由 header-init.js 更新）
│   │   ├── footer.ejs            # 前台頁尾
│   │   ├── admin-header.ejs      # 後台頂部導覽列
│   │   ├── admin-sidebar.ejs     # 後台左側邊欄（currentPath 決定 active 項目）
│   │   └── notification.ejs      # Toast 通知容器（notification.js 操作）
│   └── pages/
│       ├── index.ejs             # 商品列表首頁
│       ├── product-detail.ejs    # 商品詳情（productId 從 pageRoutes 注入）
│       ├── cart.ejs              # 購物車
│       ├── checkout.ejs          # 結帳（填寫收件人姓名/Email/地址）
│       ├── login.ejs             # 登入
│       ├── orders.ejs            # 我的訂單列表
│       ├── order-detail.ejs      # 訂單詳情（orderId、paymentResult 從 pageRoutes 注入）
│       ├── 404.ejs               # 404 頁面
│       └── admin/
│           ├── products.ejs      # 後台商品管理
│           └── orders.ejs        # 後台訂單管理
│
├── public/
│   ├── css/
│   │   ├── input.css             # TailwindCSS 來源（@import "tailwindcss"）
│   │   └── output.css            # 編譯產出（git 通常忽略，deploy 前需建置）
│   ├── stylesheets/
│   │   └── style.css             # 少量自訂樣式
│   └── js/
│       ├── api.js                # fetch 封裝：自動帶入 Authorization Bearer 或 X-Session-Id header
│       ├── auth.js               # localStorage token 存取（getToken / setToken / removeToken）、登出、讀取 user 資訊
│       ├── header-init.js        # DOMContentLoaded 後更新 header 登入狀態、購物車數量
│       ├── notification.js       # Toast 顯示邏輯（success / error / info）
│       └── pages/                # 各頁面專屬邏輯（與 pageRoutes 傳入的 pageScript 名稱對應）
│           ├── index.js          # 商品列表載入、分頁切換
│           ├── product-detail.js # 商品詳情載入、加入購物車
│           ├── cart.js           # 購物車顯示、更新數量、刪除項目
│           ├── checkout.js       # 結帳表單提交、導頁至訂單詳情
│           ├── login.js          # 登入表單提交、token 儲存、導頁
│           ├── orders.js         # 我的訂單列表載入
│           ├── order-detail.js   # 訂單詳情載入、模擬付款按鈕
│           ├── admin-products.js # 後台商品 CRUD 互動
│           └── admin-orders.js   # 後台訂單列表、篩選、詳情查看
│
└── tests/
    ├── setup.js                  # 共用 helper：getAdminToken()、registerUser()
    ├── auth.test.js
    ├── products.test.js
    ├── cart.test.js
    ├── orders.test.js
    ├── adminProducts.test.js
    └── adminOrders.test.js
```

---

## 啟動流程

```
node server.js
  │
  ├── 1. require('./app')
  │     ├── dotenv.config()                        # 載入 .env
  │     ├── require('./src/database')
  │     │     ├── 建立 SQLite 連線（WAL + foreign_keys）
  │     │     ├── CREATE TABLE IF NOT EXISTS（users / products / cart_items / orders / order_items）
  │     │     ├── seedAdminUser()                  # 若不存在則 INSERT admin 帳號（bcrypt 10 rounds）
  │     │     └── seedProducts()                   # 若 products 表為空則 INSERT 8 筆花卉商品（transaction）
  │     ├── app.set('view engine', 'ejs')
  │     ├── app.use(express.static('public'))
  │     ├── app.use(cors(...))
  │     ├── app.use(express.json())
  │     ├── app.use(express.urlencoded())
  │     ├── app.use(sessionMiddleware)              # X-Session-Id → req.sessionId
  │     ├── 掛載 6 個 API route groups
  │     ├── 掛載 pageRoutes（前台 + 後台）
  │     ├── 掛載 404 handler（API → JSON，頁面 → 404.ejs）
  │     └── 掛載 errorHandler
  │
  ├── 2. 檢查 JWT_SECRET 是否設定
  │     └── 未設定 → console.error + process.exit(1)
  │
  └── 3. app.listen(PORT || 3001)
```

資料庫檔案位於 `src/database.sqlite`（首次啟動時自動建立）。

---

## API 路由總覽

### 前台 REST API

| 方法 | 路徑 | 認證 | 路由檔案 | 說明 |
|---|---|---|---|---|
| POST | `/api/auth/register` | 無 | authRoutes.js | 註冊（email / password / name） |
| POST | `/api/auth/login` | 無 | authRoutes.js | 登入，回傳 JWT token |
| GET | `/api/auth/profile` | JWT | authRoutes.js | 取得當前用戶資料 |
| GET | `/api/products` | 無 | productRoutes.js | 商品列表（?page=1&limit=10） |
| GET | `/api/products/:id` | 無 | productRoutes.js | 單一商品詳情 |
| GET | `/api/cart` | JWT 或 Session | cartRoutes.js | 查看購物車（含商品資訊與總金額） |
| POST | `/api/cart` | JWT 或 Session | cartRoutes.js | 加入購物車（同商品自動累加） |
| PATCH | `/api/cart/:itemId` | JWT 或 Session | cartRoutes.js | 修改購物車項目數量 |
| DELETE | `/api/cart/:itemId` | JWT 或 Session | cartRoutes.js | 移除購物車項目 |
| POST | `/api/orders` | JWT | orderRoutes.js | 從購物車建立訂單（transaction） |
| GET | `/api/orders` | JWT | orderRoutes.js | 取得我的訂單列表 |
| GET | `/api/orders/:id` | JWT | orderRoutes.js | 訂單詳情（限本人） |
| PATCH | `/api/orders/:id/pay` | JWT | orderRoutes.js | 模擬付款（success / fail） |

### 後台 REST API（admin only）

| 方法 | 路徑 | 認證 | 路由檔案 | 說明 |
|---|---|---|---|---|
| GET | `/api/admin/products` | JWT + admin | adminProductRoutes.js | 商品列表（?page&limit） |
| POST | `/api/admin/products` | JWT + admin | adminProductRoutes.js | 新增商品 |
| PUT | `/api/admin/products/:id` | JWT + admin | adminProductRoutes.js | 編輯商品（partial update） |
| DELETE | `/api/admin/products/:id` | JWT + admin | adminProductRoutes.js | 刪除商品（pending 訂單保護） |
| GET | `/api/admin/orders` | JWT + admin | adminOrderRoutes.js | 全站訂單列表（?page&limit&status） |
| GET | `/api/admin/orders/:id` | JWT + admin | adminOrderRoutes.js | 訂單詳情（含用戶資訊） |

### 頁面路由（SSR）

| 方法 | 路徑 | Layout | pageScript | 備注 |
|---|---|---|---|---|
| GET | `/` | front | `index` | |
| GET | `/products/:id` | front | `product-detail` | productId 透過 locals 傳入模板 |
| GET | `/cart` | front | `cart` | |
| GET | `/checkout` | front | `checkout` | |
| GET | `/login` | front | `login` | |
| GET | `/orders` | front | `orders` | |
| GET | `/orders/:id` | front | `order-detail` | orderId / paymentResult(?payment=) 透過 locals 傳入 |
| GET | `/admin/products` | admin | `admin-products` | currentPath='/admin/products' |
| GET | `/admin/orders` | admin | `admin-orders` | currentPath='/admin/orders' |

`pageScript` 值會注入到 layout 模板中，對應 `public/js/pages/<pageScript>.js`，由瀏覽器載入執行。

---

## 統一回應格式

所有 API 端點（含錯誤情境）均回傳相同 JSON 結構：

```json
{
  "data": { ... },   // 成功時為資料物件或 null；失敗時固定為 null
  "error": null,     // 成功時為 null；失敗時為錯誤代碼字串
  "message": "成功"  // 人類可讀的結果說明（繁體中文）
}
```

**常見錯誤代碼**：

| 代碼 | HTTP Status | 觸發情境 |
|---|---|---|
| `VALIDATION_ERROR` | 400 | 欄位缺失、格式錯誤（Email 格式、password 長度 < 6、quantity 非正整數等） |
| `UNAUTHORIZED` | 401 | 未提供 token、token 無效或過期、用戶不存在 |
| `FORBIDDEN` | 403 | 已認證但角色非 admin |
| `NOT_FOUND` | 404 | 商品、訂單、購物車項目不存在 |
| `CONFLICT` | 409 | Email 已被註冊；商品存在 pending 訂單無法刪除 |
| `CART_EMPTY` | 400 | 建立訂單時購物車為空 |
| `STOCK_INSUFFICIENT` | 400 | 加入購物車或建立訂單時庫存不足 |
| `INVALID_STATUS` | 400 | 訂單狀態非 pending，不可執行付款 |
| `INTERNAL_ERROR` | 500 | 未預期的伺服器錯誤（不洩漏細節） |

---

## 認證與授權機制

### JWT 認證（authMiddleware.js）

**完整流程**：
1. 讀取 `Authorization: Bearer <token>` header
2. 若 header 缺失或格式錯誤 → 401 UNAUTHORIZED
3. `jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })` 驗證簽名與有效期
4. 用 `decoded.userId` 查詢 `users` 表，確認帳號仍存在（防止帳號刪除後舊 token 繼續有效）
5. 注入 `req.user = { userId, email, role }`

**JWT 設定**：
- 演算法：HS256
- Payload 欄位：`userId`、`email`、`role`
- 有效期：7 天（`expiresIn: '7d'`）
- 密鑰：`process.env.JWT_SECRET`（啟動時強制檢查非空）

### Admin 授權（adminMiddleware.js）

- 必須在 `authMiddleware` **之後**掛載（依賴 `req.user` 已存在）
- 檢查 `req.user.role === 'admin'`，否則回 403 FORBIDDEN
- 使用方式：`router.use(authMiddleware, adminMiddleware)`

### 購物車雙模式認證（dualAuth — 僅 cartRoutes.js）

購物車同時服務訪客與登入用戶：

```
請求進來
  │
  ├── 有 Authorization: Bearer 標頭？
  │     ├── JWT 有效 → req.user = {...} → next()（會員模式）
  │     └── JWT 無效/過期 → 直接 401（不 fallback，避免安全漏洞）
  │
  └── 無 Authorization 標頭
        ├── 有 req.sessionId（X-Session-Id header）→ next()（訪客模式）
        └── 兩者皆無 → 401
```

**購物車資料所有權判斷**（`getOwnerCondition` 函式）：
- 會員模式：`WHERE user_id = req.user.userId`
- 訪客模式：`WHERE session_id = req.sessionId`

**設計意圖**：若帶了 Authorization header 但 token 無效，不允許自動降級到 session 模式，以防過期 token 被用來繞過會員驗證、改以 session 混入他人購物車。

---

## 資料庫 Schema

資料庫路徑：`src/database.sqlite`，啟動時自動建立。  
SQLite Pragma：`journal_mode = WAL`、`foreign_keys = ON`

### users

| 欄位 | 型別 | 約束 | 說明 |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | UUID v4 |
| email | TEXT | UNIQUE NOT NULL | 登入帳號 |
| password_hash | TEXT | NOT NULL | bcrypt 雜湊（正式 10 rounds，測試 1 round） |
| name | TEXT | NOT NULL | 顯示名稱 |
| role | TEXT | NOT NULL, DEFAULT 'user', CHECK IN ('user','admin') | 角色 |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | 建立時間（ISO 8601 格式字串） |

### products

| 欄位 | 型別 | 約束 | 說明 |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | UUID v4 |
| name | TEXT | NOT NULL | 商品名稱 |
| description | TEXT | — | 商品描述（nullable） |
| price | INTEGER | NOT NULL, CHECK > 0 | 售價（新台幣，整數，不儲存小數） |
| stock | INTEGER | NOT NULL, DEFAULT 0, CHECK >= 0 | 庫存數量 |
| image_url | TEXT | — | 圖片 URL（nullable） |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | 建立時間 |
| updated_at | TEXT | NOT NULL, DEFAULT datetime('now') | 最後更新時間（PUT 時明確設為 datetime('now')） |

### cart_items

| 欄位 | 型別 | 約束 | 說明 |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | UUID v4 |
| session_id | TEXT | — | 訪客 session ID（nullable） |
| user_id | TEXT | FK → users.id | 登入用戶 ID（nullable） |
| product_id | TEXT | NOT NULL, FK → products.id | 商品 ID |
| quantity | INTEGER | NOT NULL, DEFAULT 1, CHECK > 0 | 購買數量 |

`session_id` 與 `user_id` 擇一非 null，由業務層保證（DB 層未設 CHECK CONSTRAINT）。

### orders

| 欄位 | 型別 | 約束 | 說明 |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | UUID v4 |
| order_no | TEXT | UNIQUE NOT NULL | 訂單編號，格式 `ORD-YYYYMMDD-XXXXX`（5 碼大寫 UUID 片段） |
| user_id | TEXT | NOT NULL, FK → users.id | 下單用戶 |
| recipient_name | TEXT | NOT NULL | 收件人姓名 |
| recipient_email | TEXT | NOT NULL | 收件人 Email |
| recipient_address | TEXT | NOT NULL | 收件地址 |
| total_amount | INTEGER | NOT NULL | 訂單總金額（建單時快照，不受後續商品價格變更影響） |
| status | TEXT | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','paid','failed') | 訂單狀態 |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | 建立時間 |

### order_items

| 欄位 | 型別 | 約束 | 說明 |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | UUID v4 |
| order_id | TEXT | NOT NULL, FK → orders.id | 所屬訂單 |
| product_id | TEXT | NOT NULL | 商品 ID（**無** FK，允許商品被刪除後訂單歷史仍完整） |
| product_name | TEXT | NOT NULL | 下單時商品名稱快照 |
| product_price | INTEGER | NOT NULL | 下單時商品單價快照 |
| quantity | INTEGER | NOT NULL | 購買數量 |

---

## 訂單建立 Transaction 流程

```
POST /api/orders
  │
  ├── 驗證 recipientName / recipientEmail / recipientAddress 必填
  ├── 驗證 recipientEmail 格式
  ├── 查詢 user_id = req.user.userId 的購物車（JOIN products 取得最新庫存與價格）
  ├── 購物車為空 → 400 CART_EMPTY
  ├── 任一商品 quantity > stock → 400 STOCK_INSUFFICIENT（列出所有超量商品名稱）
  ├── 計算 totalAmount = sum(price * quantity)
  ├── 產生 orderId（uuidv4）、orderNo（ORD-YYYYMMDD-XXXXX）
  │
  └── db.transaction()
        ├── INSERT INTO orders（含快照 totalAmount）
        ├── for each item: INSERT INTO order_items（快照商品名稱與價格）
        ├── for each item: UPDATE products SET stock = stock - quantity
        └── DELETE FROM cart_items WHERE user_id = userId（清空該用戶購物車）
```

**關鍵設計**：`order_items.product_id` 不設外鍵，因此管理員事後刪除商品不影響訂單歷史資料完整性；`product_name` 與 `product_price` 為快照欄位，避免商品資訊變更影響歷史訂單顯示。
