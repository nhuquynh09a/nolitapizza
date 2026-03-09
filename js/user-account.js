// User Account - dùng Firebase Auth + Realtime Database (ES Module)
import { auth, onAuthStateChanged, getUserProfile, logout, getOrdersByUserId, getReviewsByUserId, saveReview, deleteReview as deleteReviewFromFirebase, saveUserProfile, updateOrder } from './firebase.js';

// State: không dùng dữ liệu mẫu; profile được gán khi đã đăng nhập
let profile = { name: '', email: '', uid: '', phone: '', address: '', created: '' };
const products = [];
let cart = [];
let orders = [];
let reviews = [];

// Helpers
const $ = s=>document.querySelector(s);
const $$ = s=>document.querySelectorAll(s);

// Kiểm tra đăng nhập và load thông tin user (chờ Firebase khôi phục phiên trước khi redirect)
let authCheckDone = false;
onAuthStateChanged(auth, async (user) => {
  if (user) {
    authCheckDone = true;
    const dbProfile = await getUserProfile(user.uid).catch(() => null);
    profile = {
      name: user.displayName || (dbProfile && dbProfile.full_name) || user.email || '',
      email: user.email || (dbProfile && dbProfile.email) || '',
      uid: user.uid,
      phone: (dbProfile && dbProfile.phone) || '',
      address: (dbProfile && dbProfile.address) || '',
      created: (user.metadata && user.metadata.creationTime) || (dbProfile && dbProfile.created_at) || ''
    };
    await loadOrdersFromFirebase();
    await loadReviewsFromFirebase();
    initUI();
    showPanel('profile');
    return;
  }
  if (authCheckDone) {
    window.location.href = 'auth.html';
    return;
  }
  // Chưa xác định: chờ Firebase khôi phục phiên (sau redirect/refresh) rồi mới coi là chưa đăng nhập
  setTimeout(() => {
    if (authCheckDone) return;
    if (!auth.currentUser) {
      authCheckDone = true;
      window.location.href = 'auth.html';
    }
  }, 1200);
});

/** Tải đơn hàng từ Firebase theo user_id và chuẩn hóa về format dùng trong trang (id, timestamp, total, status, items, info). */
async function loadOrdersFromFirebase() {
  if (!profile.uid) return;
  const list = await getOrdersByUserId(profile.uid, profile.email);
  orders = list.map(o => ({
    id: o.id,
    timestamp: o.order_date || o.created_at || '',
    total: o.total_price ?? 0,
    status: o.status || 'pending',
    items: o.items || [],
    cancel_reason: o.cancel_reason || '',
    cancelled_at: o.cancelled_at || '',
    info: {
      name: o.customer_name || '',
      phone: o.customer_phone || '',
      addr: o.delivery_address || '',
      email: o.customer_email || '',
      note: o.note || ''
    }
  })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/** Tải đánh giá của user từ Firebase (để hiển thị và để admin quản lý). */
async function loadReviewsFromFirebase() {
  if (!profile.uid) return;
  const list = await getReviewsByUserId(profile.uid);
  reviews = list.map(r => ({
    id: r.id,
    stars: r.rating ?? r.stars ?? 0,
    content: r.content || '',
    date: r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : '',
    productId: r.product_id || null
  }));
}

// Init UI values từ profile thật
// Init UI values từ profile thật
function initUI(){
  const nameEl = $('#sideName');
  const emailEl = $('#sideEmail');
  const avatarEl = $('#sideAvatar');
  if (nameEl) nameEl.textContent = profile.name || '—';
  if (emailEl) emailEl.textContent = profile.email || '—';
  if (avatarEl) avatarEl.textContent = (profile.name || 'U').trim().split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() || 'U';
  const fCreated = profile.created ? new Date(profile.created).toLocaleDateString('vi-VN') : '—';
  if ($('#f_name')) $('#f_name').value = profile.name || '';
  if ($('#f_email')) $('#f_email').value = profile.email || '';
  if ($('#f_phone')) $('#f_phone').value = profile.phone || '';
  if ($('#f_address')) $('#f_address').value = profile.address || '';
  if ($('#f_created')) $('#f_created').value = fCreated;
  if ($('#cartList')) renderCart();
  renderOrdersTable();
  renderReviews();
  updateHdrCart();
}

// Sidebar navigation
$$('.account-menu-btn').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.account-menu-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const tab = btn.dataset.tab;
  showTab(tab);
}));

function showTab(tab){
  // hide all panels
  ['profile','orders','reviews','password','logout'].forEach(t=>{ 
    const el = document.getElementById('panel'+capitalize(t));
    if(el) el.classList.remove('active');
  });
  // show requested
  const el = document.getElementById('panel'+capitalize(tab));
  if(el) el.classList.add('active');
}
function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

// Toast in-app (không dùng alert để tránh thanh địa chỉ IP)
function showToast(message) {
  const el = $('#toastNotify');
  if (!el) return;
  el.textContent = message;
  el.classList.add('toast-visible');
  clearTimeout(showToast._tid);
  showToast._tid = setTimeout(() => el.classList.remove('toast-visible'), 2500);
}

// Profile edit / save
$('#editProfileBtn').addEventListener('click', () => {
  $('#f_name').disabled = false;
  $('#f_email').disabled = false;
  $('#f_phone').disabled = false;
  $('#f_address').disabled = false;
  $('#saveProfileBtn').disabled = false;
  $('#editProfileBtn').disabled = true;
});
$('#saveProfileBtn').addEventListener('click', async () => {
  profile.name = $('#f_name').value.trim();
  profile.email = $('#f_email').value.trim();
  profile.phone = $('#f_phone').value.trim();
  profile.address = $('#f_address').value.trim();
  $('#sideName').textContent = profile.name;
  $('#sideEmail').textContent = profile.email;
  $('#editProfileBtn').disabled = false;
  $('#saveProfileBtn').disabled = true;
  $('#f_name').disabled = true;
  $('#f_email').disabled = true;
  $('#f_phone').disabled = true;
  $('#f_address').disabled = true;
  try {
    await saveUserProfile(profile.uid, {
      full_name: profile.name,
      email: profile.email,
      phone: profile.phone,
      address: profile.address
    });
    showToast('Đã lưu thông tin');
  } catch (e) {
    showToast('Lỗi lưu: ' + (e?.message || e));
  }
});

// Orders table (dùng data-order-id + delegation để hỗ trợ id dạng chuỗi Firebase)
function renderOrdersTable(){
  const tbody = $('#ordersTbody'); 
  if (!tbody) return;
  tbody.innerHTML = '';
  if(orders.length===0){ 
    tbody.innerHTML = '<tr><td colspan="5" style="color:#cccccc;text-align:center;">Không có đơn hàng</td></tr>'; 
    return; 
  }
  orders.forEach(o=>{
    const tr = document.createElement('tr');
    const statusClass = 'status-' + (o.status || 'pending');
    const idEscaped = String(o.id).replace(/"/g, '&quot;');
    const isPending = (o.status || 'pending') === 'pending';
    const cancelBtn = isPending ? `<button type="button" class="btn btn-sm btn-outline btn-cancel-order" data-order-id="${idEscaped}">Hủy đơn</button>` : '';
    tr.innerHTML = `<td>#${o.id}</td><td>${o.timestamp ? new Date(o.timestamp).toLocaleString('vi-VN') : '—'}</td><td>${formatMoney(o.total)}</td><td><span class="account-status ${statusClass}">${statusText(o.status)}</span></td><td class="account-order-actions">${cancelBtn}<button type="button" class="btn btn-sm btn-outline btn-view-order" data-order-id="${idEscaped}">Xem</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.btn-view-order').forEach(btn => {
    btn.addEventListener('click', function() { viewOrder(this.getAttribute('data-order-id')); });
  });
  tbody.querySelectorAll('.btn-cancel-order').forEach(btn => {
    btn.addEventListener('click', function() { openCancelOrderModal(this.getAttribute('data-order-id')); });
  });
}
function statusText(s){ switch(s){ case 'pending': return 'Chờ xác nhận'; case 'confirmed': return 'Đã xác nhận'; case 'ready': return 'Chờ giao'; case 'delivering': return 'Đang giao'; case 'completed': return 'Hoàn thành'; case 'cancelled': return 'Đã hủy'; default: return s; } }

function viewOrder(id){ 
  const o = orders.find(x => String(x.id) === String(id)); 
  if(!o) { showToast('Đơn không tồn tại'); return; }
  
  // Populate modal
  $('#modalOrderId').textContent = '#' + o.id;
  $('#modalOrderDate').textContent = o.timestamp ? new Date(o.timestamp).toLocaleString('vi-VN') : '—';
  $('#modalOrderStatus').textContent = statusText(o.status);
  $('#modalOrderTotal').textContent = formatMoney(o.total);
  const cancelBlock = $('#modalOrderCancelReason');
  const cancelText = document.getElementById('modalOrderCancelReasonText');
  if (o.status === 'cancelled') {
    if (cancelBlock) cancelBlock.style.display = 'block';
    if (cancelText) cancelText.textContent = o.cancel_reason || 'Không nêu lý do';
  } else {
    if (cancelBlock) cancelBlock.style.display = 'none';
    if (cancelText) cancelText.textContent = '';
  }
  $('#modalOrderName').textContent = (o.info && o.info.name) || '-';
  $('#modalOrderPhone').textContent = (o.info && o.info.phone) || '-';
  $('#modalOrderAddr').textContent = (o.info && o.info.addr) || '-';
  
  // Populate items (hỗ trợ cả item từ Firebase: name/product_name, price, quantity/qty)
  const itemsContainer = $('#modalOrderItems');
  if (itemsContainer) {
    itemsContainer.innerHTML = '';
    (o.items || []).forEach(it => {
      const name = it.name || it.product_name || 'Món';
      const qty = it.quantity ?? it.qty ?? 1;
      const price = it.price ?? 0;
      const p = products.find(pp => String(pp.id) === String(it.product_id || it.productId));
      const unitPrice = p ? (p.price ?? 0) : price;
      const itemDiv = document.createElement('div');
      itemDiv.className = 'modal-item';
      itemDiv.innerHTML = `<div class="modal-item-name">${name}</div><div class="modal-item-qty">x${qty}</div><div class="modal-item-price">${formatMoney(unitPrice * qty)}</div>`;
      itemsContainer.appendChild(itemDiv);
    });
  }
  
  // Handle optional fields
  if (o.info && o.info.email) {
    $('#modalOrderEmail').style.display = 'block';
    $('#modalOrderEmailValue').textContent = o.info.email;
  } else {
    $('#modalOrderEmail').style.display = 'none';
  }
  
  if (o.info && o.info.note) {
    $('#modalOrderNote').style.display = 'block';
    $('#modalOrderNoteValue').textContent = o.info.note;
  } else {
    $('#modalOrderNote').style.display = 'none';
  }
  
  // Show modal
  $('#orderModal').style.display = 'flex';
}

// Close modal helpers
function closeOrderModal(){ const m = $('#orderModal'); if(!m) return; m.style.display = 'none'; }
// expose to global in case inline handlers are evaluated in different scope
window.closeOrderModal = closeOrderModal;
// Close when clicking backdrop and on Escape
(function(){
  const m = $('#orderModal');
  if(m){
    m.addEventListener('click', e=>{ if(e.target === m) closeOrderModal(); });
  }
  document.addEventListener('keydown', e=>{ if(e.key === 'Escape'){ const mm = $('#orderModal'); if(mm && mm.style.display === 'flex') closeOrderModal(); }});
  // attach listeners to modal-close and footer close button to be safe
  const closeBtn = document.querySelector('#orderModal .modal-close');
  if(closeBtn) closeBtn.addEventListener('click', closeOrderModal);
  const footerClose = document.querySelector('#orderModal .modal-footer .btn.btn-outline');
  if(footerClose) footerClose.addEventListener('click', closeOrderModal);
})();

// ----- Hủy đơn: popup xác nhận + nhập lý do (không dùng confirm()) -----
let cancelOrderModalOrderId = null;
function openCancelOrderModal(orderId) {
  cancelOrderModalOrderId = orderId;
  const reasonEl = $('#cancelOrderReason');
  const errEl = $('#cancelOrderReasonError');
  if (reasonEl) reasonEl.value = '';
  if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); }
  const m = $('#cancelOrderModal');
  if (m) m.style.display = 'flex';
}
function closeCancelOrderModal() {
  cancelOrderModalOrderId = null;
  const m = $('#cancelOrderModal');
  if (m) m.style.display = 'none';
  const reasonEl = $('#cancelOrderReason');
  const errEl = $('#cancelOrderReasonError');
  if (reasonEl) reasonEl.value = '';
  if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); }
}
$('#cancelOrderModalClose').addEventListener('click', closeCancelOrderModal);
$('#cancelOrderModalCancel').addEventListener('click', closeCancelOrderModal);
$('#cancelOrderModalConfirm').addEventListener('click', async () => {
  const reason = ($('#cancelOrderReason') && $('#cancelOrderReason').value.trim()) || '';
  const errEl = $('#cancelOrderReasonError');
  if (!reason) {
    if (errEl) { errEl.textContent = 'Vui lòng nhập lý do hủy đơn.'; errEl.classList.add('show'); }
    return;
  }
  if (!cancelOrderModalOrderId) return;
  try {
    await updateOrder(cancelOrderModalOrderId, {
      status: 'cancelled',
      cancel_reason: reason,
      cancelled_at: new Date().toISOString()
    });
    closeCancelOrderModal();
    await loadOrdersFromFirebase();
    renderOrdersTable();
    showToast('Đã hủy đơn hàng.');
  } catch (e) {
    showToast('Lỗi: ' + (e?.message || e));
  }
});
$('#cancelOrderModal').addEventListener('click', e => { if (e.target === $('#cancelOrderModal')) closeCancelOrderModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#cancelOrderModal') && $('#cancelOrderModal').style.display === 'flex') closeCancelOrderModal(); });

// Cart
function renderCart(){ 
  const wrap = $('#cartList'); 
  if (!wrap) return;
  wrap.innerHTML=''; 
  if(cart.length===0){ 
    wrap.innerHTML = '<p style="color:#cccccc;">Giỏ hàng trống</p>'; 
    const tot = $('#cartTotals'); if (tot) tot.innerHTML=''; 
    updateHdrCart(); 
    return; 
  } 
  cart.forEach(it=>{ 
    const p = products.find(pp=>pp.id===it.productId); 
    const r = document.createElement('div'); 
    r.className='account-cart-item'; 
    r.innerHTML = `<img src="${p.img||''}" alt="${p.name}" class="account-cart-item-image" referrerpolicy="no-referrer" onerror="this.style.background='linear-gradient(135deg,#ffd1a8,#ff7a00)';"><div class="account-cart-item-info"><div class="account-cart-item-name">${p.name}</div><div class="account-cart-item-desc">${formatMoney(p.price)} • ${p.cal} cal</div></div><div class="account-cart-item-qty"><input type="number" value="${it.qty}" min="1" onchange="updateQty(${p.id},this.value)"></div><div style="text-align:right;display:flex;flex-direction:column;gap:8px;align-items:flex-end"><div style="color:#fff;font-weight:600">${formatMoney(p.price*it.qty)}</div><button class="btn btn-sm btn-outline" onclick="removeFromCart(${p.id})">Xóa</button></div>`; 
    wrap.appendChild(r); 
  }); 
  const totals = calcTotals(); 
  const tot = $('#cartTotals'); if (tot) tot.innerHTML = `<strong>Tổng tiền:</strong> ${formatMoney(totals.total)}<br><span class="muted">Tổng calo: ${totals.cal}</span>`; 
  updateHdrCart(); 
}

function updateQty(pid,v){ const n = Math.max(1,parseInt(v)||1); const it = cart.find(x=>x.productId===pid); if(it){ it.qty = n; renderCart(); } }
function removeFromCart(pid){ cart = cart.filter(x=>x.productId!==pid); renderCart(); }
function calcTotals(){ let total=0,cal=0; cart.forEach(i=>{ const p=products.find(pp=>pp.id===i.productId); total += p.price*i.qty; cal += p.cal*i.qty; }); return {total,cal}; }

const checkoutBtn = $('#checkoutBtn');
if (checkoutBtn) checkoutBtn.addEventListener('click',()=>{
  if(cart.length===0) return alert('Giỏ hàng trống');
  const name = $('#accountOrderName')?.value?.trim(), phone = $('#accountOrderPhone')?.value?.trim(), addr = $('#accountOrderAddress')?.value?.trim();
  if(!name || !phone || !addr) return alert('Vui lòng điền đầy đủ thông tin');
  const totals = calcTotals(); 
  const o = { 
    id: Date.now(), 
    timestamp:new Date().toISOString(), 
    items: JSON.parse(JSON.stringify(cart)), 
    total:totals.total, 
    status:'pending', 
    info:{name,phone,addr,email:$('#accountOrderEmail')?.value?.trim()||'',note:$('#accountOrderNote')?.value?.trim()||''} 
  };
  orders.unshift(o); 
  cart = []; 
  saveCartToLocalStorage && saveCartToLocalStorage();
  renderCart(); 
  renderOrdersTable(); 
  alert('Đã tạo đơn hàng. Trạng thái: Chờ xác nhận');
  showPanel('orders');
});

function showPanel(p){ // switch sidebar highlight and show panel
  $$('.account-menu-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===p));
  showTab(p);
}

// Reviews
function renderReviews(){ 
  const wrap = $('#reviewsList'); 
  if (!wrap) return;
  wrap.innerHTML=''; 
  if(reviews.length===0){ 
    wrap.innerHTML='<p style="color:#cccccc;">Bạn chưa gửi đánh giá</p>'; 
    return;
  } 
  reviews.forEach(r=>{ 
    const d = document.createElement('div'); 
    d.className='account-review'; 
    const idEscaped = String(r.id).replace(/"/g, '&quot;');
    d.innerHTML = `<div class="account-review-content"><div class="account-review-rating">★${r.stars}</div><div class="account-review-text">${r.content}</div><div class="account-review-date">${r.date || '—'}</div></div><div class="account-review-actions"><button type="button" class="btn btn-sm btn-outline btn-delete-review" data-review-id="${idEscaped}">Xóa</button></div>`; 
    wrap.appendChild(d); 
  });
  wrap.querySelectorAll('.btn-delete-review').forEach(btn => {
    btn.addEventListener('click', function() { handleDeleteReview(this.getAttribute('data-review-id')); });
  });
}
async function handleDeleteReview(id) {
  if (!confirm('Xóa đánh giá này?')) return;
  try {
    await deleteReviewFromFirebase(id);
    await loadReviewsFromFirebase();
    renderReviews();
  } catch (e) {
    alert('Lỗi xóa: ' + (e?.message || e));
  }
}

const submitReviewBtn = document.getElementById('submitReviewBtn');
if (submitReviewBtn) {
  submitReviewBtn.addEventListener('click', async () => {
    const content = document.getElementById('reviewContent') && document.getElementById('reviewContent').value.trim();
    const starsEl = document.getElementById('reviewStars');
    const rating = starsEl ? parseInt(starsEl.value, 10) : 5;
    if (!content) {
      alert('Vui lòng nhập nội dung đánh giá.');
      return;
    }
    try {
      await saveReview({
        user_id: profile.uid,
        user_name: profile.name || profile.email || 'Khách',
        rating,
        content
      });
      await loadReviewsFromFirebase();
      renderReviews();
      if (document.getElementById('reviewContent')) document.getElementById('reviewContent').value = '';
      alert('Đã gửi đánh giá.');
    } catch (e) {
      alert('Lỗi gửi đánh giá: ' + (e?.message || e));
    }
  });
}

// Password change
$('#changePwdBtn').addEventListener('click',()=>{
  const oldP = $('#oldPwd').value, newP = $('#newPwd').value, cP = $('#confirmPwd').value;
  if(!oldP || !newP) return $('#pwdMsg').textContent = 'Vui lòng điền đủ thông tin';
  if(newP !== cP) return $('#pwdMsg').textContent = 'Mật khẩu xác nhận không khớp';
  $('#pwdMsg').textContent = 'Đã cập nhật (giả lập)'; setTimeout(()=>$('#pwdMsg').textContent='',2000);
});

// Logout: khi bấm "Xác nhận đăng xuất" thì hiện popup xác nhận, không dùng confirm() của trình duyệt
const logoutModal = document.getElementById('logoutConfirmModal');
function showLogoutModal() {
  if (logoutModal) logoutModal.style.display = 'flex';
}
function hideLogoutModal() {
  if (logoutModal) logoutModal.style.display = 'none';
}
const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
if (confirmLogoutBtn) confirmLogoutBtn.addEventListener('click', () => showLogoutModal());
const logoutModalClose = document.getElementById('logoutModalClose');
if (logoutModalClose) logoutModalClose.addEventListener('click', hideLogoutModal);
const logoutModalCancel = document.getElementById('logoutModalCancel');
if (logoutModalCancel) logoutModalCancel.addEventListener('click', hideLogoutModal);
const logoutModalConfirm = document.getElementById('logoutModalConfirm');
if (logoutModalConfirm) {
  logoutModalConfirm.addEventListener('click', async () => {
    hideLogoutModal();
    try {
      await logout();
      window.location.href = 'auth.html';
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = 'auth.html';
    }
  });
}
if (logoutModal) {
  logoutModal.addEventListener('click', (e) => { if (e.target === logoutModal) hideLogoutModal(); });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && logoutModal && logoutModal.style.display === 'flex') hideLogoutModal();
});

// Header cart update: lấy số lượng từ localStorage (đồng bộ với trang Món ăn / Đặt món)
function updateHdrCart() {
  const raw = localStorage.getItem('cartItems');
  const items = raw ? JSON.parse(raw) : [];
  const count = items.reduce((s, i) => s + (i.quantity || 1), 0);
  const el = document.querySelector('.cart-count') || $('#hdrCartCount');
  if (el) el.textContent = count;
}

// Utility
function formatMoney(v){ return new Intl.NumberFormat('vi-VN').format(v) + ' ₫'; }

// Orders view helper (keeps old renderOrdersTable name for readability)
function renderOrders(){ renderOrdersTable(); }

// Cập nhật số giỏ hàng trên header ngay khi trang tải (đồng bộ với localStorage)
document.addEventListener('DOMContentLoaded', updateHdrCart);

// Init: không gọi initUI() ở đây — initUI chạy sau khi onAuthStateChanged có user
