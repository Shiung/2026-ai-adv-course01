# CHANGELOG.md

## [1.1.0] - 2026-05-19

### Added

- **綠界 ECPay 金流串接（AIO）**：新增 `src/services/ecpayService.js`，實作 CheckMacValue（SHA256）計算與 timing-safe 驗證、AIO 表單參數組裝（含台灣時區 MerchantTradeDate）、`QueryTradeInfo/V5` 主動查詢。
- **`POST /api/ecpay/checkout`**（JWT 必要）：驗證訂單並回傳 AIO 表單欄位（含 CheckMacValue），前端動態建立 form 提交至綠界付款頁。
- **`POST /api/ecpay/return`**（OrderResultURL，無 auth）：接收使用者瀏覽器回傳的付款結果；驗 CheckMacValue → 呼叫 QueryTradeInfo 二次確認 → 更新訂單 status → redirect 至訂單詳情頁。適用於本機無法接收 S2S ReturnURL 的情境。
- **`POST /api/ecpay/notify`**（ReturnURL，無 auth）：回傳純文字 `1|OK`，防止綠界重試。
- **`POST /api/orders/:id/verify-payment`**（JWT 必要）：備援端點，當 OrderResultURL 未觸達時可手動向綠界 QueryTradeInfo 查詢並同步訂單狀態。
- 訂單詳情頁（`order-detail.ejs` / `order-detail.js`）新增「前往綠界付款」與「查詢付款狀態」按鈕，取代原模擬付款按鈕。

### Changed

- `src/routes/orderRoutes.js` 新增 `verify-payment` 路由（引入 `ecpayService`）。
- `app.js` 新增 `/api/ecpay` 路由掛載。
- `PATCH /api/orders/:id/pay`（模擬付款）保留，僅於前端移除入口，測試環境繼續可用。

---

## [1.0.0] - 2026-05-19

### 初始版本

- Express 4 + EJS SSR 架構建立
- SQLite 資料庫（better-sqlite3，WAL 模式）初始化，含 5 張資料表：`users`, `products`, `cart_items`, `orders`, `order_items`
- JWT 認證（HS256，7 天有效期）
- 使用者模組：POST /register、POST /login、GET /profile
- 商品公開 API：GET /api/products（分頁）、GET /api/products/:id
- 購物車 API（雙模式認證）：GET / POST / PATCH / DELETE /api/cart
- 訂單模組：POST /api/orders（transaction 下單）、GET /api/orders、GET /api/orders/:id、PATCH /api/orders/:id/pay（模擬付款）
- 後台商品 CRUD：GET / POST /api/admin/products、PUT / DELETE /api/admin/products/:id
- 後台訂單管理：GET /api/admin/orders（含 status 篩選）、GET /api/admin/orders/:id
- 前台頁面：首頁、商品詳情、購物車、結帳、登入、我的訂單、訂單詳情
- 後台頁面：商品管理、訂單管理
- 種子資料：管理員帳號 + 8 件花卉商品
- Vitest 整合測試套件（6 個測試檔，序列執行）
- swagger-jsdoc OpenAPI 3.0.3 文件支援
- Tailwind CSS v4 建置流程
