# FEATURES.md

## 功能完成狀態

| 功能模組 | 狀態 |
|----------|------|
| 使用者認證（註冊 / 登入 / 個人資料） | ✅ 完成 |
| 商品列表與詳情（公開 API） | ✅ 完成 |
| 購物車（Guest + 登入雙模式） | ✅ 完成 |
| 訂單建立與查詢 | ✅ 完成 |
| 模擬付款 | ✅ 完成 |
| 後台商品管理（CRUD） | ✅ 完成 |
| 後台訂單管理（列表 + 詳情） | ✅ 完成 |
| 前台頁面（SSR + EJS） | ✅ 完成 |
| OpenAPI 文件產生 | ✅ 完成 |

---

## 1. 使用者認證

### 1.1 POST /api/auth/register — 註冊

**業務邏輯：**
- 必填欄位：`email`（格式驗證）、`password`（最少 6 字元）、`name`
- Email 重複時回傳 409
- 密碼以 bcrypt 雜湊（rounds: 10，`NODE_ENV=test` 時為 1）
- 成功後即刻簽發 JWT（7 天），回傳 `{ user: { id, email, name, role }, token }`
- 新帳號 role 固定為 `'user'`，無法自行指定 admin

**Request Body（必填）：**
```json
{ "email": "string", "password": "string（min 6）", "name": "string" }
```

**錯誤碼：**

| 狀態 | error | 情境 |
|------|-------|------|
| 400 | `VALIDATION_ERROR` | 欄位缺失 / Email 格式錯誤 / 密碼不足 6 字元 |
| 409 | `CONFLICT` | Email 已被使用 |

---

### 1.2 POST /api/auth/login — 登入

**業務邏輯：**
- 必填欄位：`email`、`password`
- Email 不存在與密碼錯誤皆回傳 401（防止帳號枚舉）
- 成功回傳與 register 相同的結構

**錯誤碼：**

| 狀態 | error | 情境 |
|------|-------|------|
| 400 | `VALIDATION_ERROR` | 欄位缺失 |
| 401 | `UNAUTHORIZED` | Email 不存在或密碼錯誤 |

---

### 1.3 GET /api/auth/profile — 個人資料

- 需要 JWT（authMiddleware）
- 查詢 DB 確認使用者存在，回傳 `{ id, email, name, role, created_at }`

**錯誤碼：**

| 狀態 | error | 情境 |
|------|-------|------|
| 401 | `UNAUTHORIZED` | 未帶 token / token 無效 |
| 404 | `NOT_FOUND` | Token 有效但使用者已被刪除 |

---

## 2. 商品

### 2.1 GET /api/products — 商品列表

**行為描述：**
- 公開端點，無需認證
- 支援分頁查詢：`?page=1&limit=10`
- `page` 最小值 1，`limit` 範圍 1–100，超出範圍自動截斷
- 按 `created_at DESC` 排序（最新商品優先）
- 回傳 `{ products: [...], pagination: { total, page, limit, totalPages } }`

**查詢參數：**

| 參數 | 型別 | 預設 | 說明 |
|------|------|------|------|
| `page` | integer | 1 | 頁碼（最小 1） |
| `limit` | integer | 10 | 每頁筆數（範圍 1–100） |

---

### 2.2 GET /api/products/:id — 商品詳情

- 公開端點
- 回傳完整商品欄位（含 stock）

**錯誤碼：**

| 狀態 | error | 情境 |
|------|-------|------|
| 404 | `NOT_FOUND` | 商品不存在 |

---

## 3. 購物車

### 3.1 雙模式認證機制（重要）

購物車 API（`/api/cart`）使用 `dualAuth` 而非標準 `authMiddleware`：

1. 若請求帶有 `Authorization: Bearer <token>`，進行 JWT 驗證：
   - 成功 → 以 `user_id` 識別購物車
   - 失敗 → **直接 401**，不退回 session 模式
2. 若無 Authorization header，檢查 `X-Session-Id` header：
   - 有值 → 以 `session_id` 識別購物車（guest 模式）
   - 無值 → 401

**實作後果**：前端 `Auth.getAuthHeaders()` 同時送出 Bearer token 與 X-Session-Id，當使用者已登入時 server 使用 JWT；未登入時（token 為空，header 不含 Authorization）server 使用 session。

---

### 3.2 POST /api/cart — 加入購物車

**業務邏輯：**
- 必填：`productId`（string）、`quantity`（integer >= 1，預設 1）
- 若同一 owner（user_id 或 session_id）已有相同商品，**累加**數量（不建立新項目）
- 累加後總量超過庫存 → 400 STOCK_INSUFFICIENT
- 新加入時數量超過庫存 → 400 STOCK_INSUFFICIENT
- 回傳 `{ id, product_id, quantity }`（更新或新建後的最終狀態）

**錯誤碼：**

| 狀態 | error | 情境 |
|------|-------|------|
| 400 | `VALIDATION_ERROR` | productId 缺失 / quantity 非正整數 |
| 400 | `STOCK_INSUFFICIENT` | 庫存不足 |
| 404 | `NOT_FOUND` | 商品不存在 |

---

### 3.3 GET /api/cart — 查看購物車

- 以 JOIN 查詢取得商品資訊，回傳每項的 `product: { name, price, stock, image_url }`
- `total` 為所有項目的 `price × quantity` 加總（即時計算，不存 DB）

---

### 3.4 PATCH /api/cart/:itemId — 修改數量

- `quantity` 必須為正整數（替換，非累加）
- 新數量超過庫存 → 400 STOCK_INSUFFICIENT
- 只能修改屬於自己（同 owner）的購物車項目

---

### 3.5 DELETE /api/cart/:itemId — 移除品項

- 只能移除屬於自己（同 owner）的購物車項目
- 成功回傳 `{ data: null, error: null, message: '已從購物車移除' }`

---

## 4. 訂單

### 4.1 POST /api/orders — 建立訂單

**業務邏輯（全部在 transaction 內執行）：**

1. 驗證收件人資訊（`recipientName`、`recipientEmail`、`recipientAddress` 必填）
2. 取得當前使用者購物車（僅 JWT user_id 模式，guest 無法下單）
3. 購物車為空 → 400 CART_EMPTY
4. 庫存不足檢查（批次，列出所有不足的商品名稱）
5. 計算 `total_amount`
6. 在一個 SQLite transaction 中：
   - INSERT orders（`order_no` 格式：`ORD-YYYYMMDD-XXXXX`）
   - INSERT order_items（快照 `product_name`、`product_price`）
   - UPDATE products stock（`stock = stock - quantity`）
   - DELETE cart_items WHERE user_id = ?

**訂單號格式：** `ORD-` + `YYYYMMDD` + `-` + UUID v4 前 5 字元（大寫）

**Request Body：**
```json
{
  "recipientName": "string（必填）",
  "recipientEmail": "string email format（必填）",
  "recipientAddress": "string（必填）"
}
```

**錯誤碼：**

| 狀態 | error | 情境 |
|------|-------|------|
| 400 | `VALIDATION_ERROR` | 收件人欄位缺失或 Email 格式錯誤 |
| 400 | `CART_EMPTY` | 購物車為空 |
| 400 | `STOCK_INSUFFICIENT` | 含不足商品名稱清單 |
| 401 | `UNAUTHORIZED` | 未登入 |

---

### 4.2 GET /api/orders — 我的訂單列表

- 僅回傳當前使用者的訂單（WHERE user_id = ?）
- 按 `created_at DESC` 排序
- 不含 order_items

---

### 4.3 GET /api/orders/:id — 訂單詳情

- 查詢條件：`id = ? AND user_id = ?`（防止跨用戶存取）
- 回傳完整 order 欄位 + `items` 陣列（含 product_id, product_name, product_price, quantity）

---

### 4.4 PATCH /api/orders/:id/pay — 模擬付款

**業務邏輯：**
- Request body 必須包含 `action: "success" | "fail"`
- 僅 `status === 'pending'` 的訂單可付款（其他狀態 → 400 INVALID_STATUS）
- `action: "success"` → status 更新為 `'paid'`
- `action: "fail"` → status 更新為 `'failed'`
- 狀態為單向不可逆（paid/failed 不能再改）
- 回傳更新後的完整訂單（含 items）

**錯誤碼：**

| 狀態 | error | 情境 |
|------|-------|------|
| 400 | `VALIDATION_ERROR` | action 不是 success 或 fail |
| 400 | `INVALID_STATUS` | 訂單非 pending 狀態 |
| 404 | `NOT_FOUND` | 訂單不存在（或不屬於當前使用者） |

---

## 5. 後台商品管理

所有後台路由需要 JWT + admin role（`authMiddleware` → `adminMiddleware`）。

### 5.1 GET /api/admin/products — 商品列表

- 同前台商品列表，支援分頁（`page`, `limit`）

### 5.2 POST /api/admin/products — 新增商品

**必填欄位：** `name`（string）、`price`（integer > 0）、`stock`（integer >= 0）

**選填欄位：** `description`（string）、`image_url`（string）

**驗證：**
- `name` 必填
- `price` 必須為正整數（型別嚴格：`Number.isInteger(price) && price > 0`）
- `stock` 必須為非負整數（型別嚴格：`Number.isInteger(stock) && stock >= 0`）

### 5.3 PUT /api/admin/products/:id — 更新商品

- 所有欄位皆選填，只更新有傳入的欄位（merge 邏輯）
- 若 `name` 有傳入但為空字串 → 400
- 若 `price` 有傳入需符合正整數規則
- 若 `stock` 有傳入需符合非負整數規則
- 更新成功後 `updated_at` 設為當前時間

### 5.4 DELETE /api/admin/products/:id — 刪除商品

**保護規則：** 若該商品有任何 `status = 'pending'` 的訂單項目，拒絕刪除（409 CONFLICT）。

已完成（paid/failed）的訂單不會阻止刪除。

---

## 6. 後台訂單管理

### 6.1 GET /api/admin/orders — 訂單列表

- 支援分頁（`page`, `limit`）
- 支援狀態篩選：`?status=pending|paid|failed`（無效 status 值直接忽略，回傳全部）
- 回傳所有用戶的訂單

### 6.2 GET /api/admin/orders/:id — 訂單詳情

- 可存取任意用戶的訂單（無 user_id 過濾）
- 額外附上 `user: { name, email }`（若使用者被刪則為 null）
- 回傳完整 order + items + user

---

## 7. 前台頁面（SSR）

所有頁面使用兩步 render 模式：
1. 先 render page partial → body 字串
2. 再 render layout，將 body 注入

| 路徑 | Layout | pageScript |
|------|--------|-----------|
| `/` | front | `index` |
| `/products/:id` | front | `product-detail` |
| `/cart` | front | `cart` |
| `/checkout` | front | `checkout` |
| `/login` | front | `login` |
| `/orders` | front | `orders` |
| `/orders/:id` | front | `order-detail`（附 `orderId`, `paymentResult`） |
| `/admin/products` | admin | `admin-products` |
| `/admin/orders` | admin | `admin-orders` |

`pageScript` 局部變數讓 layout 動態載入對應的頁面 JS 檔案。
