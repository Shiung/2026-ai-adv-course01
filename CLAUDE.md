# CLAUDE.md

## 專案概述

花卉電商網站 (Flower E-Commerce) — Express 4 + EJS SSR + SQLite (better-sqlite3) + JWT 認證 + Vitest 測試 + Tailwind CSS v4

多頁應用（MPA），前台提供購物流程，後台提供商品與訂單管理，前後端以 REST API 溝通，資料格式統一為 `{ data, error, message }`。

## 常用指令

```bash
npm start          # 建置 CSS 後啟動生產環境 server (port 3001)
npm run dev:server # 僅啟動 server（不重建 CSS）
npm run dev:css    # 監聽並即時重建 Tailwind CSS
npm run css:build  # 一次性建置並壓縮 CSS
npm run openapi    # 產生 OpenAPI JSON 規格
npm test           # 執行全部測試（Vitest）
```

## 關鍵規則

- **統一回應格式**：所有 API 回應必須符合 `{ data, error, message }` 結構，成功時 error 為 null，失敗時 data 為 null。
- **購物車雙模式認證**：`/api/cart` 優先使用 JWT，若無 JWT 則退回 `X-Session-Id` header（guest 模式）。其他 API 端點僅接受 JWT。
- **訂單建立為 transaction**：下單時同一 transaction 內完成：建立訂單、寫入明細、扣減庫存、清空購物車，不可拆分。
- **資料庫路徑固定**：`src/database.js` 的 db 路徑為 `src/../database.sqlite`（即根目錄），測試與開發共用同一 SQLite 檔案。
- **功能開發使用 docs/plans/ 記錄計畫；完成後移至 docs/plans/archive/**

## 詳細文件

- [docs/README.md](./docs/README.md) — 項目介紹與快速開始
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — 架構、目錄結構、資料流
- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) — 開發規範、命名規則、環境變數
- [docs/FEATURES.md](./docs/FEATURES.md) — 功能列表與完成狀態
- [docs/TESTING.md](./docs/TESTING.md) — 測試規範與指南
- [docs/CHANGELOG.md](./docs/CHANGELOG.md) — 更新日誌
