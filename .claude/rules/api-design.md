---
paths:
  - "src/routes/**"
---

# API 設計規則

## 回應格式
- 所有 API 必須回傳 `{ data, error, message }`
- 成功時：`data` 為實際資料，`error` 為 `null`
- 失敗時：`data` 為 `null`，`error` 為全大寫錯誤代碼（如 `VALIDATION_ERROR`、`NOT_FOUND`）

## HTTP 狀態碼
- 200：成功（GET、PATCH、DELETE 回傳資料）
- 201：建立成功（POST 新資源）
- 400：請求參數錯誤（`VALIDATION_ERROR`、`CART_EMPTY`、`STOCK_INSUFFICIENT`）
- 401：未認證（`UNAUTHORIZED`）
- 403：權限不足（`FORBIDDEN`）
- 404：資源不存在（`NOT_FOUND`）
- 409：衝突（`CONFLICT`，例如 email 重複、刪除有 pending 訂單的商品）

## 路由命名
- 集合：`GET /api/products`（複數名詞）
- 單項：`GET /api/products/:id`
- 動作：`PATCH /api/orders/:id/pay`（動詞作子路徑）
- 後台一律加 `/api/admin/` 前綴

## API 文件
- 每個路由必須加 `@openapi` JSDoc 標注（參考現有路由格式）
- 修改路由後執行 `npm run openapi` 更新 spec

## SQL 安全
- 所有資料庫查詢使用 parameterized statements：`db.prepare('... WHERE id = ?').get(id)`
- 禁止使用字串拼接 SQL（防止 SQL injection）

## 資料庫操作
- 需要原子性的多步驟操作（例如建立訂單）必須使用 `db.transaction()`
