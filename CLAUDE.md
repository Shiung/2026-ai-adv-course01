# CLAUDE.md

## 專案概述

花卉電商後端 — Node.js / Express / SQLite (better-sqlite3) / EJS / TailwindCSS

提供完整的電商功能：商品瀏覽、訪客/會員購物車、訂單結帳（含模擬付款）、後台商品與訂單管理。JWT 認證 + X-Session-Id 雙模式身份識別。

## 常用指令

```bash
npm start           # 建置 CSS 後啟動伺服器（正式環境用）
node server.js      # 直接啟動伺服器（開發用，不重建 CSS）
npm run dev:css     # TailwindCSS watch 模式（開發時另開終端機）
npm test            # 執行所有整合測試
npm run openapi     # 產生 openapi.json（需先啟動伺服器讀取 JSDoc）
npm run css:build   # 一次性 minify 建置 CSS
```

## 關鍵規則

- **啟動前必須設定 `JWT_SECRET`**，否則 `server.js` 會呼叫 `process.exit(1)`
- **購物車雙模式認證**：Cart routes 接受 JWT Bearer 或 `X-Session-Id`；若 Bearer header 存在但 token 無效，直接回 401，不 fallback 到 session
- **建立訂單是 transaction**：insert order + insert order_items + 扣庫存 + 清空購物車 — 四步驟同時成功或全部 rollback
- **刪除商品有保護**：商品若存在 `status = 'pending'` 的訂單項目，回 409 拒絕刪除
- **測試環境 bcrypt 加速**：`NODE_ENV === 'test'` 時 saltRounds = 1（database.js），避免 bcrypt 拖慢測試
- 功能開發使用 docs/plans/ 記錄計畫；完成後移至 docs/plans/archive/

## 詳細文件

- ./docs/README.md — 項目介紹與快速開始
- ./docs/ARCHITECTURE.md — 架構、目錄結構、資料流
- ./docs/DEVELOPMENT.md — 開發規範、命名規則
- ./docs/FEATURES.md — 功能列表與完成狀態
- ./docs/TESTING.md — 測試規範與指南
- ./docs/CHANGELOG.md — 更新日誌
