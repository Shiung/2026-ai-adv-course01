# 功能清單

---

## 功能狀態總覽

| 功能模組 | 狀態 | API 前綴 |
|---|---|---|
| 認證系統（註冊 / 登入 / 個人資料） | ✅ 完成 | `/api/auth` |
| 商品瀏覽（列表 / 詳情） | ✅ 完成 | `/api/products` |
| 購物車（訪客 + 會員雙模式） | ✅ 完成 | `/api/cart` |
| 訂單流程（建立 / 查詢 / 模擬付款） | ✅ 完成 | `/api/orders` |
| 後台商品管理（CRUD） | ✅ 完成 | `/api/admin/products` |
| 後台訂單管理（查詢 / 篩選） | ✅ 完成 | `/api/admin/orders` |
| 前台頁面（SSR EJS） | ✅ 完成 | 頁面路由 |
| 後台頁面（SSR EJS） | ✅ 完成 | `/admin/*` |

---

## 認證系統

### 端點

| 方法 | 路徑 | 認證 |
|---|---|---|
| POST | `/api/auth/register` | 無 |
| POST | `/api/auth/login` | 無 |
| GET | `/api/auth/profile` | JWT |

### 行為描述

**POST /api/auth/register**

Request body 必填欄位：`email`（字串，Email 格式）、`password`（字串，最少 6 字元）、`name`（字串）。

驗證流程：
1. 三個欄位任一缺失 → 400 `VALIDATION_ERROR`
2. Email 格式不符（正規表示式 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`） → 400 `VALIDATION_ERROR`
3. password 長度 < 6 → 400 `VALIDATION_ERROR`
4. Email 已存在 → 409 `CONFLICT`

成功：bcrypt 雜湊 password（saltRounds = 10），INSERT 新用戶（role 固定為 `'user'`），簽發 7 天 JWT，回 201。  
Response data 包含：`user`（id / email / name / role）與 `token`。

**POST /api/auth/login**

Request body 必填：`email`、`password`。  
用 `bcrypt.compareSync` 比對密碼；Email 不存在或密碼錯誤均回 401 `UNAUTHORIZED`（不區分原因，防止帳號枚舉）。  
成功：回 200，data 包含 `user`（id / email / name / role）與 `token`。

**GET /api/auth/profile**

需 `Authorization: Bearer <token>`，透過 authMiddleware 驗證後查詢 DB。  
若 token 有效但 userId 在 DB 不存在（已刪除帳號）→ 404。  
Response data 包含：`id`、`email`、`name`、`role`、`created_at`。

---

## 商品瀏覽

### 端點

| 方法 | 路徑 | 認證 |
|---|---|---|
| GET | `/api/products` | 無 |
| GET | `/api/products/:id` | 無 |

### 行為描述

**GET /api/products**

查詢參數：

| 參數 | 型別 | 預設值 | 限制 |
|---|---|---|---|
| `page` | integer | 1 | 最小值 1（`Math.max(1, ...)`） |
| `limit` | integer | 10 | 最小值 1，最大值 100（`Math.min(100, ...)`） |

商品依 `created_at DESC` 排序。Response data 包含：
- `products`：陣列，每筆含 id / name / description / price / stock / image_url / created_at / updated_at
- `pagination`：`{ total, page, limit, totalPages }`

**GET /api/products/:id**

若商品不存在 → 404 `NOT_FOUND`。  
Response data 為單一商品物件（欄位同上）。

---

## 購物車（雙模式認證）

### 端點

| 方法 | 路徑 | 認證 |
|---|---|---|
| GET | `/api/cart` | JWT 或 X-Session-Id |
| POST | `/api/cart` | JWT 或 X-Session-Id |
| PATCH | `/api/cart/:itemId` | JWT 或 X-Session-Id |
| DELETE | `/api/cart/:itemId` | JWT 或 X-Session-Id |

### 雙模式認證機制（重要）

購物車路由使用自訂 `dualAuth` middleware，**不使用** authMiddleware。判斷邏輯：
- 帶有 `Authorization: Bearer` header 且 JWT 有效 → 會員模式（`WHERE user_id = userId`）
- 帶有 `Authorization: Bearer` header 但 JWT 無效 → **直接 401**，不 fallback
- 無 Authorization header，有 `X-Session-Id` → 訪客模式（`WHERE session_id = sessionId`）
- 兩者皆無 → 401

X-Session-Id 由前端產生並儲存於 localStorage（通常為 UUID），每個訪客瀏覽器有唯一 ID。

### 行為描述

**GET /api/cart**

Response data：
```json
{
  "items": [
    {
      "id": "cart-item-uuid",
      "product_id": "product-uuid",
      "quantity": 2,
      "product": {
        "name": "粉色玫瑰花束",
        "price": 1680,
        "stock": 28,
        "image_url": "https://..."
      }
    }
  ],
  "total": 3360
}
```
`total` 為 server 端即時計算（`sum(price * quantity)`），不存入資料庫。

**POST /api/cart**

Request body 必填：`productId`（字串）；選填：`quantity`（正整數，預設 1）。

業務邏輯（**購物車累加機制**）：
1. 驗證 productId 與 quantity
2. 查詢商品是否存在 → 不存在回 404
3. 查詢購物車中是否已有該商品：
   - **已有**：新數量 = 現有數量 + 加入數量；若新數量 > 庫存 → 400 `STOCK_INSUFFICIENT`；否則 UPDATE
   - **未有**：若 quantity > 庫存 → 400 `STOCK_INSUFFICIENT`；否則 INSERT

Response data：`{ id, product_id, quantity }`（最終數量）。

**PATCH /api/cart/:itemId**

Request body 必填：`quantity`（正整數）。  
設定為**目標數量**（非增量），直接覆蓋原有數量。  
若 quantity > 商品庫存 → 400 `STOCK_INSUFFICIENT`。  
若 itemId 不屬於當前用戶/session → 404 `NOT_FOUND`。

**DELETE /api/cart/:itemId**

若 itemId 不屬於當前用戶/session → 404。  
成功回 200，data 為 null。

---

## 訂單流程

### 端點

| 方法 | 路徑 | 認證 |
|---|---|---|
| POST | `/api/orders` | JWT |
| GET | `/api/orders` | JWT |
| GET | `/api/orders/:id` | JWT |
| PATCH | `/api/orders/:id/pay` | JWT |

### 行為描述

**POST /api/orders**

Request body 必填：`recipientName`、`recipientEmail`（Email 格式）、`recipientAddress`。

**Transaction 細節**（四步驟原子操作）：
1. INSERT INTO orders（快照 total_amount）
2. for each 購物車商品：INSERT INTO order_items（快照 product_name、product_price）
3. for each 購物車商品：`UPDATE products SET stock = stock - quantity`
4. `DELETE FROM cart_items WHERE user_id = userId`（清空整個用戶購物車）

前置檢查（transaction 外）：
- 購物車為空 → 400 `CART_EMPTY`
- 任一商品庫存不足 → 400 `STOCK_INSUFFICIENT`（訊息中列出所有超量商品名稱）

訂單編號格式：`ORD-YYYYMMDD-XXXXX`（日期 + UUID 前 5 碼大寫）

Response data：`{ id, order_no, total_amount, status, items: [...], created_at }`  
初始 status 固定為 `'pending'`。

**GET /api/orders**

回傳**當前用戶**的所有訂單（`WHERE user_id = userId`），依 `created_at DESC` 排序。  
Response data：`{ orders: [{ id, order_no, total_amount, status, created_at }] }`（不含 items）。

**GET /api/orders/:id**

若訂單不存在**或不屬於當前用戶**（`WHERE id = ? AND user_id = ?`） → 404（隱藏他人訂單存在性）。  
Response data 包含完整訂單資訊與 items 陣列。

**PATCH /api/orders/:id/pay**

Request body 必填：`action`（`'success'` 或 `'fail'`）。  
限制：訂單必須屬於當前用戶且 status 為 `'pending'`，否則 400 `INVALID_STATUS`。  
`action` 對應 status：`success → 'paid'`，`fail → 'failed'`。  
Response data 包含更新後的完整訂單與 items。

此為模擬付款，實際金流（如 ECPay）尚未整合（`.env.example` 中有 ECPAY_* 變數預留）。

---

## 後台商品管理

### 端點

| 方法 | 路徑 | 認證 |
|---|---|---|
| GET | `/api/admin/products` | JWT + admin |
| POST | `/api/admin/products` | JWT + admin |
| PUT | `/api/admin/products/:id` | JWT + admin |
| DELETE | `/api/admin/products/:id` | JWT + admin |

### 行為描述

整個 router 層級套用 `authMiddleware` + `adminMiddleware`，任何非 admin 請求均在 middleware 層被攔截。

**GET /api/admin/products**

與公開 `/api/products` 資料完全相同，但需 admin 權限。查詢參數：`page`（預設 1）、`limit`（預設 10，最大 100）。

**POST /api/admin/products**

Request body：
- 必填：`name`（字串）、`price`（正整數）、`stock`（非負整數 >= 0）
- 選填：`description`（字串）、`image_url`（字串）

**PUT /api/admin/products/:id**

Partial update：只需傳入要修改的欄位，未傳入欄位保持原值。  
若商品不存在 → 404。  
同時更新 `updated_at = datetime('now')`。

**DELETE /api/admin/products/:id**

刪除保護邏輯：
```sql
SELECT COUNT(*) FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE oi.product_id = ? AND o.status = 'pending'
```
若 count > 0 → 409 `CONFLICT`（必須等訂單完成或失敗才可刪除）。  
已成功下單（paid/failed）的訂單不受影響，因為 order_items 已快照商品資訊。

---

## 後台訂單管理

### 端點

| 方法 | 路徑 | 認證 |
|---|---|---|
| GET | `/api/admin/orders` | JWT + admin |
| GET | `/api/admin/orders/:id` | JWT + admin |

### 行為描述

**GET /api/admin/orders**

查詢參數：

| 參數 | 型別 | 預設值 | 說明 |
|---|---|---|---|
| `page` | integer | 1 | 頁碼 |
| `limit` | integer | 10 | 每頁筆數（最大 100） |
| `status` | string | （無，回傳全部） | 篩選值：`pending` / `paid` / `failed` |

status 篩選透過動態 SQL WHERE 子句實現；無效的 status 值會被忽略（不傳 WHERE 條件）。  
依 `created_at DESC` 排序。

**GET /api/admin/orders/:id**

可查看全站任何訂單（不限用戶）。  
Response data 額外包含：
```json
{
  "user": { "name": "下單用戶名稱", "email": "user@example.com" }
}
```
若用戶已被刪除，`user` 為 `null`（不會報錯）。
