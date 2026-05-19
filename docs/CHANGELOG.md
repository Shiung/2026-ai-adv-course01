# CHANGELOG.md

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
