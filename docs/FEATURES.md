# 功能列表

## 完成狀態總覽

| 功能區塊 | 狀態 |
|---------|------|
| 用戶認證 | ✅ 完成 |
| 商品瀏覽（前台） | ✅ 完成 |
| 購物車 | ✅ 完成 |
| 訂單 | ✅ 完成 |
| 後台商品管理 | ✅ 完成 |
| 後台訂單管理 | ✅ 完成 |
| 真實金流整合 | 🔲 未實作（ECPay 變數已備妥） |

---

## 用戶認證（Auth）

路由前綴：`/api/auth`｜無需認證（除 profile）

### POST /api/auth/register — 註冊

**必填欄位**：`email`（格式驗證）、`password`（最少 6 字元）、`name`

**業務邏輯**：
- email 重複 → 409 CONFLICT
- 密碼以 bcrypt 雜湊（10 rounds）
- 成功後立即回傳 JWT token（7 天有效），不需再次登入
- 新用戶 role 固定為 `'user'`，無法自行指定 admin

**成功回應（201）**：
```json
{ "data": { "user": { "id", "email", "name", "role" }, "token": "..." }, "error": null, "message": "註冊成功" }
```

**錯誤情境**：
- 400 `VALIDATION_ERROR`：欄位缺失、email 格式錯誤、密碼太短
- 409 `CONFLICT`：email 已被註冊

---

### POST /api/auth/login — 登入

**必填欄位**：`email`、`password`

**業務邏輯**：不區分「帳號不存在」與「密碼錯誤」，統一回傳 401（防止帳號列舉攻擊）

**成功回應（200）**：格式同 register

**錯誤情境**：
- 400 `VALIDATION_ERROR`：欄位缺失
- 401 `UNAUTHORIZED`：帳號或密碼錯誤

---

### GET /api/auth/profile — 取得個人資料

**需要**：`Authorization: Bearer <token>`

**回應 data**：`{ id, email, name, role, created_at }`

---

## 商品瀏覽（前台）

路由前綴：`/api/products`｜無需認證

### GET /api/products — 商品列表

**查詢參數**：
- `page`（預設 1，最小 1）
- `limit`（預設 10，最大 100，最小 1）

**回應 data**：
```json
{
  "products": [...],
  "pagination": { "total", "page", "limit", "totalPages" }
}
```

排序：`created_at DESC`（最新商品在前）

---

### GET /api/products/:id — 商品詳情

回傳單一商品完整資訊（含 stock、image_url）。

**錯誤情境**：404 `NOT_FOUND`

---

## 購物車（Cart）

路由前綴：`/api/cart`｜雙模式認證（JWT 或 X-Session-Id）

購物車同時支援登入用戶（以 user_id 識別）和訪客（以 X-Session-Id header 值識別）。兩者的購物車資料儲存在同一張 `cart_items` 表，透過欄位區分。

**認證規則**：
- 有 `Authorization: Bearer <token>` → 使用 JWT 認證，token 無效立即 401（不嘗試 fallback）
- 無 Authorization header + 有 `X-Session-Id` → 訪客模式
- 兩者皆無 → 401

### GET /api/cart — 查看購物車

**回應 data**：
```json
{
  "items": [
    {
      "id": "cart-item-uuid",
      "product_id": "...",
      "quantity": 2,
      "product": { "name", "price", "stock", "image_url" }
    }
  ],
  "total": 3360
}
```

`total` 為所有項目的 `price × quantity` 加總，在回應時動態計算。

---

### POST /api/cart — 加入購物車

**必填欄位**：`productId`、`quantity`（預設 1，必須為正整數）

**業務邏輯（累加規則）**：
- 若購物車中已有同一商品 → 累加數量（`existingQty + newQty`）
- 若累加後超過庫存 → 400 `STOCK_INSUFFICIENT`
- 若商品不存在 → 404 `NOT_FOUND`

---

### PATCH /api/cart/:itemId — 修改數量

**必填欄位**：`quantity`（正整數，**直接設定**，不累加）

確認 itemId 屬於當前用戶/session，且新數量不超過庫存。

---

### DELETE /api/cart/:itemId — 移除項目

確認 itemId 屬於當前用戶/session 才允許刪除。

---

## 訂單（Orders）

路由前綴：`/api/orders`｜需要 JWT 認證（不支援訪客）

### POST /api/orders — 建立訂單

**必填欄位**：`recipientName`、`recipientEmail`（格式驗證）、`recipientAddress`

**業務邏輯（原子 Transaction）**：

下列操作在單一 SQLite transaction 內完成，任一步驟失敗則全部 rollback：

1. 從 `cart_items` 讀取當前用戶的購物車（僅讀 `user_id` 欄位，不讀 session 購物車）
2. 驗證購物車不為空（否則 400 `CART_EMPTY`）
3. 驗證所有商品庫存充足（否則 400 `STOCK_INSUFFICIENT`，列出不足商品名稱）
4. 計算 `total_amount`（價格快照於建立當下）
5. 插入 `orders` 記錄（產生 `ORD-YYYYMMDD-XXXXX` 格式的 order_no）
6. 插入 `order_items`（複製商品名稱與價格為快照）
7. 扣除每個商品的庫存（`UPDATE products SET stock = stock - qty`）
8. 清空購物車（`DELETE FROM cart_items WHERE user_id = ?`）

初始狀態：`status = 'pending'`

---

### GET /api/orders — 我的訂單列表

回傳當前登入用戶的所有訂單，按 `created_at DESC` 排序。

---

### GET /api/orders/:id — 訂單詳情

確認訂單 `user_id` 等於當前登入用戶，否則回傳 404（安全起見不區分「不存在」與「不屬於你」）。

回應包含 `items` 陣列（order_items 記錄）。

---

### PATCH /api/orders/:id/pay — 模擬付款

**必填欄位**：`action`（`'success'` 或 `'fail'`）

**業務邏輯**：
- action 對應：`success → 'paid'`、`fail → 'failed'`
- 訂單必須是 `pending` 狀態，否則 400 `INVALID_STATUS`
- 只有訂單擁有者可以操作

此為模擬接口；真實金流（ECPay）尚未整合。

---

## 後台商品管理（Admin Products）

路由前綴：`/api/admin/products`｜需要 JWT + admin role

### GET /api/admin/products — 商品列表（含分頁）

與前台 `/api/products` 相同邏輯，差異在於需要 admin 認證。

### POST /api/admin/products — 新增商品

**必填欄位**：`name`、`price`（正整數）、`stock`（非負整數）
**選填欄位**：`description`、`image_url`

### PUT /api/admin/products/:id — 編輯商品

所有欄位選填（partial update）：僅傳入要修改的欄位，未傳的保留原值。
自動更新 `updated_at = datetime('now')`。

**驗證**：`name` 不可為空白字串；`price` 必須為正整數；`stock` 必須為非負整數。

### DELETE /api/admin/products/:id — 刪除商品

**業務規則**：若商品在任何 `status = 'pending'` 的訂單中出現，禁止刪除（409 `CONFLICT`）。

---

## 後台訂單管理（Admin Orders）

路由前綴：`/api/admin/orders`｜需要 JWT + admin role

### GET /api/admin/orders — 訂單列表

**查詢參數**：
- `page`（預設 1）、`limit`（預設 10，最大 100）
- `status`（可選，篩選 `pending` / `paid` / `failed`）

不傳 status 則回傳所有訂單。

### GET /api/admin/orders/:id — 訂單詳情

回應包含：訂單基本資訊、`items` 陣列、`user`（`{ name, email }`，若用戶已刪除則為 null）。
