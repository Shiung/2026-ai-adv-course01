---
paths:
  - "tests/**"
---

# 測試規則

## 框架與執行
- 使用 Vitest + supertest
- 執行：`npm test`（等同 `vitest run`）
- `fileParallelism: false`：測試檔案必須順序執行，不可並行

## 測試執行順序（不可更動）
```
auth → products → cart → orders → adminProducts → adminOrders
```
新增測試檔時，務必在 `vitest.config.js` 的 `sequence.files` 中指定位置。

## 輔助函式（tests/setup.js）
- `getAdminToken()` — 以 seed admin 帳號登入，回傳 JWT token
- `registerUser(overrides)` — 自動產生唯一 email 並註冊，回傳 `{ token, user }`
- 測試檔頂部引入：`const { app, request, getAdminToken, registerUser } = require('./setup')`

## 動態 Email
- 測試中建立用戶時，使用 `Date.now()` + 隨機字串產生唯一 email，避免測試間衝突：
  ```js
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  ```

## 回應驗證
- 所有回應必須驗證 `{ data, error, message }` 三個欄位
- 成功：`expect(res.body.error).toBeNull()`
- 失敗：`expect(res.body.data).toBeNull()` + `expect(res.body.error).not.toBeNull()`

## 不要加 Mock
- 測試直接使用真實 SQLite DB（`database.sqlite`）
- 禁止 mock 資料庫或 middleware，否則無法發現真實整合問題
