# CLAUDE.md

## 專案概述

花藝電商後台系統 — Express.js + EJS + SQLite + Tailwind CSS + JWT

一個全端花藝電商平台，包含前台購物流程（商品瀏覽、購物車、結帳、訂單查詢）和後台管理（商品 CRUD、訂單管理），使用 server-side rendering (EJS) 搭配 REST API。

## 常用指令

```bash
npm start          # 建置 CSS 並啟動伺服器（port 3001）
npm run dev:server # 僅啟動伺服器（不重建 CSS）
npm run dev:css    # 監聽 CSS 變更並即時重建（開發用）
npm run openapi    # 產生 OpenAPI JSON 規格文件
npm test           # 執行所有 Vitest 測試（順序執行）
```

## 關鍵規則

- **API 回應格式**：所有 API 必須回傳 `{ data, error, message }`，成功時 error 為 null，失敗時 data 為 null
- **購物車雙模式認證**：購物車 API 接受 JWT Bearer token 或 `X-Session-Id` header（訪客用），兩者同時存在時優先使用 JWT
- **訂單建立為原子操作**：使用 SQLite transaction，一次完成插入訂單、訂單項目、扣庫存、清空購物車，不可拆分
- **Admin 路由雙層保護**：`/api/admin/**` 同時套用 `authMiddleware` + `adminMiddleware`
- **測試有順序依賴**：vitest 設定 `fileParallelism: false`，測試必須按 auth → products → cart → orders → adminProducts → adminOrders 順序執行
- 功能開發使用 `docs/plans/` 記錄計畫；完成後移至 `docs/plans/archive/`

## 詳細文件

- [./docs/README.md](./docs/README.md) — 項目介紹與快速開始
- [./docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — 架構、目錄結構、資料流、資料庫 Schema
- [./docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) — 開發規範、命名規則、新增功能步驟
- [./docs/FEATURES.md](./docs/FEATURES.md) — 功能列表、API 行為描述、業務邏輯
- [./docs/TESTING.md](./docs/TESTING.md) — 測試規範、測試輔助函式、撰寫指引
- [./docs/CHANGELOG.md](./docs/CHANGELOG.md) — 更新日誌

## 必要遵守項目

- 新增 API 路由時，在路由檔案加上 `@openapi` JSDoc 並執行 `npm run openapi` 更新 spec
- 所有 SQLite 查詢必須使用 parameterized statements（`db.prepare('... WHERE id = ?').get(id)`），禁止字串拼接 SQL
- 刪除商品前需確認無 pending 訂單（業務規則，參考 `adminProductRoutes.js:349`）
- bcrypt salt rounds 在測試環境為 1（透過 `NODE_ENV === 'test'` 判斷），生產為 10，**勿移除此判斷**
- 不要在 `.env` 或原始碼中 hardcode JWT_SECRET；`server.js` 啟動時會強制檢查
