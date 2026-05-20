---
# 無 paths，全域套用
---

# 安全性規則

## JWT 處理
- 不要在回應中洩漏 JWT_SECRET 或 password_hash
- JWT 驗證必須指定演算法：`jwt.verify(token, secret, { algorithms: ['HS256'] })`
- Token 驗證後額外查詢 DB 確認 user 仍存在（防止刪除帳號後 token 仍有效）

## 密碼安全
- 密碼必須以 bcrypt 雜湊後儲存，禁止明文
- 登入錯誤不區分「帳號不存在」與「密碼錯誤」（統一回傳 401，防止帳號列舉）

## SQL Injection 防護
- 所有 SQL 查詢使用 parameterized prepared statements
- 禁止字串拼接 SQL（例如 `'WHERE id = ' + id`）

## 輸入驗證
- API 端點必須驗證所有必填欄位是否存在
- email 欄位驗證格式：`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- 數值欄位驗證型別（`Number.isInteger()`）與範圍

## 敏感資訊
- `.env` 禁止提交至 git（已在 .gitignore）
- 錯誤回應使用 `errorHandler.js` 過濾，避免洩漏 stack trace 或內部細節
- 500 錯誤統一回傳「伺服器內部錯誤」，不洩漏 err.message

## CORS
- CORS origin 設定從環境變數取得：`process.env.FRONTEND_URL || 'http://localhost:3001'`
- 不要將 CORS origin 設為 `*`（wildcard）

## Admin 保護
- 所有 `/api/admin/**` 路由必須同時套用 `authMiddleware + adminMiddleware`
- 用戶自行指定 role 為 admin 是不可能的（register 固定 role 為 'user'）
