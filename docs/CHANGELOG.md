# Changelog

## [Unreleased]

### Added
- 串接 ECPay AIO 金流，支援信用卡付款（`src/utils/ecpay.js`、`src/routes/ecpayRoutes.js`）
- 新增 `GET /api/orders/:id/ecpay-form` — 產生 ECPay AIO 表單參數（`src/routes/orderRoutes.js`）
- 新增 `POST /api/orders/:id/verify-payment` — 呼叫 ECPay QueryTradeInfo 確認付款結果（`src/routes/orderRoutes.js`）
- 新增 `POST /api/ecpay/return` — 接收 ECPay Server Notify（`src/routes/ecpayRoutes.js`）
- `orders` 表新增 `ecpay_trade_no`、`payment_method`、`paid_at` 欄位（`src/database.js`）

### Changed
- 訂單詳情頁付款流程改為真實 ECPay AIO 串接，移除 mock 付款按鈕（`views/pages/order-detail.ejs`、`public/js/pages/order-detail.js`）

## [初始版本] — 2026-05-20

### 新增
- 用戶認證：註冊、登入、取得個人資料（JWT）
- 前台商品瀏覽：商品列表（分頁）、商品詳情
- 購物車：支援登入用戶（JWT）與訪客（X-Session-Id）雙模式，加入/修改/移除/查看
- 訂單：從購物車建立訂單（原子 Transaction）、訂單列表、訂單詳情、模擬付款
- 後台商品管理：新增/編輯/刪除商品（admin role 保護）
- 後台訂單管理：訂單列表（支援 status 篩選）、訂單詳情
- EJS 模板前台頁面：首頁、商品詳情、購物車、結帳、登入、訂單列表、訂單詳情
- EJS 模板後台頁面：商品管理、訂單管理
- Vitest + supertest 測試套件（6 個測試檔，順序執行）
- swagger-jsdoc OpenAPI 文件產生
- Tailwind CSS 4.2.2 整合
