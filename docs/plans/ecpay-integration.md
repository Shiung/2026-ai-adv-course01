# ECPay 綠界金流串接計畫

## Context

花藝電商後台現有商品 → 購物車 → 結帳流程，但付款目前是 mock（兩顆「付款成功/失敗」模擬按鈕）。  
目標：串接 ECPay AIO 金流，讓用戶真正透過綠界信用卡頁面付款。  

**本地開發限制**：localhost 無法接收 ECPay 的 Server Notify（ReturnURL），  
因此付款確認改為：用戶付完款後由前端主動呼叫 `QueryTradeInfo` API 查詢結果，再更新訂單狀態。

---

## 整體流程

```
1. 用戶在 /orders/:id 點「前往 ECPay 付款」
2. 前端 GET /api/orders/:id/ecpay-form → 後端回傳 AIO 表單參數
3. 前端動態建立 <form> auto-submit → 跳轉 ECPay 付款頁
4. 用戶在 ECPay 完成付款
5. ECPay 重導向至 OrderResultURL: /orders/:id?payment=ecpay
6. 前端偵測 ?payment=ecpay → 自動 POST /api/orders/:id/verify-payment
7. 後端呼叫 ECPay QueryTradeInfo → RtnCode=1 則更新 status='paid'
8. 前端顯示付款成功/失敗訊息
```

---

## 環境設定

`.env` 已含所需設定（無需新增）：
```
ECPAY_MERCHANT_ID=3002607
ECPAY_HASH_KEY=pwFHCqoQZGmho4w6
ECPAY_HASH_IV=EkRm7iFT261dpevs
ECPAY_ENV=staging
BASE_URL=http://localhost:3001
```

Node.js 22.20.0 原生支援 `fetch`，無需安裝額外 HTTP 套件。

測試信用卡：`4311-9522-2222-2222`，CVV `222`，3DS 驗證碼 `1234`

---

## Step 1：資料庫新增欄位

**檔案：`src/database.js`**

在 `initializeDatabase()` 末尾加入 migration helper，為 `orders` 表新增 3 個欄位：

```javascript
function addColumnIfNotExists(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.find(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// 在 initializeDatabase() 末尾呼叫：
addColumnIfNotExists('orders', 'ecpay_trade_no', 'TEXT');
addColumnIfNotExists('orders', 'payment_method', 'TEXT');
addColumnIfNotExists('orders', 'paid_at', 'TEXT');
```

> `merchant_trade_no` 由 `orderId.replace(/-/g,'').substring(0,16).toUpperCase()` 動態產生，不需儲存。

---

## Step 2：建立 ECPay 工具模組

**新檔案：`src/utils/ecpay.js`**

包含三個功能（從 ECPay skill guides/13-checkmacvalue.md 的 Node.js 實作精確移植）：

### `ecpayUrlEncode(source)`
- `encodeURIComponent` + 空格→`+` + `~`→`%7e` + `'`→`%27`
- `.toLowerCase()` 
- 7 個 .NET 替換（`%2d`→`-` 等）

### `generateCheckMacValue(params, hashKey, hashIv)`
- 移除 CheckMacValue → 不分大小寫排序 keys → 組合 `HashKey=...&k=v&...&HashIV=...`
- `ecpayUrlEncode` → SHA256 → 大寫

### `verifyCheckMacValue(params, hashKey, hashIv)` 
- 使用 `crypto.timingSafeEqual`（長度不同直接 return false）

### `buildAIOParams(order, items, baseUrl)`
產生 ECPay AIO 表單所需參數（含 CheckMacValue）：

| 參數 | 值 |
|------|-----|
| MerchantID | `process.env.ECPAY_MERCHANT_ID` |
| MerchantTradeNo | `orderId.replace(/-/g,'').substring(0,16).toUpperCase()` |
| MerchantTradeDate | `yyyy/MM/dd HH:mm:ss` 格式 |
| PaymentType | `aio` |
| TotalAmount | `order.total_amount` |
| TradeDesc | `花藝電商訂單` |
| ItemName | items 以 `#` 連接（截斷至 200 字元）|
| ReturnURL | `${baseUrl}/api/ecpay/return`（Server Notify，localhost 不會收到但必填）|
| ChoosePayment | `Credit` |
| EncryptType | `1` |
| OrderResultURL | `${baseUrl}/orders/${order.id}?payment=ecpay` |

回傳 `{ params, actionUrl }` 其中 `actionUrl = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckout/V5'`

### `queryTradeInfo(merchantTradeNo)` (async)
POST 到 `https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5`：
- 參數：`MerchantID`, `MerchantTradeNo`, `TimeStamp`（Unix timestamp）+ `CheckMacValue`
- 解析 URL-encoded 回應 → 驗證回應的 CheckMacValue
- 回傳解析後的 object（`{ RtnCode, RtnMsg, TradeNo, PaymentType, ... }`）

---

## Step 3：ECPay Callback 路由

**新檔案：`src/routes/ecpayRoutes.js`**

```javascript
router.post('/return', (req, res) => {
  res.type('text/plain').send('1|OK');
});
```

只有一個端點，回應 ECPay Server Notify 格式。  
（本地開發不會真的收到，但 ECPay 要求 ReturnURL 必填且必須存在）

**`app.js` 新增一行**（在 `/api/orders` 之前）：
```javascript
app.use('/api/ecpay', require('./src/routes/ecpayRoutes'));
```

---

## Step 4：新增 Order 路由

**檔案：`src/routes/orderRoutes.js`**

### `GET /api/orders/:id/ecpay-form`

```
1. 驗證 order 存在且屬於當前 user
2. 確認 status === 'pending'（已付款的訂單不重複付）
3. 取 order_items
4. 呼叫 buildAIOParams(order, items, baseUrl)
5. 回傳 { data: { params, actionUrl }, error: null, message: '成功' }
```

### `POST /api/orders/:id/verify-payment` (async)

```
1. 驗證 order 存在且屬於當前 user
2. 若 status === 'paid'，直接回傳 { status: 'paid' }（冪等）
3. 產生 merchantTradeNo（從 order.id 派生）
4. 呼叫 queryTradeInfo(merchantTradeNo)
5. 若 RtnCode === '1'：
   - UPDATE orders SET status='paid', ecpay_trade_no=?, payment_method=?, paid_at=datetime('now')
   - 回傳 { data: { status: 'paid' }, ... }
6. 否則回傳 { data: { status: 'pending', rtnCode, rtnMsg }, ... }
7. catch：500 ECPAY_QUERY_ERROR
```

兩個端點都加 `@openapi` JSDoc，並在完成後執行 `npm run openapi`。

---

## Step 5：更新前端 order-detail

### `views/pages/order-detail.ejs`

**付款按鈕區塊改為**（取代原本的兩顆 mock 按鈕）：

```html
<!-- 待付款：顯示 ECPay 按鈕 -->
<div v-if="order.status === 'pending' && !verifying" class="flex gap-4">
  <button
    @click="goToEcpay"
    :disabled="paying"
    class="bg-rose-primary text-white px-8 py-3 rounded-full text-sm font-medium
           hover:bg-rose-dark transition-colors disabled:opacity-50"
  >
    {{ paying ? '跳轉付款中...' : '前往 ECPay 付款' }}
  </button>
</div>

<!-- 驗證中 spinner -->
<div v-if="verifying" class="flex items-center gap-2 text-sm text-text-secondary mt-4">
  <div class="w-4 h-4 border-2 border-rose-primary border-t-transparent rounded-full animate-spin"></div>
  <span>正在驗證付款結果...</span>
</div>
```

### `public/js/pages/order-detail.js`

新增狀態：`const verifying = ref(false);`

**新增 paymentMessages 條目**：
```javascript
ecpay:         { text: '正在確認付款結果...', cls: 'bg-blue-50 text-blue-600 border border-blue-100' },
ecpay_success: { text: '付款成功！感謝您的購買。', cls: 'bg-sage/10 text-sage border border-sage/20' },
ecpay_pending: { text: '付款尚未完成，如已付款請稍後重試。', cls: 'bg-apricot/10 text-apricot border border-apricot/20' },
ecpay_failed:  { text: '無法確認付款狀態，請聯繫客服。', cls: 'bg-red-50 text-red-600 border border-red-100' },
```

**新增 `goToEcpay()`**：
1. `paying.value = true`
2. `GET /api/orders/:id/ecpay-form`
3. 動態建立 `<form method="POST" action=actionUrl>`，填入所有 params 作 hidden inputs
4. `document.body.appendChild(form); form.submit()`
5. catch → `Notification.show` + `paying.value = false`

**新增 `verifyPayment()`**：
1. `verifying.value = true`
2. `POST /api/orders/:id/verify-payment`
3. `res.data.status === 'paid'` → `order.value.status = 'paid'`，`paymentResult.value = 'ecpay_success'`
4. 否則 → `paymentResult.value = 'ecpay_pending'`
5. catch → `paymentResult.value = 'ecpay_failed'`
6. `verifying.value = false`

**`onMounted` 末尾**：
```javascript
if (paymentResult.value === 'ecpay') {
  await verifyPayment();
}
```

**移除**：`handlePaySuccess`、`handlePayFail`、`simulatePay`（mock 函式）  
**return** 新增：`verifying`, `goToEcpay`

---

## 關鍵檔案清單

| 動作 | 檔案路徑 |
|------|----------|
| 修改 | `src/database.js` |
| 新增 | `src/utils/ecpay.js` |
| 新增 | `src/routes/ecpayRoutes.js` |
| 修改 | `src/routes/orderRoutes.js` |
| 修改 | `app.js` |
| 修改 | `views/pages/order-detail.ejs` |
| 修改 | `public/js/pages/order-detail.js` |

---

## 驗證方式

1. `npm run dev:server` 啟動伺服器（port 3001）
2. 登入 → 加入商品到購物車 → 結帳 → 建立訂單
3. 訂單詳情頁出現「前往 ECPay 付款」按鈕
4. 點擊 → 跳轉至 ECPay staging 付款頁
5. 使用測試卡 `4311-9522-2222-2222` / CVV `222` / 3DS `1234` 付款
6. 付款完成後自動導回訂單頁，出現「正在驗證付款結果...」
7. 驗證完成後顯示「付款成功！感謝您的購買。」
8. 訂單狀態 badge 變為「已付款」
9. 檢查 SQLite：`ecpay_trade_no`, `payment_method`, `paid_at` 欄位有值
