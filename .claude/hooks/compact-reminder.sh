#!/bin/bash
# After session stop, output key project rules as a reminder for next context window

cat << 'EOF'

=== 專案關鍵規則（context 壓縮後提醒）===

專案：花店電商平台（Express + SQLite + JWT + EJS）

【回應格式】所有 API 一律回傳 { data, error, message }

【購物車雙模式認證】
  - JWT Bearer token → 登入用戶（user_id）
  - X-Session-Id header → 訪客（session_id）
  - Authorization header 存在但 token 無效 → 直接 401，不回退 session

【訂單建立為 SQLite Transaction】
  建立訂單 → 建立 order_items（快照名稱+價格）→ 扣庫存 → 清購物車

【測試必須依序執行】fileParallelism: false
  auth → products → cart → orders → adminProducts → adminOrders

【DB 欄位 snake_case，請求 body camelCase】

=== END ===
EOF
exit 0
