const crypto = require('crypto');

function ecpayUrlEncode(source) {
  let encoded = encodeURIComponent(source)
    .replace(/%20/g, '+')
    .replace(/~/g, '%7e')
    .replace(/'/g, '%27');
  encoded = encoded.toLowerCase();
  const replacements = {
    '%2d': '-', '%5f': '_', '%2e': '.', '%21': '!',
    '%2a': '*', '%28': '(', '%29': ')',
  };
  for (const [old, char] of Object.entries(replacements)) {
    encoded = encoded.split(old).join(char);
  }
  return encoded;
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
  const hash = crypto.createHash('sha256').update(encoded, 'utf8').digest('hex');
  return hash.toUpperCase();
}

function verifyCheckMacValue(params, hashKey, hashIv) {
  const received = params.CheckMacValue || '';
  const calculated = generateCheckMacValue(params, hashKey, hashIv);
  const a = Buffer.from(received);
  const b = Buffer.from(calculated);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function buildAIOParams(order, items, baseUrl) {
  const hashKey = process.env.ECPAY_HASH_KEY;
  const hashIv = process.env.ECPAY_HASH_IV;
  const merchantId = process.env.ECPAY_MERCHANT_ID;

  const merchantTradeNo = order.id.replace(/-/g, '').substring(0, 16).toUpperCase();

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const merchantTradeDate =
    `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const itemName = items
    .map(i => `${i.product_name} x${i.quantity}`)
    .join('#')
    .substring(0, 200);

  const params = {
    MerchantID: merchantId,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: merchantTradeDate,
    PaymentType: 'aio',
    TotalAmount: String(order.total_amount),
    TradeDesc: '花藝電商訂單',
    ItemName: itemName,
    ReturnURL: `${baseUrl}/api/ecpay/return`,
    ChoosePayment: 'Credit',
    EncryptType: '1',
    OrderResultURL: `${baseUrl}/orders/${order.id}?payment=ecpay`,
  };

  params.CheckMacValue = generateCheckMacValue(params, hashKey, hashIv);

  const actionUrl = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckout/V5';
  return { params, actionUrl };
}

async function queryTradeInfo(merchantTradeNo) {
  const hashKey = process.env.ECPAY_HASH_KEY;
  const hashIv = process.env.ECPAY_HASH_IV;
  const merchantId = process.env.ECPAY_MERCHANT_ID;

  const timeStamp = String(Math.floor(Date.now() / 1000));

  const queryParams = {
    MerchantID: merchantId,
    MerchantTradeNo: merchantTradeNo,
    TimeStamp: timeStamp,
  };
  queryParams.CheckMacValue = generateCheckMacValue(queryParams, hashKey, hashIv);

  const body = new URLSearchParams(queryParams).toString();

  const response = await fetch('https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await response.text();
  const result = Object.fromEntries(new URLSearchParams(text));

  if (!verifyCheckMacValue(result, hashKey, hashIv)) {
    throw new Error('CheckMacValue verification failed');
  }

  return result;
}

module.exports = { ecpayUrlEncode, generateCheckMacValue, verifyCheckMacValue, buildAIOParams, queryTradeInfo };
