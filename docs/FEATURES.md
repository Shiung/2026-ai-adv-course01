# FEATURES.md

## 功能狀態總覽

| 功能 | 狀態 |
|------|------|
| 使用者認證（註冊 / 登入） | ✅ 完成 |
| 前台商品瀏覽（列表 / 詳情） | ✅ 完成 |
| 購物車（訪客 + 登入雙模式） | ✅ 完成 |
| 訂單建立與付款模擬 | ✅ 完成 |
| 後台商品管理 CRUD | ✅ 完成 |
| 後台訂單管理 | ✅ 完成 |
| EJS SSR 前台頁面 | ✅ 完成 |
| EJS SSR 後台頁面 | ✅ 完成 |
| OpenAPI 文件產生 | ✅ 完成 |
| 綠界金流整合 | ⏳ 預留（env vars 已定義） |

---

## 使用者認證

**POST /api/auth/register**

必填 body：`email`、`password`（≥6 字元）、`name`。

驗證：email 格式、password 長度、email 唯一性（衝突回 409 CONFLICT）。

成功後自動簽發 JWT，回傳 `{ user, token }`，role 固定為 `'user'`。

**POST /api/auth/login**

必填：`email`、`password`。email 不存在或密碼錯誤皆回 401 UNAUTHORIZED（不區分原因，防止帳號枚舉）。

**GET /api/auth/profile**

需 JWT。回傳 `{ id, email, name, role, created_at }`。

---

## 商品瀏覽（前台）

**GET /api/products**

查詢參數：
- `page`：頁碼，預設 `1`
- `limit`：每頁筆數，預設 `10`，最大 `100`

回傳：`{ products, pagination: { total, page, limit, totalPages } }`

依 `created_at DESC` 排序（最新在前）。

**GET /api/products/:id**

商品不存在回 404 NOT_FOUND。

---

## 購物車（雙模式認證）

購物車同時支援訪客（`X-Session-Id` header）與登入用戶（JWT Bearer token）。

**關鍵行為：加入購物車會累加數量**

若購物車中已有同一商品，POST /api/cart 會將新數量加到現有數量（不是取代）。庫存檢查針對累加後的總數量。

```
範例：購物車已有 A 商品 2 件，再加入 3 件
→ 更新為 5 件（庫存需 ≥ 5）
```

**dualAuth 認證流程**：
1. 有 `Authorization: Bearer <token>` → 驗證 JWT，**失敗直接 401，不回退 session**
2. 無 Authorization，有 `X-Session-Id` → 訪客模式
3. 兩者皆無 → 401

**PATCH /api/cart/:itemId**：直接覆蓋數量（不累加），須 ≥ 1 且 ≤ 庫存。

---

## 訂單建立與付款

**POST /api/orders**（需 JWT）

必填 body：`recipientName`、`recipientEmail`、`recipientAddress`。

建立邏輯（SQLite transaction，全部成功才 commit）：
1. 驗證購物車不為空
2. 檢查所有商品庫存是否足夠（不足則列出商品名稱）
3. 計算總金額
4. INSERT 訂單
5. INSERT order_items（快照商品名稱與價格，未來商品改名/改價不影響歷史記錄）
6. UPDATE products.stock（扣減庫存）
7. DELETE cart_items WHERE user_id = ?（清空購物車）

注意：訂單建立時讀取 `cart_items WHERE user_id = ?`，因此購物車必須以 **JWT 登入模式**持有。訪客購物車（session_id）無法直接結帳。

**PATCH /api/orders/:id/pay**

body：`{ action: 'success' | 'fail' }`

僅限 `status = 'pending'` 的訂單，成功後更新為 `paid` 或 `failed`。已付款或失敗的訂單無法再操作。

---

## 後台商品管理（需 JWT + admin）

**GET /api/admin/products**：分頁列表（同前台，但需管理員權限）。

**POST /api/admin/products**

必填：`name`、`price`（正整數）、`stock`（非負整數）。選填：`description`、`image_url`。

**PUT /api/admin/products/:id**

所有欄位皆為選填，只傳要改的欄位。會更新 `updated_at`。`name` 不能傳空字串。

**DELETE /api/admin/products/:id**

若該商品存在 `status = 'pending'` 的訂單，回 409 CONFLICT 禁止刪除（避免破壞進行中的訂單）。

---

## 後台訂單管理（需 JWT + admin）

**GET /api/admin/orders**

查詢參數：
- `page`、`limit`（分頁）
- `status`：`pending` | `paid` | `failed`（選填，不傳則返回全部）

回傳欄位包含 `user_id`（管理員用），前台訂單列表不回傳此欄位。

**GET /api/admin/orders/:id**

回傳完整訂單資訊，額外附帶 `user: { name, email }`（查詢下單者資料）。
