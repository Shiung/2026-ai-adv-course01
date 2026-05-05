# CHANGELOG.md

## [Unreleased]

## [1.0.0] - 2026-05-05

### Added
- 使用者認證：JWT 註冊 / 登入 / 個人資料
- 前台商品瀏覽：分頁列表、商品詳情
- 購物車：dualAuth 雙模式（訪客 session / JWT 登入）
- 訂單建立：SQLite transaction 原子執行（建立訂單 + 扣庫存 + 清購物車）
- 訂單付款模擬：PATCH /api/orders/:id/pay
- 後台商品 CRUD（管理員權限）
- 後台訂單列表與詳情（可依 status 篩選）
- EJS SSR 前台頁面：首頁、商品詳情、購物車、結帳、登入、訂單列表、訂單詳情
- EJS SSR 後台頁面：商品管理、訂單管理
- Tailwind CSS 4.x 整合
- swagger-jsdoc OpenAPI 3.0 文件產生
- Vitest + supertest 整合測試（6 個測試檔）
