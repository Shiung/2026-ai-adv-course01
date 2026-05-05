# CLAUDE.md

## 專案概述

花店電商平台 — Express.js + EJS + SQLite + JWT，前後台整合於同一服務。

## 常用指令

```bash
npm start          # Build Tailwind CSS 後啟動 server
npm run dev:server # 直接啟動 server（不 build CSS）
npm run dev:css    # Tailwind CSS watch 模式
npm run css:build  # Build + minify Tailwind CSS
npm run openapi    # 產生 OpenAPI spec（輸出至 swagger-config.js）
npm test           # 執行 Vitest 測試（需先設定 JWT_SECRET）
```

## 關鍵規則

- 所有 API 回應格式固定為 `{ data, error, message }`，不得偏離
- 購物車支援雙模式認證：JWT Bearer token 或 `X-Session-Id` header（訪客模式）；若 Authorization header 存在但 token 無效，直接回 401，不回退到 session
- 建立訂單為 SQLite transaction：建立訂單 → 建立 order_items（快照商品名稱與價格）→ 扣庫存 → 清除購物車，全部原子執行
- DB 欄位命名用 snake_case；JS 請求 body 用 camelCase（如 `productId`、`recipientName`）
- 功能開發使用 `docs/plans/` 記錄計畫；完成後移至 `docs/plans/archive/`

## 詳細文件

- `./docs/README.md` — 項目介紹與快速開始
- `./docs/ARCHITECTURE.md` — 架構、目錄結構、資料流、DB schema
- `./docs/DEVELOPMENT.md` — 開發規範、命名規則、新增模組步驟
- `./docs/FEATURES.md` — 功能列表與完成狀態
- `./docs/TESTING.md` — 測試規範與指南
- `./docs/CHANGELOG.md` — 更新日誌

## 必要遵守項目

- `JWT_SECRET` 環境變數未設定時，server 啟動即 exit(1)
- 測試環境（`NODE_ENV=test`）bcrypt saltRounds 為 1，production 為 10
- 刪除商品前需確認無 pending 訂單，否則回 409 CONFLICT
- `database.sqlite` 不得 commit 進 git（已在 .gitignore）
- 新增 API 路由後須在 `app.js` 掛載，並補充 `@openapi` JSDoc 供 swagger-jsdoc 解析
