// ============================================
// PAYMENT PAGE - VietQR Banking
// ============================================

import { getOrderById, updateOrder, deleteOrder } from './firebase.js';

// Cấu hình VietQR — đổi BANK_ID theo ngân hàng thực tế: tcb, vietcombank, mb, tpbank, viettinbank, ...
const VIETQR_CONFIG = {
  BANK_ID: 'tcb',
  ACCOUNT_NO: '6666688888',
  ACCOUNT_NAME: 'NOLITA PIZZA',
  BANK_DISPLAY_NAME: 'Techcombank (TCB)',
  TEMPLATE: 'compact2'
};

/**
 * Tạo URL ảnh QR VietQR (dùng API img.vietqr.io).
 * @param {number} amount - Số tiền (VND)
 * @param {string} addInfo - Nội dung chuyển khoản (mã đơn hàng, tối đa ~25-50 ký tự)
 * @param {string} accountName - Tên chủ tài khoản
 * @returns {string} URL ảnh QR
 */
function buildVietQrImageUrl(amount, addInfo, accountName) {
  const base = 'https://img.vietqr.io/image';
  const path = `${VIETQR_CONFIG.BANK_ID}-${VIETQR_CONFIG.ACCOUNT_NO}-${VIETQR_CONFIG.TEMPLATE}.png`;
  const params = new URLSearchParams();
  if (amount != null && amount > 0) {
    params.set('amount', String(Math.round(amount)));
  }
  if (addInfo && addInfo.trim()) {
    params.set('addInfo', addInfo.trim().substring(0, 50));
  }
  if (accountName && accountName.trim()) {
    params.set('accountName', accountName.trim());
  }
  const query = params.toString();
  return query ? `${base}/${path}?${query}` : `${base}/${path}`;
}

function formatMoney(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function show(el) {
  if (el) el.style.display = '';
}
function hide(el) {
  if (el) el.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', async function () {
  const loadingEl = document.getElementById('paymentLoading');
  const errorEl = document.getElementById('paymentError');
  const errorMsgEl = document.getElementById('paymentErrorMessage');
  const cardEl = document.getElementById('paymentCard');
  const successEl = document.getElementById('paymentSuccess');

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order_id');

  if (!orderId) {
    hide(loadingEl);
    show(errorEl);
    if (errorMsgEl) errorMsgEl.textContent = 'Thiếu mã đơn hàng. Vui lòng đặt hàng từ trang Đặt món.';
    return;
  }

  try {
    const order = await getOrderById(orderId);
    if (!order) {
      hide(loadingEl);
      show(errorEl);
      if (errorMsgEl) errorMsgEl.textContent = 'Không tìm thấy đơn hàng. Kiểm tra lại link hoặc liên hệ cửa hàng.';
      return;
    }

    const total = Number(order.total_price) || 0;
    const addInfo = orderId;

    const qrUrl = buildVietQrImageUrl(total, addInfo, VIETQR_CONFIG.ACCOUNT_NAME);

    document.getElementById('paymentAmount').textContent = formatMoney(total);
    document.getElementById('paymentOrderId').textContent = orderId;
    document.getElementById('paymentQrImage').src = qrUrl;
    document.getElementById('paymentBankName').textContent = VIETQR_CONFIG.BANK_DISPLAY_NAME || 'Ngân hàng';
    document.getElementById('paymentAccountNo').textContent = VIETQR_CONFIG.ACCOUNT_NO;
    document.getElementById('paymentAccountName').textContent = VIETQR_CONFIG.ACCOUNT_NAME;
    document.getElementById('paymentAmountCopy').textContent = formatMoney(total);
    document.getElementById('paymentAddInfo').textContent = addInfo;

    hide(loadingEl);
    show(cardEl);

    const btnDone = document.getElementById('paymentBtnDone');
    const btnCancel = document.getElementById('paymentBtnCancel');
    if (btnDone) {
      btnDone.addEventListener('click', async function () {
        btnDone.disabled = true;
        btnDone.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang ghi nhận...';
        try {
          await updateOrder(orderId, {
            payment_method: 'vietqr',
            payment_status: 'pending_confirm'
          });
          hide(cardEl);
          show(successEl);
        } catch (err) {
          console.error('updateOrder:', err);
          btnDone.disabled = false;
          btnDone.innerHTML = '<i class="fas fa-check-circle"></i> Tôi đã thanh toán';
          if (typeof window.showNotification === 'function') {
            window.showNotification('Không thể cập nhật. Thử lại sau.');
          }
        }
      });
    }
    if (btnCancel) {
      btnCancel.addEventListener('click', async function () {
        btnCancel.disabled = true;
        btnCancel.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang hủy...';
        try {
          await deleteOrder(orderId);
          window.location.href = 'order.html';
        } catch (err) {
          console.error('Hủy giao dịch:', err);
          btnCancel.disabled = false;
          btnCancel.innerHTML = '<i class="fas fa-times-circle"></i> Hủy giao dịch';
          if (typeof window.showNotification === 'function') {
            window.showNotification('Không thể hủy giao dịch. Thử lại sau.');
          } else {
            alert('Không thể hủy giao dịch. Thử lại sau.');
          }
        }
      });
    }
  } catch (err) {
    console.error('Payment page load:', err);
    hide(loadingEl);
    show(errorEl);
    if (errorMsgEl) errorMsgEl.textContent = err.message || 'Lỗi tải thông tin thanh toán.';
  }
});
