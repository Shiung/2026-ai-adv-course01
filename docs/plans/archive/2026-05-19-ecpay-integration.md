# ECPay 綠界金流串接計畫

## Context

專案目前的付款流程是模擬的（PATCH `/api/orders/:id/pay`，前端有「付款成功」/「付款失敗」按鈕）。
需串接綠界 AIO（全方位金流）真實付款，但專案僅運行於本機，ECPay 無法透過 ReturnURL S2S 回呼本機。
因此使用 **OrderResultURL**（由使用者瀏覽器回傳，可達本機）+ **主動 QueryTradeInfo** 查詢驗證作為付款確認架構。

---

## 採用架構：AIO + OrderResultURL + QueryTradeInfo

```
使用者 → [前往付款] → POST /api/ecpay/checkout
                  ↓ 回傳 form params (JSON)
前端 JS 自動提交表單 → ECPay 付款頁
                              ↓ 付款完成
                     ECPay 導回瀏覽器 → POST /api/ecpay/return (OrderResultURL)
                                         ↓ 驗 CheckMacValue + 呼叫 QueryTradeInfo
                                         ↓ 更新訂單狀態
                                         ↓ redirect /orders/:id?payment=success|failed
```

- **ReturnURL** (`/api/ecpay/notify`)：只回 `1|OK`，不更新 DB（本機收不到，但設定可防止 ECPay 報錯）
- **OrderResultURL** (`/api/ecpay/return`)：瀏覽器 form POST，可達本機，作為主要確認入口
- **ClientBackURL**：`/orders/:id?payment=cancel`，使用者在 ECPay 頁按取消

---

## MerchantTradeNo 策略

不改資料表結構。以 `order_no` 去除 `-` 產生：
- `ORD-20260519-AB12C` → `ORD20260519AB12C`（16 字元，純英數）✓
- 反查：`SELECT * FROM orders WHERE REPLACE(order_no, '-', '') = ?`

---

## 要新增的檔案

### 1. `src/services/ecpayService.js`

```
- ecpayUrlEncode(str)          — Node.js 版 ECPay URL encode
- generateCheckMacValue(params, key, iv)  — SHA256，key 不分大小寫排序
- verifyCheckMacValue(params, key, iv)    — timing-safe 比對
- getMerchantTradeDate()       — 回傳台灣時間 yyyy/MM/dd HH:mm:ss
- buildAioParams(order)        — 組出 AIO 表單欄位（含 CheckMacValue）
- queryTradeInfo(merchantTradeNo)  — fetch POST 至 ECPay QueryTradeInfo/V5，回傳解析後物件
```

關鍵常數（從 `process.env` 讀取）：
- `ECPAY_MERCHANT_ID`, `ECPAY_HASH_KEY`, `ECPAY_HASH_IV`, `ECPAY_ENV`（staging/production）

AIO 端點：
- 測試：`https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5`
- 正式：`https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5`

### 2. `src/routes/ecpayRoutes.js`

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/ecpay/checkout` | auth required；驗證訂單歸屬；呼叫 `buildAioParams`；回傳 `{ url, params }` |
| POST | `/api/ecpay/return` | OrderResultURL；無 auth；驗 CMV；呼叫 `queryTradeInfo`；更新 DB；redirect |
| POST | `/api/ecpay/notify` | ReturnURL；無 auth；直接回 text `1\|OK` |
| POST | `/api/orders/:id/verify-payment` | auth required；手動查詢付款狀態（備援按鈕） |

---

## 要修改的檔案

### 3. `app.js`

在 `/api/orders` 路由之後加一行：
```js
app.use('/api/ecpay', require('./src/routes/ecpayRoutes'));
```

並確保 `express.urlencoded({ extended: false })` 在 ecpay routes 之前（已存在）。

### 4. `views/pages/order-detail.ejs`

將 `<!-- Payment Buttons -->` div 改為：
- `status === 'pending'`：顯示「前往綠界付款」按鈕 + 「查詢付款狀態」備援按鈕
- 移除原本的「付款成功」/「付款失敗」模擬按鈕

### 5. `public/js/pages/order-detail.js`

- 新增 `goToPayment()`：POST `/api/ecpay/checkout`（帶 JWT header），取回 `{ url, params }`，動態建立 form 並 submit
- 新增 `verifyPayment()`：POST `/api/orders/${orderId}/verify-payment`，刷新訂單資料
- 移除 `simulatePay()`、`handlePaySuccess()`、`handlePayFail()`

---

## 關鍵實作細節

### CheckMacValue（Node.js）

```js
function ecpayUrlEncode(source) {
  let s = encodeURIComponent(source)
    .replace(/%20/g, '+')
    .replace(/~/g, '%7e')
    .replace(/'/g, '%27');
  s = s.toLowerCase();
  const map = { '%2d':'-','%5f':'_','%2e':'.','%21':'!','%2a':'*','%28':'(','%29':')' };
  for (const [k,v] of Object.entries(map)) s = s.split(k).join(v);
  return s;
}
```

### buildAioParams 關鍵欄位

```
MerchantID, MerchantTradeNo (order_no.replace(/-/g,'')),
MerchantTradeDate (UTC+8 yyyy/MM/dd HH:mm:ss), PaymentType='aio',
TotalAmount, TradeDesc='花卉電商訂單', ItemName (join items with '#'),
ReturnURL, OrderResultURL, ClientBackURL, EncryptType=1,
ChoosePayment='ALL'
```

- `ItemName` 需截斷至 400 字元（UTF-8 安全截斷，避免 CheckMacValue 不符）
- `TotalAmount` 為整數，已符合

### queryTradeInfo 回應解析

ECPay 回傳 URL-encoded 字串，`TradeStatus='1'` 表示已付款。
必須驗證回應的 CheckMacValue。

```js
const params = Object.fromEntries(new URLSearchParams(body));
// TradeStatus: '1' = paid, '0' = unpaid
```

---

## 驗證流程

1. `npm run dev:server` 啟動本機
2. 登入帳號，加入商品至購物車
3. 結帳 → 建立訂單 → 跳至訂單詳情頁
4. 點「前往綠界付款」→ 應跳至 ECPay 測試付款頁
5. 使用測試卡 `4311-9522-2222-2222`（安全碼 222，到期日任意未來日）完成付款
6. 3D 驗證碼輸入 `1234`
7. ECPay 導回 → 訂單詳情頁顯示「付款成功」綠色 banner，status 更新為 `paid`
8. 若 OrderResultURL 未觸達，點「查詢付款狀態」按鈕亦可手動驗證

---

## 不需要的變更

- 資料表結構不變（無需 migration）
- `PATCH /api/orders/:id/pay` 模擬端點不刪除（測試仍使用）
- 不新增任何套件（使用 Node.js 22 原生 `fetch` + `crypto`）
