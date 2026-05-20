const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const el = document.getElementById('app');
    const orderId = el.dataset.orderId;
    const paymentResult = ref(el.dataset.paymentResult || null);

    const order = ref(null);
    const loading = ref(true);
    const paying = ref(false);
    const verifying = ref(false);

    const statusMap = {
      pending: { label: '待付款', cls: 'bg-apricot/20 text-apricot' },
      paid: { label: '已付款', cls: 'bg-sage/20 text-sage' },
      failed: { label: '付款失敗', cls: 'bg-red-100 text-red-600' },
    };

    const paymentMessages = {
      success: { text: '付款成功！感謝您的購買。', cls: 'bg-sage/10 text-sage border border-sage/20' },
      failed: { text: '付款失敗，請重試。', cls: 'bg-red-50 text-red-600 border border-red-100' },
      cancel: { text: '付款已取消。', cls: 'bg-apricot/10 text-apricot border border-apricot/20' },
      ecpay:         { text: '正在確認付款結果...', cls: 'bg-blue-50 text-blue-600 border border-blue-100' },
      ecpay_success: { text: '付款成功！感謝您的購買。', cls: 'bg-sage/10 text-sage border border-sage/20' },
      ecpay_pending: { text: '付款尚未完成，如已付款請稍後重試。', cls: 'bg-apricot/10 text-apricot border border-apricot/20' },
      ecpay_failed:  { text: '無法確認付款狀態，請聯繫客服。', cls: 'bg-red-50 text-red-600 border border-red-100' },
    };

    async function goToEcpay() {
      if (!order.value || paying.value) return;
      paying.value = true;
      try {
        const res = await apiFetch('/api/orders/' + order.value.id + '/ecpay-form');
        const { params, actionUrl } = res.data;

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = actionUrl;

        for (const [key, value] of Object.entries(params)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
      } catch (e) {
        Notification.show('無法跳轉付款頁，請重試', 'error');
        paying.value = false;
      }
    }

    async function verifyPayment() {
      verifying.value = true;
      try {
        const res = await apiFetch('/api/orders/' + orderId + '/verify-payment', { method: 'POST' });
        if (res.data.status === 'paid') {
          order.value.status = 'paid';
          paymentResult.value = 'ecpay_success';
        } else {
          paymentResult.value = 'ecpay_pending';
        }
      } catch (e) {
        paymentResult.value = 'ecpay_failed';
      } finally {
        verifying.value = false;
      }
    }

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/orders/' + orderId);
        order.value = res.data;
      } catch (e) {
        Notification.show('載入訂單失敗', 'error');
      } finally {
        loading.value = false;
      }

      if (paymentResult.value === 'ecpay') {
        await verifyPayment();
      }
    });

    return { order, loading, paying, verifying, paymentResult, statusMap, paymentMessages, goToEcpay };
  }
}).mount('#app');
