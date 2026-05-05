---
paths:
  - "src/routes/**"
  - "app.js"
---

# API 設計規則

## 回應格式
- 所有 API 一律回傳 `{ data, error, message }` 三個欄位，不得增減
- 成功時：`error: null`，`data` 為實際資料（物件或陣列）
- 失敗時：`data: null`，`error` 為全大寫錯誤碼（如 `'VALIDATION_ERROR'`、`'NOT_FOUND'`）
- 不得直接回傳裸陣列或裸字串

## 路由命名
- RESTful 資源路徑用小寫複數名詞（`/api/products`、`/api/orders`）
- 動作用子路徑動詞（`/api/orders/:id/pay`）
- 後台路由統一前綴 `/api/admin/`
- 新路由掛載於 `app.js`，不在路由檔內自行 listen

## 驗證
- 缺少必填欄位回 400，error code 為 `'VALIDATION_ERROR'`
- 資源不存在回 404，error code 為 `'NOT_FOUND'`
- 資源衝突（如重複 email）回 409，error code 為 `'CONFLICT'`
- 未授權回 401 `'UNAUTHORIZED'`，權限不足回 403 `'FORBIDDEN'`

## OpenAPI 文件
- 每個路由 handler 上方必須加 `@openapi` JSDoc
- 新增路由後執行 `npm run openapi` 確認 spec 正確產生
- tags 使用現有分類：`[Auth]`、`[Products]`、`[Cart]`、`[Orders]`、`[Admin Products]`、`[Admin Orders]`
