# 更新日誌

版本格式遵循 [Semantic Versioning](https://semver.org/)，記錄格式依循 [Keep a Changelog](https://keepachangelog.com/)。

---

## [Unreleased]

_尚未發布的變更放在此區塊_

---

## [1.0.0] - 2026-05-05

### Added

- **認證系統**：使用者註冊（`POST /api/auth/register`）、登入（`POST /api/auth/login`）、取得個人資料（`GET /api/auth/profile`）；JWT HS256，有效期 7 天
- **商品瀏覽**：公開商品列表分頁查詢（`GET /api/products`）、單一商品詳情（`GET /api/products/:id`）
- **購物車（雙模式）**：同時支援 JWT 登入用戶與訪客（X-Session-Id）；加入、修改數量、移除商品；同一商品重複加入時自動累加數量
- **訂單流程**：從購物車建立訂單（atomic transaction：建單 + 快照商品資訊 + 扣庫存 + 清空購物車）；查看我的訂單列表與詳情；模擬付款 `PATCH /api/orders/:id/pay`（success / fail）
- **後台商品管理**：列表分頁、新增、編輯（partial update）、刪除（pending 訂單保護回 409）
- **後台訂單管理**：全站訂單列表（支援 status 篩選）、訂單詳情（含下單用戶資訊）
- **前台頁面（EJS SSR）**：首頁、商品詳情、購物車、結帳、登入、我的訂單、訂單詳情
- **後台頁面（EJS SSR）**：商品管理、訂單管理（獨立 admin layout + sidebar）
- **SQLite 自動初始化**：WAL 模式 + foreign_keys 啟用；啟動時建表並 seed 管理員帳號與 8 筆花卉商品
- **統一錯誤回應**：`errorHandler` middleware 防止 500 細節外洩；所有 API 統一回傳 `{ data, error, message }` 格式
- **OpenAPI 文件產生**：`npm run openapi` 輸出 `openapi.json`（swagger-jsdoc，掃描 src/routes/*.js JSDoc）
- **整合測試**：Vitest + supertest，共 6 個測試套件，循序執行，涵蓋 Auth、Products、Cart、Orders、AdminProducts、AdminOrders
