const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware');
const { buildAioParams, verifyCheckMacValue, queryTradeInfo } = require('../services/ecpayService');

const router = express.Router();

function getBaseUrl(req) {
  return process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
}

// POST /api/ecpay/checkout
// Auth required. Returns AIO form URL + params for frontend to submit.
router.post('/checkout', authMiddleware, (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', message: '缺少 orderId' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(orderId, req.user.userId);
  if (!order) {
    return res.status(404).json({ data: null, error: 'NOT_FOUND', message: '訂單不存在' });
  }
  if (order.status !== 'pending') {
    return res.status(400).json({ data: null, error: 'INVALID_STATUS', message: '訂單狀態不是 pending' });
  }

  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const baseUrl = getBaseUrl(req);
  const { url, params } = buildAioParams(order, orderItems, baseUrl);

  res.json({ data: { url, params }, error: null, message: '成功' });
});

// POST /api/ecpay/return (OrderResultURL)
// Called by user's browser after payment. Verifies via QueryTradeInfo and updates order status.
router.post('/return', async (req, res) => {
  const body = req.body;

  const { hashKey, hashIv } = {
    hashKey: process.env.ECPAY_HASH_KEY,
    hashIv: process.env.ECPAY_HASH_IV,
  };

  if (!verifyCheckMacValue(body, hashKey, hashIv)) {
    return res.redirect('/orders?payment=failed');
  }

  const merchantTradeNo = body.MerchantTradeNo;
  if (!merchantTradeNo) {
    return res.redirect('/orders?payment=failed');
  }

  const order = db.prepare("SELECT * FROM orders WHERE REPLACE(order_no, '-', '') = ?")
    .get(merchantTradeNo);
  if (!order) {
    return res.redirect('/orders?payment=failed');
  }

  // Already settled — just redirect
  if (order.status !== 'pending') {
    const result = order.status === 'paid' ? 'success' : 'failed';
    return res.redirect(`/orders/${order.id}?payment=${result}`);
  }

  try {
    const tradeInfo = await queryTradeInfo(merchantTradeNo);
    // TradeStatus '1' = paid
    const isPaid = tradeInfo.TradeStatus === '1';
    const newStatus = isPaid ? 'paid' : 'failed';
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(newStatus, order.id);
    return res.redirect(`/orders/${order.id}?payment=${isPaid ? 'success' : 'failed'}`);
  } catch {
    // QueryTradeInfo failed — fallback: trust the RtnCode from OrderResultURL
    const isPaid = String(body.RtnCode) === '1';
    const newStatus = isPaid ? 'paid' : 'failed';
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(newStatus, order.id);
    return res.redirect(`/orders/${order.id}?payment=${isPaid ? 'success' : 'failed'}`);
  }
});

// POST /api/ecpay/notify (ReturnURL — S2S, won't reach localhost but must respond)
router.post('/notify', (req, res) => {
  res.type('text').send('1|OK');
});

module.exports = router;
