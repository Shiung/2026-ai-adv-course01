---
paths:
  - "tests/**"
  - "vitest.config.js"
---

# 測試規則

## 執行環境
- 使用真實 SQLite DB，不 mock database 或 HTTP handler
- `fileParallelism: false`：所有測試檔案**必須依序執行**，不得並行
- 測試共用同一個 `database.sqlite`，各測試間資料會累積

## 執行順序（不得更動）
1. auth → 2. products → 3. cart → 4. orders → 5. adminProducts → 6. adminOrders
新增測試檔需加入 `vitest.config.js` 的 `sequence.files` 陣列，位置需考慮資料依賴關係

## 使用 setup.js 輔助函式
- 永遠從 `./setup` 引入 `{ app, request, getAdminToken, registerUser }`
- `getAdminToken()` 使用 seed admin 帳號（`admin@hexschool.com` / `12345678`）
- `registerUser(overrides?)` 自動產生唯一 email，避免重複衝突
- 不要在測試中直接 `require('../app')`，統一透過 setup

## 斷言標準
- 每個 it() 至少檢查：`res.status`、`res.body.data`（或 null）、`res.body.error`（或 null）
- 成功回應：`expect(res.body).toHaveProperty('error', null)`
- 失敗回應：`expect(res.body).toHaveProperty('data', null)`

## 購物車測試注意
- 訪客模式用 `.set('X-Session-Id', sessionId)`
- 登入模式用 `.set('Authorization', \`Bearer \${token}\`)`
- 訂單建立必須以登入模式加入購物車（訪客購物車無法結帳）

## 不需要 mock 的情況
- bcrypt：測試環境 saltRounds=1，已夠快
- JWT：使用真實 `process.env.JWT_SECRET`（執行測試前需設定）
- DB：使用真實 SQLite，不需 in-memory 替代
