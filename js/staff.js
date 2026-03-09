/**
 * Staff module:
 * - Kitchen: bếp (role = kitchen)
 * - Shipper: giao hàng (role = shipper)
 * Cùng dùng Firebase Auth + Database, custom modal + toast.
 */
import { auth, onAuthStateChanged, getUserProfile, getOrders, subscribeOrders, updateOrder, pushNotification, logout } from './firebase.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let currentUser = null;

function showToast(message, type = 'success') {
  const el = document.getElementById('kitchenToast');
  if (!el) return;
  el.textContent = message;
  el.className = 'kitchen-toast kitchen-toast--visible kitchen-toast--' + type;
  clearTimeout(showToast._tid);
  showToast._tid = setTimeout(() => el.classList.remove('kitchen-toast--visible'), 3000);
}

function openModal(title, bodyHtml, footerHtml) {
  const backdrop = document.getElementById('kitchenModalBackdrop');
  const titleEl = document.getElementById('kitchenModalTitle');
  const bodyEl = document.getElementById('kitchenModalBody');
  const footerEl = document.getElementById('kitchenModalFooter');
  if (!backdrop || !titleEl || !bodyEl || !footerEl) return;
  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  footerEl.innerHTML = footerHtml;
  backdrop.classList.add('kitchen-modal-backdrop--open');
  backdrop.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const backdrop = document.getElementById('kitchenModalBackdrop');
  if (backdrop) {
    backdrop.classList.remove('kitchen-modal-backdrop--open');
    backdrop.setAttribute('aria-hidden', 'true');
  }
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(n) {
  return new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + ' ₫';
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN');
}

function formatOrderItem(it) {
  const qty = it.quantity || 1;
  const name = it.product_name || it.name || 'Món';
  let html = `<div class="kitchen-card-item-row"><span class="kitchen-item-name">${escapeHtml(name)} × ${qty}</span>`;
  if (it.size) html += `<span class="kitchen-item-size">Size: ${escapeHtml(String(it.size))}</span>`;
  html += '</div>';
  const addons = Array.isArray(it.addons) ? it.addons : (it.addon && Array.isArray(it.addon) ? it.addon : []);
  if (addons.length > 0) {
    html += '<div class="kitchen-item-addons">';
    addons.forEach((ad) => {
      const addonName = ad.name || ad.addon_name || 'Món thêm';
      const addonQty = ad.quantity || 1;
      const qtyStr = addonQty > 1 ? ` × ${addonQty}` : '';
      html += `<span class="kitchen-addon-tag"><i class="fas fa-plus"></i> ${escapeHtml(addonName)}${qtyStr}</span>`;
    });
    html += '</div>';
  }
  return html;
}

function buildOrderDetailsHtml(o) {
  const customerName = escapeHtml(o.customer_name || '—');
  const phone = o.customer_phone ? `<p class="kitchen-card-detail"><i class="fas fa-phone"></i> ${escapeHtml(o.customer_phone)}</p>` : '';
  const address = o.delivery_address ? `<p class="kitchen-card-detail kitchen-card-address"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(o.delivery_address)}</p>` : '';
  const items = Array.isArray(o.items) ? o.items : [];
  const itemsHtml = items.length ? items.map((it) => formatOrderItem(it)).join('') : '—';
  const note = o.note ? `<p class="kitchen-card-note"><strong>Ghi chú:</strong> ${escapeHtml(o.note)}</p>` : '';
  const totalStr = formatMoney(o.total_price);
  return `
    <p class="kitchen-card-customer"><i class="fas fa-user"></i> ${customerName}</p>
    ${phone}
    ${address}
    <div class="kitchen-card-detail-section">
      <strong class="kitchen-card-detail-title">Chi tiết món:</strong>
      <div class="kitchen-card-items">${itemsHtml}</div>
    </div>
    ${note}
    <p class="kitchen-card-total">${totalStr}</p>
  `;
}

function renderOrderCards(orders) {
  const container = document.getElementById('kitchenCards');
  const loading = document.getElementById('kitchenLoading');
  const empty = document.getElementById('kitchenEmpty');
  if (!container) return;
  if (loading) loading.style.display = 'none';
  if (empty) empty.style.display = orders.length === 0 ? 'flex' : 'none';
  container.style.display = orders.length === 0 ? 'none' : 'grid';
  if (orders.length === 0) return;

  container.innerHTML = orders.map((o, index) => {
    const id = o.id || '';
    const dateStr = formatDate(o.order_date || o.created_at);
    const kitchenStatus = o.kitchen_status || '';
    const isCooking = kitchenStatus === 'cooking';
    const isDone = kitchenStatus === 'done';
    const showStart = !isCooking && !isDone;
    const showDone = isCooking && !isDone;
    const animDelay = index * 0.06;
    return `
      <article class="kitchen-card" data-order-id="${escapeHtml(id)}" style="animation-delay:${animDelay}s">
        <div class="kitchen-card-header">
          <span class="kitchen-card-id">#${escapeHtml(id)}</span>
          <span class="kitchen-card-date">${dateStr}</span>
          ${isDone ? '<span class="kitchen-card-badge kitchen-card-badge--done">Đã xong</span>' : ''}
          ${isCooking ? '<span class="kitchen-card-badge kitchen-card-badge--cooking">Đang làm</span>' : ''}
        </div>
        <div class="kitchen-card-body">
          ${buildOrderDetailsHtml(o)}
        </div>
        <div class="kitchen-card-actions">
          ${showStart ? `<button type="button" class="btn btn-primary kitchen-btn-start" data-order-id="${escapeHtml(id)}"><i class="fas fa-play"></i> Bắt đầu làm</button>` : ''}
          ${showDone ? `<button type="button" class="btn btn-primary kitchen-btn-done" data-order-id="${escapeHtml(id)}"><i class="fas fa-check"></i> Đã chế biến xong</button>` : ''}
        </div>
      </article>
    `;
  }).join('');

  container.querySelectorAll('.kitchen-btn-start').forEach((btn) => {
    btn.addEventListener('click', () => handleStart(btn.getAttribute('data-order-id')));
  });
  container.querySelectorAll('.kitchen-btn-done').forEach((btn) => {
    btn.addEventListener('click', () => handleDone(btn.getAttribute('data-order-id')));
  });
}

function renderCompletedOrders(orders) {
  const container = document.getElementById('kitchenCompletedCards');
  const empty = document.getElementById('kitchenCompletedEmpty');
  if (!container || !empty) return;
  const doneOrders = orders.filter((o) => {
    const status = (o.status || '').toLowerCase();
    const kitchenStatus = (o.kitchen_status || '').toLowerCase();
    // Đơn đã hoàn thành ở góc nhìn bếp: bếp đã bấm "Đã chế biến xong" (kitchen_status = done),
    // bất kể admin đã gửi ship hay đơn đã completed, miễn là không bị hủy.
    return kitchenStatus === 'done' && status !== 'cancelled';
  });
  empty.style.display = doneOrders.length === 0 ? 'flex' : 'none';
  container.style.display = doneOrders.length === 0 ? 'none' : 'grid';
  if (doneOrders.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = doneOrders
    .map((o, index) => {
      const id = o.id || '';
      const dateStr = formatDate(o.order_date || o.created_at);
      const animDelay = index * 0.06;
      return `
        <article class="kitchen-card" data-order-id="${escapeHtml(
          id
        )}" style="animation-delay:${animDelay}s">
          <div class="kitchen-card-header">
            <span class="kitchen-card-id">#${escapeHtml(id)}</span>
            <span class="kitchen-card-date">${dateStr}</span>
            <span class="kitchen-card-badge kitchen-card-badge--done">Đã xong</span>
          </div>
          <div class="kitchen-card-body">
            ${buildOrderDetailsHtml(o)}
          </div>
        </article>
      `;
    })
    .join('');
}

// ========== SHIPPER (GIAO HÀNG) ==========

function buildShipperDetailsHtml(o) {
  const customerName = escapeHtml(o.customer_name || '—');
  const phone = o.customer_phone
    ? `<p class="kitchen-card-detail"><i class="fas fa-phone"></i> ${escapeHtml(o.customer_phone)}</p>`
    : '';
  const address = o.delivery_address
    ? `<p class="kitchen-card-detail kitchen-card-address"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(
        o.delivery_address
      )}</p>`
    : '';
  const items = Array.isArray(o.items) ? o.items : [];
  const itemsHtml = items.length ? items.map((it) => formatOrderItem(it)).join('') : '—';
  const note = o.note
    ? `<p class="kitchen-card-note"><strong>Ghi chú:</strong> ${escapeHtml(o.note)}</p>`
    : '';
  const pm = (o.payment_method || '').toLowerCase();
  const isOnline = pm === 'online' || pm === 'bank';
  const totalStr = formatMoney(o.total_price);
  const paymentHtml = isOnline
    ? `<p class="kitchen-card-detail"><i class="fas fa-credit-card"></i> Đã thanh toán trực tuyến</p>`
    : `<p class="kitchen-card-detail"><i class="fas fa-money-bill-wave"></i> Thu hộ: <strong>${totalStr}</strong></p>`;

  return `
    <p class="kitchen-card-customer"><i class="fas fa-user"></i> ${customerName}</p>
    ${phone}
    ${address}
    <div class="kitchen-card-detail-section">
      <strong class="kitchen-card-detail-title">Chi tiết món:</strong>
      <div class="kitchen-card-items">${itemsHtml}</div>
    </div>
    ${note}
    ${paymentHtml}
  `;
}

function renderShipperOrders(orders) {
  const container = document.getElementById('kitchenCards');
  const loading = document.getElementById('kitchenLoading');
  const empty = document.getElementById('kitchenEmpty');
  if (!container) return;
  if (loading) loading.style.display = 'none';
  if (empty) empty.style.display = orders.length === 0 ? 'flex' : 'none';
  container.style.display = orders.length === 0 ? 'none' : 'grid';
  if (orders.length === 0) return;

  container.innerHTML = orders
    .map((o, index) => {
      const id = o.id || '';
      const dateStr = formatDate(o.order_date || o.created_at);
      const shippingStatus = (o.shipping_status || '').toLowerCase();
      const isAccepted = shippingStatus === 'accepted';
      const isShipping = shippingStatus === 'shipping';
      const isDelivered = shippingStatus === 'delivered';

      const showAccept = !shippingStatus;
      const showShipping = isAccepted || (!shippingStatus && !isDelivered);
      const showDelivered = isShipping || isAccepted;

      const animDelay = index * 0.06;
      return `
        <article class="kitchen-card" data-order-id="${escapeHtml(id)}" style="animation-delay:${animDelay}s">
          <div class="kitchen-card-header">
            <span class="kitchen-card-id">#${escapeHtml(id)}</span>
            <span class="kitchen-card-date">${dateStr}</span>
            ${
              isDelivered
                ? '<span class="kitchen-card-badge kitchen-card-badge--done">Đã giao xong</span>'
                : isShipping
                ? '<span class="kitchen-card-badge kitchen-card-badge--cooking">Đang giao</span>'
                : '<span class="kitchen-card-badge kitchen-card-badge--cooking">Chờ nhận</span>'
            }
          </div>
          <div class="kitchen-card-body">
            ${buildShipperDetailsHtml(o)}
          </div>
          <div class="kitchen-card-actions">
            ${
              showAccept
                ? `<button type="button" class="btn btn-primary shipper-btn-accept" data-order-id="${escapeHtml(
                    id
                  )}"><i class="fas fa-hand-paper"></i> Nhận đơn</button>`
                : ''
            }
            ${
              showShipping && !isDelivered
                ? `<button type="button" class="btn btn-primary shipper-btn-shipping" data-order-id="${escapeHtml(
                    id
                  )}"><i class="fas fa-motorcycle"></i> Đang giao</button>`
                : ''
            }
            ${
              showDelivered && !isDelivered
                ? `<button type="button" class="btn btn-primary shipper-btn-delivered" data-order-id="${escapeHtml(
                    id
                  )}"><i class="fas fa-check"></i> Đã giao xong</button>`
                : ''
            }
          </div>
        </article>
      `;
    })
    .join('');

  container.querySelectorAll('.shipper-btn-accept').forEach((btn) => {
    btn.addEventListener('click', () => handleShipperAccept(btn.getAttribute('data-order-id')));
  });
  container.querySelectorAll('.shipper-btn-shipping').forEach((btn) => {
    btn.addEventListener('click', () => handleShipperShipping(btn.getAttribute('data-order-id')));
  });
  container.querySelectorAll('.shipper-btn-delivered').forEach((btn) => {
    btn.addEventListener('click', () => handleShipperDelivered(btn.getAttribute('data-order-id')));
  });
}

function renderShipperCompletedOrders(orders) {
  const container = document.getElementById('kitchenCompletedCards');
  const empty = document.getElementById('kitchenCompletedEmpty');
  if (!container || !empty) return;

  const doneOrders = orders.filter((o) => {
    const status = (o.status || '').toLowerCase();
    const shippingStatus = (o.shipping_status || '').toLowerCase();
    return status === 'completed' || shippingStatus === 'delivered';
  });

  empty.style.display = doneOrders.length === 0 ? 'flex' : 'none';
  container.style.display = doneOrders.length === 0 ? 'none' : 'grid';
  if (doneOrders.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = doneOrders
    .map((o, index) => {
      const id = o.id || '';
      const dateStr = formatDate(o.completed_at || o.order_date || o.created_at);
      const animDelay = index * 0.06;
      return `
        <article class="kitchen-card" data-order-id="${escapeHtml(
          id
        )}" style="animation-delay:${animDelay}s">
          <div class="kitchen-card-header">
            <span class="kitchen-card-id">#${escapeHtml(id)}</span>
            <span class="kitchen-card-date">${dateStr}</span>
            <span class="kitchen-card-badge kitchen-card-badge--done">Đã giao xong</span>
          </div>
          <div class="kitchen-card-body">
            ${buildShipperDetailsHtml(o)}
          </div>
        </article>
      `;
    })
    .join('');
}

function handleStart(orderId) {
  if (!orderId) return;
  openModal(
    'Bắt đầu làm',
    '<p>Bạn xác nhận bắt đầu chế biến đơn <strong>#' + escapeHtml(orderId) + '</strong>?</p>',
    `
      <button type="button" class="btn btn-outline" id="kitchenModalCancel">Hủy</button>
      <button type="button" class="btn btn-primary" id="kitchenModalConfirm">Bắt đầu làm</button>
    `
  );
  document.getElementById('kitchenModalClose')?.addEventListener('click', closeModal);
  document.getElementById('kitchenModalCancel')?.addEventListener('click', closeModal);
  document.getElementById('kitchenModalConfirm')?.addEventListener('click', async () => {
    try {
      await updateOrder(orderId, { kitchen_status: 'cooking' });
      closeModal();
      showToast('Đã cập nhật: Đang làm đơn #' + orderId);
      loadOrders();
    } catch (err) {
      closeModal();
      showToast('Lỗi: ' + (err?.message || err), 'error');
    }
  });
}

function handleDone(orderId) {
  if (!orderId) return;
  openModal(
    'Đã chế biến xong',
    '<p>Xác nhận đơn <strong>#' + escapeHtml(orderId) + '</strong> đã chế biến xong? Admin sẽ nhận thông báo.</p>',
    `
      <button type="button" class="btn btn-outline" id="kitchenModalCancel">Hủy</button>
      <button type="button" class="btn btn-primary" id="kitchenModalConfirm">Đã chế biến xong</button>
    `
  );
  document.getElementById('kitchenModalClose')?.addEventListener('click', closeModal);
  document.getElementById('kitchenModalCancel')?.addEventListener('click', closeModal);
  document.getElementById('kitchenModalConfirm')?.addEventListener('click', async () => {
    try {
      await updateOrder(orderId, { kitchen_status: 'done' });
      await pushNotification({
        type: 'kitchen_done',
        order_id: orderId,
        message: 'Bếp đã chế biến xong đơn #' + orderId
      });
      closeModal();
      showToast('Đã cập nhật. Admin đã nhận thông báo.');
      loadOrders();
    } catch (err) {
      closeModal();
      showToast('Lỗi: ' + (err?.message || err), 'error');
    }
  });
}

async function loadOrders(ordersList) {
  const container = document.getElementById('kitchenCards');
  const loading = document.getElementById('kitchenLoading');
  const empty = document.getElementById('kitchenEmpty');
  const useRealtime = ordersList !== undefined && Array.isArray(ordersList);
  if (!useRealtime) {
    if (loading) loading.style.display = 'flex';
    if (container) container.style.display = 'none';
    if (empty) empty.style.display = 'none';
  }
  try {
    const all = useRealtime ? ordersList : await getOrders();
    // Đơn đã gửi bếp (admin đã bấm "Gửi bếp" → status = ready)
    const approved = all.filter((o) => (o.status || '') === 'ready' && (o.status || '') !== 'cancelled');
    const sorted = approved.sort((a, b) => new Date(b.order_date || b.created_at || 0) - new Date(a.order_date || a.created_at || 0));
    // Đơn đã duyệt (đã gửi bếp): chỉ hiển thị đơn chưa xong (chưa bấm "Đã chế biến xong")
    const notDone = sorted.filter((o) => (o.kitchen_status || '') !== 'done');
    renderOrderCards(notDone);
    // Đơn đã hoàn thành (bếp): xem trên toàn bộ danh sách orders (kể cả đã gửi ship / completed)
    renderCompletedOrders(all);
    if (loading) loading.style.display = 'none';
  } catch (err) {
    console.error('loadOrders:', err);
    if (loading) loading.style.display = 'none';
    if (empty) {
      empty.querySelector('p').textContent = 'Lỗi tải đơn hàng. Vui lòng thử lại.';
      empty.style.display = 'flex';
    }
    showToast('Lỗi tải đơn hàng.', 'error');
  }
}

async function loadShipperOrders(ordersList) {
  const container = document.getElementById('kitchenCards');
  const loading = document.getElementById('kitchenLoading');
  const empty = document.getElementById('kitchenEmpty');
  const useRealtime = ordersList !== undefined && Array.isArray(ordersList);
  if (!useRealtime) {
    if (loading) loading.style.display = 'flex';
    if (container) container.style.display = 'none';
    if (empty) empty.style.display = 'none';
  }
  try {
    const all = useRealtime ? ordersList : await getOrders();
    // Đơn đã gửi ship (admin đã bấm "Gửi ship" → status = delivering)
    const delivering = all.filter(
      (o) => (o.status || '').toLowerCase() === 'delivering' && (o.status || '') !== 'cancelled'
    );
    const sortedDelivering = delivering.sort(
      (a, b) =>
        new Date(b.order_date || b.created_at || 0) - new Date(a.order_date || a.created_at || 0)
    );
    const active = sortedDelivering.filter((o) => (o.shipping_status || '').toLowerCase() !== 'delivered');
    renderShipperOrders(active);
    // Đơn đã giao xong: status = completed (sau khi shipper bấm "Đã giao xong") — không nằm trong delivering nữa
    const completed = all.filter((o) => (o.status || '').toLowerCase() === 'completed');
    const sortedCompleted = completed.sort(
      (a, b) =>
        new Date(b.completed_at || b.order_date || b.created_at || 0) -
        new Date(a.completed_at || a.order_date || a.created_at || 0)
    );
    renderShipperCompletedOrders(sortedCompleted);
    if (loading) loading.style.display = 'none';
  } catch (err) {
    console.error('loadShipperOrders:', err);
    if (loading) loading.style.display = 'none';
    if (empty) {
      empty.querySelector('p').textContent = 'Lỗi tải đơn hàng. Vui lòng thử lại.';
      empty.style.display = 'flex';
    }
    showToast('Lỗi tải đơn hàng.', 'error');
  }
}

function handleShipperAccept(orderId) {
  if (!orderId) return;
  openModal(
    'Nhận đơn giao hàng',
    '<p>Bạn xác nhận <strong>nhận giao</strong> đơn <strong>#' + escapeHtml(orderId) + '</strong>?</p>',
    `
      <button type="button" class="btn btn-outline" id="kitchenModalCancel">Hủy</button>
      <button type="button" class="btn btn-primary" id="kitchenModalConfirm">Nhận đơn</button>
    `
  );
  document.getElementById('kitchenModalClose')?.addEventListener('click', closeModal);
  document.getElementById('kitchenModalCancel')?.addEventListener('click', closeModal);
  document.getElementById('kitchenModalConfirm')?.addEventListener('click', async () => {
    try {
      await updateOrder(orderId, { shipping_status: 'accepted' });
      closeModal();
      showToast('Đã nhận đơn #' + orderId);
      loadShipperOrders();
    } catch (err) {
      closeModal();
      showToast('Lỗi: ' + (err?.message || err), 'error');
    }
  });
}

function handleShipperShipping(orderId) {
  if (!orderId) return;
  openModal(
    'Bắt đầu giao hàng',
    '<p>Xác nhận bạn đang giao đơn <strong>#' + escapeHtml(orderId) + '</strong>?</p>',
    `
      <button type="button" class="btn btn-outline" id="kitchenModalCancel">Hủy</button>
      <button type="button" class="btn btn-primary" id="kitchenModalConfirm">Đang giao</button>
    `
  );
  document.getElementById('kitchenModalClose')?.addEventListener('click', closeModal);
  document.getElementById('kitchenModalCancel')?.addEventListener('click', closeModal);
  document.getElementById('kitchenModalConfirm')?.addEventListener('click', async () => {
    try {
      await updateOrder(orderId, { shipping_status: 'shipping' });
      closeModal();
      showToast('Đang giao đơn #' + orderId);
      loadShipperOrders();
    } catch (err) {
      closeModal();
      showToast('Lỗi: ' + (err?.message || err), 'error');
    }
  });
}

function handleShipperDelivered(orderId) {
  if (!orderId) return;
  openModal(
    'Xác nhận đã giao xong',
    '<p>Xác nhận đơn <strong>#' + escapeHtml(orderId) + '</strong> đã giao thành công cho khách? Đơn sẽ hoàn thành.</p>',
    `
      <button type="button" class="btn btn-outline" id="kitchenModalCancel">Hủy</button>
      <button type="button" class="btn btn-primary" id="kitchenModalConfirm">Đã giao xong</button>
    `
  );
  document.getElementById('kitchenModalClose')?.addEventListener('click', closeModal);
  document.getElementById('kitchenModalCancel')?.addEventListener('click', closeModal);
  document.getElementById('kitchenModalConfirm')?.addEventListener('click', async () => {
    try {
      await updateOrder(orderId, {
        shipping_status: 'delivered',
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      await pushNotification({
        type: 'shipper_delivered',
        order_id: orderId,
        message: 'Shipper đã giao xong đơn #' + orderId
      });
      closeModal();
      showToast('Đã cập nhật: Đơn #' + orderId + ' đã giao xong.');
      loadShipperOrders();
    } catch (err) {
      closeModal();
      showToast('Lỗi: ' + (err?.message || err), 'error');
    }
  });
}

function initKitchen() {
  document.getElementById('kitchenModalClose')?.addEventListener('click', closeModal);
  document.getElementById('kitchenModalBackdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'kitchenModalBackdrop') closeModal();
  });
  const navLinks = document.querySelectorAll('.kitchen-nav-link');
  const ordersSection = document.getElementById('orders');
  const completedSection = document.getElementById('completed');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      navLinks.forEach((l) => l.classList.remove('kitchen-nav-link--active'));
      link.classList.add('kitchen-nav-link--active');
      if (href === '#completed') {
        if (ordersSection) ordersSection.style.display = 'none';
        if (completedSection) completedSection.style.display = 'block';
      } else {
        if (ordersSection) ordersSection.style.display = 'block';
        if (completedSection) completedSection.style.display = 'none';
      }
    });
  });
  document.getElementById('kitchenLogoutBtn')?.addEventListener('click', () => {
    openModal('Đăng xuất', '<p>Bạn có chắc muốn đăng xuất?</p>', `
      <button type="button" class="btn btn-outline" id="kitchenLogoutCancel">Hủy</button>
      <button type="button" class="btn btn-primary" id="kitchenLogoutConfirm">Đăng xuất</button>
    `);
    document.getElementById('kitchenLogoutCancel')?.addEventListener('click', closeModal);
    document.getElementById('kitchenLogoutConfirm')?.addEventListener('click', async () => {
      try {
        await logout();
        closeModal();
        window.location.href = 'auth.html';
      } catch (err) {
        closeModal();
        showToast('Lỗi đăng xuất.', 'error');
      }
    });
  });
  loadOrders();
  // Realtime: tự cập nhật danh sách đơn khi Firebase thay đổi (admin gửi bếp, đổi trạng thái...)
  subscribeOrders((list) => loadOrders(list));
}

function initShipper() {
  document.getElementById('kitchenModalClose')?.addEventListener('click', closeModal);
  document.getElementById('kitchenModalBackdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'kitchenModalBackdrop') closeModal();
  });
  const navLinks = document.querySelectorAll('.kitchen-nav-link');
  const ordersSection = document.getElementById('orders');
  const completedSection = document.getElementById('completed');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      navLinks.forEach((l) => l.classList.remove('kitchen-nav-link--active'));
      link.classList.add('kitchen-nav-link--active');
      if (href === '#completed') {
        if (ordersSection) ordersSection.style.display = 'none';
        if (completedSection) completedSection.style.display = 'block';
      } else {
        if (ordersSection) ordersSection.style.display = 'block';
        if (completedSection) completedSection.style.display = 'none';
      }
    });
  });
  document.getElementById('kitchenLogoutBtn')?.addEventListener('click', () => {
    openModal('Đăng xuất', '<p>Bạn có chắc muốn đăng xuất?</p>', `
      <button type="button" class="btn btn-outline" id="kitchenLogoutCancel">Hủy</button>
      <button type="button" class="btn btn-primary" id="kitchenLogoutConfirm">Đăng xuất</button>
    `);
    document.getElementById('kitchenLogoutCancel')?.addEventListener('click', closeModal);
    document.getElementById('kitchenLogoutConfirm')?.addEventListener('click', async () => {
      try {
        await logout();
        closeModal();
        window.location.href = 'auth.html';
      } catch (err) {
        closeModal();
        showToast('Lỗi đăng xuất.', 'error');
      }
    });
  });
  loadShipperOrders();
  // Realtime: tự cập nhật danh sách đơn giao khi Firebase thay đổi (admin gửi ship, shipper cập nhật...)
  subscribeOrders((list) => loadShipperOrders(list));
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }
  const profile = await getUserProfile(user.uid).catch(() => null);
  const role = profile?.role;
  if (!profile || !role) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = user;
  if (role === 'kitchen') {
    initKitchen();
  } else if (role === 'shipper') {
    initShipper();
  } else {
    window.location.href = 'index.html';
  }
});
