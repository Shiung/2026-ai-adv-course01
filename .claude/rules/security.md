# 安全性規則

## JWT 處理
- JWT Secret 僅從 `process.env.JWT_SECRET` 讀取，禁止 hardcode
- 演算法明確指定 `{ algorithms: ['HS256'] }`（驗證端），防止 algorithm confusion attack
- token 有效期使用 `'7d'`（伺服器端管理，無 refresh token 機制）
- 前端從 HTTP header 傳入，不用 cookie（避免 CSRF），不存 DB

## 密碼處理
- 儲存前必須 bcrypt hash，saltRounds 正式環境為 `10`
- 登入比對用 `bcrypt.compareSync`，不自行比對 hash
- 密碼錯誤與帳號不存在統一回傳相同錯誤訊息（防止帳號枚舉）
- 密碼欄位（`password_hash`）不得出現在 API 回應中

## SQL Injection 防護
- 所有帶變數的查詢必須使用 `db.prepare()` prepared statement
- 查詢的欄位名（如 `owner.field`）必須來自受控的白名單，不接受使用者輸入直接作為欄位名
- 禁止字串拼接 SQL：`'SELECT * FROM users WHERE id = ' + userId` 這類寫法絕對禁止

## 輸入驗證
- API 入口對必填欄位做存在性檢查，格式不符回 400
- 整數欄位（price、stock、quantity）明確用 `Number.isInteger()` 驗證，不接受浮點
- Email 格式用 regex 驗證：`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

## 錯誤資訊
- 500 錯誤一律回傳通用訊息（`errorHandler.js` 已處理），不洩漏 stack trace
- `console.error` 在 server 端 log，不回傳給 client
- 錯誤碼用大寫縮寫（`VALIDATION_ERROR`、`UNAUTHORIZED`），不含實作細節

## CORS
- 允許的 origin 從 `process.env.FRONTEND_URL` 讀取，預設 `http://localhost:3001`
- 正式環境部署需明確設定 `FRONTEND_URL`，避免使用萬用字元 `*`
