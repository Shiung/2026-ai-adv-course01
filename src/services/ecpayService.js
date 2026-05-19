const crypto = require('crypto');

const STAGING_AIO_URL = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
const PRODUCTION_AIO_URL = 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5';
const STAGING_QUERY_URL = 'https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5';
const PRODUCTION_QUERY_URL = 'https://payment.ecpay.com.tw/Cashier/QueryTradeInfo/V5';

function getConfig() {
  return {
    merchantId: process.env.ECPAY_MERCHANT_ID,
    hashKey: process.env.ECPAY_HASH_KEY,
    hashIv: process.env.ECPAY_HASH_IV,
    isStaging: (process.env.ECPAY_ENV || 'staging') !== 'production',
  };
}

// Node.js implementation of ECPay's URL encode (CMV variant)
function ecpayUrlEncode(source) {
  let s = encodeURIComponent(source)
    .replace(/%20/g, '+')
    .replace(/~/g, '%7e')
    .replace(/'/g, '%27');
  s = s.toLowerCase();
  const map = { '%2d': '-', '%5f': '_', '%2e': '.', '%21': '!', '%2a': '*', '%28': '(', '%29': ')' };
  for (const [k, v] of Object.entries(map)) {
    s = s.split(k).join(v);
  }
  return s;
}

function generateCheckMacValue(params, hashKey, hashIv) {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([k]) => k !== 'CheckMacValue')
  );
  const sorted = Object.keys(filtered)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const paramStr = sorted.map(k => `${k}=${filtered[k]}`).join('&');
  const raw = `HashKey=${hashKey}&${paramStr}&HashIV=${hashIv}`;
  const encoded = ecpayUrlEncode(raw);
  return crypto.createHash('sha256').update(encoded, 'utf8').digest('hex').toUpperCase();
}

function verifyCheckMacValue(params, hashKey, hashIv) {
  const received = params.CheckMacValue || '';
  const calculated = generateCheckMacValue(params, hashKey, hashIv);
  const a = Buffer.from(received);
  const b = Buffer.from(calculated);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Returns Taiwan time (UTC+8) formatted as yyyy/MM/dd HH:mm:ss
function getMerchantTradeDate() {
  return new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).replace(/-/g, '/');
}

// Safely truncate ItemName to 400 bytes (UTF-8 safe)
function truncateItemName(name) {
  const buf = Buffer.from(name, 'utf8');
  if (buf.length <= 400) return name;
  return buf.slice(0, 400).toString('utf8').replace(/�$/, '');
}

function buildAioParams(order, orderItems, baseUrl) {
  const { merchantId, hashKey, hashIv, isStaging } = getConfig();
  const merchantTradeNo = order.order_no.replace(/-/g, '');

  const itemName = truncateItemName(
    orderItems.map(i => `${i.product_name} x${i.quantity}`).join('#')
  );

  const params = {
    MerchantID: merchantId,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: getMerchantTradeDate(),
    PaymentType: 'aio',
    TotalAmount: String(order.total_amount),
    TradeDesc: '花卉電商訂單',
    ItemName: itemName,
    ReturnURL: `${baseUrl}/api/ecpay/notify`,
    OrderResultURL: `${baseUrl}/api/ecpay/return`,
    ClientBackURL: `${baseUrl}/orders/${order.id}?payment=cancel`,
    ChoosePayment: 'ALL',
    EncryptType: '1',
  };

  params.CheckMacValue = generateCheckMacValue(params, hashKey, hashIv);

  return {
    url: isStaging ? STAGING_AIO_URL : PRODUCTION_AIO_URL,
    params,
  };
}

async function queryTradeInfo(merchantTradeNo) {
  const { merchantId, hashKey, hashIv, isStaging } = getConfig();
  const url = isStaging ? STAGING_QUERY_URL : PRODUCTION_QUERY_URL;

  const timestamp = Math.floor(Date.now() / 1000);
  const queryParams = {
    MerchantID: merchantId,
    MerchantTradeNo: merchantTradeNo,
    TimeStamp: String(timestamp),
  };
  queryParams.CheckMacValue = generateCheckMacValue(queryParams, hashKey, hashIv);

  const body = new URLSearchParams(queryParams).toString();

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await response.text();
  const result = Object.fromEntries(new URLSearchParams(text));

  if (!verifyCheckMacValue(result, hashKey, hashIv)) {
    throw new Error('QueryTradeInfo CheckMacValue 驗證失敗');
  }

  return result;
}

module.exports = {
  generateCheckMacValue,
  verifyCheckMacValue,
  buildAioParams,
  queryTradeInfo,
};
