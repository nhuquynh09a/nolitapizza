// Admin dashboard – navigation + modal Thêm người dùng / món ăn / danh mục
import { auth, onAuthStateChanged, getUserProfile, addProduct, setProductDetails, getProducts, getCategories, addCategory, updateCategory, deleteCategory, getProductById, getProductDetailsByProductId, updateProduct, deleteProduct, getUsersList, saveUserProfile, deleteUserProfile, getContacts, updateContact, deleteContact, getReviews, deleteReview, getOrders, subscribeOrders, updateOrder, logout } from './firebase.js';

const CLOUDINARY_CLOUD_NAME = 'durrqkh9f';
// Bắt buộc tạo preset trong Cloudinary (nếu chưa có):
// 1. Mở: https://console.cloudinary.com/settings/upload/presets
// 2. Add upload preset → Preset name: nolita_unsigned (viết đúng như vậy)
// 3. Signing Mode: Unsigned → Save
const CLOUDINARY_UPLOAD_PRESET = 'nolita_unsigned';

/**
 * Upload ảnh lên Cloudinary (unsigned), trả về secure_url.
 * @param {File} file
 * @returns {Promise<string>} secure_url của ảnh
 */
async function uploadToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('file', file);

  const res = await fetch(url, {
    method: 'POST',
    body: formData
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.error?.message || body.error || res.statusText || 'Upload thất bại';
    const isPresetError = String(msg).toLowerCase().includes('preset') || res.status === 400;
    if (isPresetError) {
      throw new Error('Chưa có preset "' + CLOUDINARY_UPLOAD_PRESET + '". Tạo tại: Cloudinary Console → Settings → Upload → Upload presets → Add upload preset, đặt tên "' + CLOUDINARY_UPLOAD_PRESET + '", Signing Mode: Unsigned.');
    }
    throw new Error(msg);
  }

  if (!body.secure_url) throw new Error('Không nhận được URL ảnh');
  return body.secure_url;
}

/** Toast thay alert() – không hiện IP/nguồn trình duyệt */
function showAdminToast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = 'admin-toast admin-toast--' + type;
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('admin-toast--visible'));
  setTimeout(() => {
    el.classList.remove('admin-toast--visible');
    setTimeout(() => el.remove(), 350);
  }, 2500);
}

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'auth.html';
      return;
    }
    const profile = await getUserProfile(user.uid).catch(() => null);
    if (!profile || profile.role !== 'admin') {
      window.location.href = 'index.html';
      return;
    }
    initAdmin();
  });
});

function initAdmin() {
  const navLinks = document.querySelectorAll('.admin-nav-link');
  const sections = document.querySelectorAll('.admin-section');
  const backdrop = document.getElementById('adminModalBackdrop');
  const modalTitle = document.getElementById('adminModalTitle');
  const modalBody = document.getElementById('adminModalBody');
  const modalFooter = document.getElementById('adminModalFooter');
  const modalClose = document.getElementById('adminModalClose');

  function showSection(id) {
    sections.forEach(sec => {
      sec.style.display = sec.id === id ? 'block' : 'none';
    });
  }

  showSection('dashboard');

  // Simple SVG charts for revenue analytics
  function renderLineChartSvg(points) {
    if (!points || points.length === 0) {
      return '<p class="admin-chart-empty">Chưa có dữ liệu doanh thu.</p>';
    }
    const width = 300;
    const height = 160;
    const padding = 24;
    const maxVal = Math.max(...points.map(p => p.value)) || 1;
    const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
    let pathD = '';
    points.forEach((p, i) => {
      const x = padding + i * stepX;
      const y = height - padding - (p.value / maxVal) * (height - padding * 2);
      pathD += (i === 0 ? 'M' : 'L') + x + ' ' + y + ' ';
    });
    const labels = points.map((p, i) => {
      const x = padding + i * stepX;
      const y = height - padding + 12;
      return `<text x="${x}" y="${y}" text-anchor="middle" class="admin-chart-axis-text">${p.label}</text>`;
    }).join('');
    return `
      <svg viewBox="0 0 ${width} ${height}" class="admin-chart-svg" preserveAspectRatio="none">
        <polyline fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"
          points="${padding} ${height - padding} ${width - padding} ${height - padding}" />
        <path d="${pathD.trim()}" class="admin-chart-line" />
        ${labels}
      </svg>
    `;
  }

  function renderBarChartSvg(points) {
    if (!points || points.length === 0) {
      return '<p class="admin-chart-empty">Chưa có dữ liệu doanh thu.</p>';
    }
    const width = 300;
    const height = 160;
    const padding = 24;
    const maxVal = Math.max(...points.map(p => p.value)) || 1;
    const barWidth = (width - padding * 2) / points.length;
    const bars = points.map((p, i) => {
      const x = padding + i * barWidth + barWidth * 0.15;
      const h = (p.value / maxVal) * (height - padding * 2);
      const y = height - padding - h;
      return `<rect x="${x}" y="${y}" width="${barWidth * 0.7}" height="${h}" class="admin-chart-bar" />`;
    }).join('');
    const labels = points.map((p, i) => {
      const x = padding + i * barWidth + barWidth / 2;
      const y = height - padding + 12;
      return `<text x="${x}" y="${y}" text-anchor="middle" class="admin-chart-axis-text">${p.label}</text>`;
    }).join('');
    return `
      <svg viewBox="0 0 ${width} ${height}" class="admin-chart-svg" preserveAspectRatio="none">
        <polyline fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"
          points="${padding} ${height - padding} ${width - padding} ${height - padding}" />
        ${bars}
        ${labels}
      </svg>
    `;
  }

  // ----- Dashboard: doanh thu (chỉ đơn đã giao), người dùng mới, món ăn mới -----
  let cachedOrders = [];
  const ADMIN_PAGE_SIZE = 12;
  let ordersCurrentPage = 1;
  let foodsCurrentPage = 1;
  let currentOrdersList = [];
  let currentFoodsList = [];

  async function loadDashboardStats() {
    const revenueEl = document.getElementById('dashboardRevenue');
    const revenueTotalEl = document.getElementById('dashboardRevenueTotal');
    const revenueOfflineEl = document.getElementById('dashboardRevenueOffline');
    const revenueOnlineEl = document.getElementById('dashboardRevenueOnline');
    const dailyChartEl = document.getElementById('dashboardRevenueDailyChart');
    const monthlyChartEl = document.getElementById('dashboardRevenueMonthlyChart');
    const newUsersEl = document.getElementById('dashboardNewUsers');
    const newProductsEl = document.getElementById('dashboardNewProducts');
    const periodSelect = document.getElementById('dashboardPeriod');
    if (!revenueEl && !newUsersEl && !newProductsEl) return;
    const period = periodSelect ? periodSelect.value : 'today';
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate;
    if (period === 'today') startDate = todayStart;
    else if (period === '7') { startDate = new Date(todayStart); startDate.setDate(startDate.getDate() - 7); }
    else if (period === '30') { startDate = new Date(todayStart); startDate.setDate(startDate.getDate() - 30); }
    else startDate = todayStart;
    const startTime = startDate.getTime();
    try {
      const [users, products, orders] = await Promise.all([getUsersList(), getProducts(), getOrders()]);
      const newUsersCount = users.filter(u => {
        const t = u.created_at ? new Date(u.created_at).getTime() : 0;
        return t >= startTime;
      }).length;
      const newProductsCount = products.filter(p => {
        const t = p.created_at ? new Date(p.created_at).getTime() : 0;
        return t >= startTime;
      }).length;
      // Doanh thu: đơn đã giao (completed) HOẶC đơn VietQR đã xác nhận chuyển khoản (tính ngay khi admin xác nhận)
      const completedOrders = orders.filter(o => (o.status || '') === 'completed');
      const vietqrConfirmed = orders.filter(o =>
        (o.payment_method || '').toLowerCase() === 'vietqr' && (o.payment_status || '').toLowerCase() === 'confirmed'
      );
      const revenueEligibleOrders = [...completedOrders];
      vietqrConfirmed.forEach(o => {
        if (!revenueEligibleOrders.find(x => x.id === o.id)) revenueEligibleOrders.push(o);
      });
      const revenueOrders = revenueEligibleOrders.filter(o => {
        const completedAt = o.completed_at || o.order_date || o.created_at;
        if (!completedAt) return false;
        return new Date(completedAt).getTime() >= startTime;
      });
      const totalRevenue = revenueOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
      const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
      if (revenueEl) revenueEl.textContent = fmt(totalRevenue);
      if (revenueTotalEl) revenueTotalEl.textContent = fmt(totalRevenue);

      const pm = (o) => (o.payment_method || '').toLowerCase();
      const revenueOffline = revenueOrders.filter(o => pm(o) === 'cod' || pm(o) === 'cash').reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
      const revenueOnline = revenueOrders.filter(o => pm(o) === 'vietqr').reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
      if (revenueOfflineEl) revenueOfflineEl.textContent = fmt(revenueOffline);
      if (revenueOnlineEl) revenueOnlineEl.textContent = fmt(revenueOnline);

      if (newUsersEl) newUsersEl.textContent = String(newUsersCount);
      if (newProductsEl) newProductsEl.textContent = String(newProductsCount);

      // Build datasets for charts
      if (dailyChartEl) {
        const byDay = {};
        revenueOrders.forEach(o => {
          const d = new Date(o.completed_at || o.order_date || o.created_at);
          const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
          byDay[key] = (byDay[key] || 0) + (Number(o.total_price) || 0);
        });
        const dayKeys = Object.keys(byDay).sort();
        const maxPoints = 10;
        const slicedKeys = dayKeys.slice(-maxPoints);
        const dailyPoints = slicedKeys.map(k => ({ label: k.slice(5), value: byDay[k] }));
        dailyChartEl.innerHTML = renderLineChartSvg(dailyPoints);
      }
      if (monthlyChartEl) {
        const byMonth = {};
        revenueOrders.forEach(o => {
          const d = new Date(o.completed_at || o.order_date || o.created_at);
          const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
          byMonth[key] = (byMonth[key] || 0) + (Number(o.total_price) || 0);
        });
        const monthKeys = Object.keys(byMonth).sort();
        const maxPoints = 12;
        const slicedMonths = monthKeys.slice(-maxPoints);
        const monthlyPoints = slicedMonths.map(k => ({ label: k.slice(5) + '/' + k.slice(2, 4), value: byMonth[k] }));
        monthlyChartEl.innerHTML = renderBarChartSvg(monthlyPoints);
      }
    } catch (err) {
      console.error('loadDashboardStats:', err);
      if (revenueEl) revenueEl.textContent = '—';
      if (revenueTotalEl) revenueTotalEl.textContent = '—';
      if (revenueOfflineEl) revenueOfflineEl.textContent = '—';
      if (revenueOnlineEl) revenueOnlineEl.textContent = '—';
      if (newUsersEl) newUsersEl.textContent = '—';
      if (newProductsEl) newProductsEl.textContent = '—';
    }
  }
  document.getElementById('dashboardPeriod')?.addEventListener('change', loadDashboardStats);
  loadDashboardStats();

  // ===== Categories state =====
  let cachedCategories = [];
  async function loadCategoriesIfNeeded(force = false) {
    if (!force && Array.isArray(cachedCategories) && cachedCategories.length > 0) return cachedCategories;
    cachedCategories = await getCategories();
    return cachedCategories;
  }
  function categoryNameById(id) {
    const s = String(id ?? '');
    const found = (cachedCategories || []).find(c => String(c.category_id) === s);
    return found ? found.name : (id || '—');
  }
  function renderCategoriesTable() {
    const tbody = document.querySelector('#categories .admin-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!cachedCategories || cachedCategories.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#888;">Chưa có danh mục</td></tr>';
      return;
    }
    cachedCategories.forEach(cat => {
      const tr = document.createElement('tr');
      const nameEsc = (cat.name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      const descEsc = (cat.description || '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      tr.innerHTML = `
        <td>${nameEsc}</td>
        <td>${descEsc}</td>
        <td class="admin-food-actions">
          <button type="button" class="btn btn-sm admin-btn-edit btn-edit-category" data-category-id="${(cat.category_id || '').toString().replace(/"/g, '&quot;')}">Sửa</button>
          <button type="button" class="btn btn-sm admin-btn-delete btn-delete-category" data-category-id="${(cat.category_id || '').toString().replace(/"/g, '&quot;')}">Xóa</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.btn-edit-category').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-category-id');
        const cat = cachedCategories.find(c => String(c.category_id) === id);
        if (cat) openEditCategoryModal(cat);
      });
    });
      tbody.querySelectorAll('.btn-delete-category').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-category-id');
          if (!id) return;
          const body = `
            <p style="margin:0 0 16px;color:#eee;">
              Bạn có chắc muốn xóa danh mục này? Các món ăn thuộc danh mục có thể bị ảnh hưởng.
            </p>
          `;
          const footer = `
            <button type="button" class="btn btn-outline" id="modalCatDeleteCancel">Hủy</button>
            <button type="button" class="btn btn-primary" id="modalCatDeleteConfirm" style="background:#c62828;">Xóa</button>
          `;
          openModal('Xóa danh mục', body, footer);
          document.getElementById('modalCatDeleteCancel').addEventListener('click', closeModal);
          document.getElementById('modalCatDeleteConfirm').addEventListener('click', async () => {
            try {
              await deleteCategory(id);
              closeModal();
              await loadCategoriesIfNeeded(true);
              renderCategoriesTable();
              renderFoodsCategoryFilter();
            } catch (err) {
              console.error('Xóa danh mục:', err);
              alert('Lỗi khi xóa: ' + (err?.message || err));
            }
          });
        });
      });
  }
  function openEditCategoryModal(cat) {
    if (!cat || !cat.category_id) return;
    const body = `
      <div class="admin-form-group">
        <label for="modalCatName">Tên danh mục</label>
        <input type="text" id="modalCatName" value="${(cat.name || '').replace(/"/g, '&quot;')}" placeholder="Ví dụ: Pizza, Mì, Nước uống" />
      </div>
      <div class="admin-form-group">
        <label for="modalCatDesc">Mô tả</label>
        <textarea id="modalCatDesc" rows="3" placeholder="Mô tả danh mục">${(cat.description || '').replace(/</g, '&lt;').replace(/&/g, '&amp;')}</textarea>
      </div>
    `;
    const footer = `
      <button type="button" class="btn btn-outline" id="modalCatCancel">Hủy</button>
      <button type="button" class="btn btn-primary" id="modalCatSave">Lưu</button>
    `;
    openModal('Sửa danh mục', body, footer);
    document.getElementById('modalCatCancel').addEventListener('click', closeModal);
    document.getElementById('modalCatSave').addEventListener('click', async () => {
      const name = document.getElementById('modalCatName').value.trim();
      if (!name) {
        alert('Vui lòng nhập tên danh mục.');
        return;
      }
      const description = document.getElementById('modalCatDesc').value.trim();
      try {
        await updateCategory(cat.category_id, { name, description });
        await loadCategoriesIfNeeded(true);
        renderCategoriesTable();
        renderFoodsCategoryFilter();
        alert('Đã cập nhật danh mục.');
        closeModal();
      } catch (err) {
        console.error('Sửa danh mục:', err);
        alert('Lỗi khi lưu: ' + (err?.message || err));
      }
    });
  }
  function renderFoodsCategoryFilter() {
    const select = document.querySelector('#foods .admin-table-toolbar select');
    if (!select) return;
    const options = ['<option value="">Tất cả danh mục</option>']
      .concat((cachedCategories || []).map(c => `<option value="${c.category_id}">${c.name}</option>`));
    select.innerHTML = options.join('');
  }

  // ----- Người dùng: load từ Firebase, Sửa / Xóa -----
  async function renderUsersTable() {
    const tbody = document.getElementById('usersTbody');
    if (!tbody) return;
    try {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">Đang tải...</td></tr>';
      const users = await getUsersList();
      tbody.innerHTML = '';
      if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">Chưa có người dùng</td></tr>';
        return;
      }
      users.forEach(u => {
        const tr = document.createElement('tr');
        const ts = u.created_at;
        const created = ts != null
          ? (typeof ts === 'number' && ts < 1e10 ? new Date(ts * 1000) : new Date(ts)).toLocaleDateString('vi-VN')
          : '—';
        const role = u.role || 'user';
        tr.innerHTML = `
          <td>${u.email || '—'}</td>
          <td>${u.full_name || '—'}</td>
          <td>${role}</td>
          <td>${created}</td>
          <td class="admin-food-actions">
            <button type="button" class="btn btn-sm admin-btn-edit btn-edit-user" data-uid="${u.uid}">Sửa</button>
            <button type="button" class="btn btn-sm admin-btn-delete btn-delete-user" data-uid="${u.uid}">Xóa</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.addEventListener('click', () => openEditUserModal(btn.getAttribute('data-uid')));
      });
      tbody.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', async () => {
          const uid = btn.getAttribute('data-uid');
          if (!uid || !confirm('Xóa người dùng này khỏi danh sách? (Tài khoản đăng nhập vẫn tồn tại)')) return;
          try {
            await deleteUserProfile(uid);
            await renderUsersTable();
          } catch (err) {
            console.error('Xóa user:', err);
            alert('Lỗi: ' + (err?.message || err));
          }
        });
      });
    } catch (err) {
      console.error('renderUsersTable:', err);
      const msg = (err && err.message) || String(err);
      const isPermission = /permission|PERMISSION_DENIED|quyền/i.test(msg);
      const uidInfo = auth.currentUser ? ' UID đăng nhập: <strong>' + auth.currentUser.uid + '</strong> — kiểm tra trong Firebase (users/' + auth.currentUser.uid + ') có field <code>role: "admin"</code>.' : ' Bạn chưa đăng nhập — vào trang Đăng nhập trước, sau đó mở lại trang Admin.';
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#c00;padding:1rem;">'
        + (isPermission
          ? 'Lỗi quyền truy cập: Admin cần quyền đọc node <code>users</code> trong Firebase.' + uidInfo + ' Rules: node <code>users</code> cần có <code>.read": "auth != null && root.child(\'users\').child(auth.uid).child(\'role\').val() === \'admin\'"</code>'
          : 'Lỗi tải dữ liệu: ' + msg)
        + '</td></tr>';
    }
  }

  async function openEditUserModal(uid) {
    let list;
    try {
      list = await getUsersList();
    } catch (e) {
      alert('Không tải được danh sách user: ' + (e?.message || e));
      return;
    }
    const u = list.find(x => x.uid === uid);
    if (!u) return alert('Không tìm thấy user.');
    const body = `
      <div class="admin-form-group">
        <label>Email</label>
        <input type="email" id="modalUserEmail" value="${(u.email || '').replace(/"/g, '&quot;')}" />
      </div>
      <div class="admin-form-group">
        <label>Họ tên</label>
        <input type="text" id="modalUserFullName" value="${(u.full_name || '').replace(/"/g, '&quot;')}" placeholder="Họ tên" />
      </div>
      <div class="admin-form-group">
        <label>Role</label>
        <select id="modalUserRole">
          <option value="user" ${(u.role || '') === 'user' ? 'selected' : ''}>User</option>
          <option value="admin" ${(u.role || '') === 'admin' ? 'selected' : ''}>Admin</option>
          <option value="kitchen" ${(u.role || '') === 'kitchen' ? 'selected' : ''}>Kitchen</option>
        </select>
      </div>
    `;
    const footer = `
      <button type="button" class="btn btn-outline" id="modalUserCancel">Hủy</button>
      <button type="button" class="btn btn-primary" id="modalUserSave">Lưu</button>
    `;
    openModal('Sửa người dùng', body, footer);
    document.getElementById('modalUserCancel').addEventListener('click', closeModal);
    document.getElementById('modalUserSave').addEventListener('click', async () => {
      const email = document.getElementById('modalUserEmail').value.trim();
      const full_name = document.getElementById('modalUserFullName').value.trim();
      const role = document.getElementById('modalUserRole').value || 'user';
      if (!email || !full_name) {
        alert('Vui lòng nhập Email và Họ tên.');
        return;
      }
      try {
        await saveUserProfile(uid, { ...u, email, full_name, role });
        alert('Đã cập nhật.');
        closeModal();
        await renderUsersTable();
      } catch (err) {
        alert('Lỗi: ' + (err?.message || err));
      }
    });
  }

  // ----- Liên hệ: load, Sửa / Xóa -----
  async function renderContactsTable() {
    const tbody = document.getElementById('contactsTbody');
    if (!tbody) return;
    try {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;">Đang tải...</td></tr>';
      const list = await getContacts();
      tbody.innerHTML = '';
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;">Chưa có liên hệ</td></tr>';
        return;
      }
      list.forEach(c => {
        const tr = document.createElement('tr');
        const msg = (c.message || '').slice(0, 50) + ((c.message || '').length > 50 ? '…' : '');
        const date = c.created_at ? new Date(c.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
        tr.innerHTML = `
          <td>${c.full_name || '—'}</td>
          <td>${c.email || '—'}</td>
          <td>${c.phone || '—'}</td>
          <td>${c.subject || '—'}</td>
          <td title="${(c.message || '').replace(/"/g, '&quot;')}">${msg}</td>
          <td class="admin-contact-date">${date}</td>
          <td>${c.status || 'new'}</td>
          <td class="admin-food-actions">
            <button type="button" class="btn btn-sm admin-btn-edit btn-view-contact" data-id="${c.id}">Chi tiết</button>
            <button type="button" class="btn btn-sm admin-btn-edit btn-edit-contact" data-id="${c.id}">Sửa</button>
            <button type="button" class="btn btn-sm admin-btn-delete btn-delete-contact" data-id="${c.id}">Xóa</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.btn-view-contact').forEach(btn => {
        btn.addEventListener('click', () => openViewContactModal(btn.getAttribute('data-id')));
      });
      tbody.querySelectorAll('.btn-edit-contact').forEach(btn => {
        btn.addEventListener('click', () => openEditContactModal(btn.getAttribute('data-id')));
      });
      tbody.querySelectorAll('.btn-delete-contact').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (!id || !confirm('Xóa liên hệ này?')) return;
          try {
            await deleteContact(id);
            await renderContactsTable();
          } catch (err) {
            alert('Lỗi: ' + (err?.message || err));
          }
        });
      });
    } catch (err) {
      console.error('renderContactsTable:', err);
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#c00;">Lỗi tải dữ liệu</td></tr>';
    }
  }

  function openViewContactModal(id) {
    getContacts().then(list => {
      const c = list.find(x => x.id === id);
      if (!c) return alert('Không tìm thấy liên hệ.');
      const dateFull = c.created_at ? new Date(c.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
      const statusText = { new: 'Mới', read: 'Đã đọc', replied: 'Đã phản hồi' }[c.status || 'new'] || c.status;
      const body = `
        <div class="admin-order-detail">
          <p><strong>Họ tên:</strong> ${(c.full_name || '—').replace(/</g, '&lt;')}</p>
          <p><strong>Email:</strong> ${(c.email || '—').replace(/</g, '&lt;')}</p>
          <p><strong>Điện thoại:</strong> ${(c.phone || '—').replace(/</g, '&lt;')}</p>
          <p><strong>Tiêu đề:</strong> ${(c.subject || '—').replace(/</g, '&lt;')}</p>
          <p><strong>Ngày gửi:</strong> ${dateFull}</p>
          <p><strong>Trạng thái:</strong> ${statusText}</p>
          <p><strong>Nội dung:</strong></p>
          <div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;margin-top:6px;white-space:pre-wrap;word-break:break-word;">${(c.message || '—').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
      `;
      const footer = `<button type="button" class="btn btn-primary" id="modalContactViewClose">Đóng</button>`;
      openModal('Chi tiết liên hệ', body, footer);
      document.getElementById('modalContactViewClose').addEventListener('click', closeModal);
    });
  }

  async function openEditContactModal(id) {
    const list = await getContacts();
    const c = list.find(x => x.id === id);
    if (!c) return alert('Không tìm thấy liên hệ.');
    const body = `
      <div class="admin-form-group">
        <label>Họ tên</label>
        <input type="text" id="modalContactName" value="${(c.full_name || '').replace(/"/g, '&quot;')}" />
      </div>
      <div class="admin-form-group">
        <label>Email</label>
        <input type="email" id="modalContactEmail" value="${(c.email || '').replace(/"/g, '&quot;')}" />
      </div>
      <div class="admin-form-group">
        <label>Điện thoại</label>
        <input type="text" id="modalContactPhone" value="${(c.phone || '').replace(/"/g, '&quot;')}" />
      </div>
      <div class="admin-form-group">
        <label>Tiêu đề</label>
        <input type="text" id="modalContactSubject" value="${(c.subject || '').replace(/"/g, '&quot;')}" />
      </div>
      <div class="admin-form-group">
        <label>Nội dung</label>
        <textarea id="modalContactMessage" rows="4">${(c.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
      </div>
      <div class="admin-form-group">
        <label>Trạng thái</label>
        <select id="modalContactStatus">
          <option value="new" ${(c.status || '') === 'new' ? 'selected' : ''}>Mới</option>
          <option value="read" ${(c.status || '') === 'read' ? 'selected' : ''}>Đã đọc</option>
          <option value="replied" ${(c.status || '') === 'replied' ? 'selected' : ''}>Đã phản hồi</option>
        </select>
      </div>
    `;
    const footer = `
      <button type="button" class="btn btn-outline" id="modalContactCancel">Hủy</button>
      <button type="button" class="btn btn-primary" id="modalContactSave">Lưu</button>
    `;
    openModal('Sửa liên hệ', body, footer);
    document.getElementById('modalContactCancel').addEventListener('click', closeModal);
    document.getElementById('modalContactSave').addEventListener('click', async () => {
      try {
        await updateContact(id, {
          full_name: document.getElementById('modalContactName').value.trim(),
          email: document.getElementById('modalContactEmail').value.trim(),
          phone: document.getElementById('modalContactPhone').value.trim(),
          subject: document.getElementById('modalContactSubject').value.trim(),
          message: document.getElementById('modalContactMessage').value.trim(),
          status: document.getElementById('modalContactStatus').value
        });
        alert('Đã cập nhật.');
        closeModal();
        await renderContactsTable();
      } catch (err) {
        alert('Lỗi: ' + (err?.message || err));
      }
    });
  }

  // ----- Đánh giá: chỉ xem + Xóa -----
  async function renderReviewsTable() {
    const tbody = document.getElementById('reviewsTbody');
    if (!tbody) return;
    try {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">Đang tải...</td></tr>';
      const list = await getReviews();
      tbody.innerHTML = '';
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">Chưa có đánh giá</td></tr>';
        return;
      }
      list.forEach(r => {
        const tr = document.createElement('tr');
        const date = r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : '—';
        const stars = r.rating ?? r.stars ?? '—';
        tr.innerHTML = `
          <td>${r.user_name || r.user_id || '—'}</td>
          <td>${stars}</td>
          <td>${(r.content || '').slice(0, 60)}${(r.content || '').length > 60 ? '…' : ''}</td>
          <td>${date}</td>
          <td>
            <button type="button" class="btn btn-sm admin-btn-delete btn-delete-review" data-id="${r.id}">Xóa</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.btn-delete-review').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          if (!id) return;
          const body = '<p style="margin:0 0 16px;color:#eee;">Bạn có chắc muốn xóa đánh giá này?</p>';
          const footer = `
            <button type="button" class="btn btn-outline" id="modalReviewDeleteCancel">Hủy</button>
            <button type="button" class="btn btn-primary" id="modalReviewDeleteConfirm" style="background:#c62828;">Xóa</button>
          `;
          openModal('Xóa đánh giá', body, footer);
          document.getElementById('modalReviewDeleteCancel').addEventListener('click', closeModal);
          document.getElementById('modalReviewDeleteConfirm').addEventListener('click', async () => {
            try {
              await deleteReview(id);
              closeModal();
              await renderReviewsTable();
            } catch (err) {
              closeModal();
              alert('Lỗi: ' + (err?.message || err));
            }
          });
        });
      });
    } catch (err) {
      console.error('renderReviewsTable:', err);
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#c00;">Lỗi tải dữ liệu</td></tr>';
    }
  }

  // ----- Đơn hàng: tải từ Firebase, Duyệt / Hủy (kèm lý do) -----
  function orderStatusText(s, order) {
    const map = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', ready: 'Đã gửi bếp', delivering: 'Đã gửi ship', completed: 'Hoàn thành', cancelled: 'Đã hủy' };
    if (s === 'ready' && order) {
      const ks = order.kitchen_status || '';
      if (ks === 'cooking') return 'Đang chế biến';
      if (ks === 'done') return 'Đã chế biến xong';
    }
    return map[s] || s || '—';
  }

  async function renderOrdersTable(ordersList) {
    const tbody = document.getElementById('ordersTbody');
    const filterSelect = document.getElementById('ordersFilterStatus');
    if (!tbody) return;
    try {
      let list;
      if (ordersList !== undefined && Array.isArray(ordersList)) {
        list = ordersList;
      } else {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;">Đang tải...</td></tr>';
        list = await getOrders();
      }
      list = list.sort((a, b) => new Date(b.order_date || b.created_at || 0) - new Date(a.order_date || a.created_at || 0));
      const statusFilter = filterSelect ? filterSelect.value : '';
      if (statusFilter) list = list.filter(o => (o.status || 'pending') === statusFilter);
      currentOrdersList = Array.isArray(list) ? list : [];
      cachedOrders = currentOrdersList;
      tbody.innerHTML = '';
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;">Chưa có đơn hàng</td></tr>';
        document.getElementById('ordersPagination').innerHTML = '';
        return;
      }
      const totalPagesOrders = Math.ceil(list.length / ADMIN_PAGE_SIZE);
      ordersCurrentPage = Math.max(1, Math.min(ordersCurrentPage, totalPagesOrders));
      const pageList = list.slice((ordersCurrentPage - 1) * ADMIN_PAGE_SIZE, ordersCurrentPage * ADMIN_PAGE_SIZE);
      pageList.forEach(o => {
        const tr = document.createElement('tr');
        const status = o.status || 'pending';
        const dateStr = (o.order_date || o.created_at) ? new Date(o.order_date || o.created_at).toLocaleString('vi-VN') : '—';
        const totalStr = o.total_price != null ? new Intl.NumberFormat('vi-VN').format(o.total_price) + ' ₫' : '—';
        const canApprove = status === 'pending';
        const canSendKitchen = status === 'confirmed';
        const canSendShip = status === 'ready' && (o.kitchen_status || '') === 'done';
        const canDeliver = status === 'delivering';
        const canCancel = status !== 'cancelled' && status !== 'completed';
        const cancelReason = status === 'cancelled' ? (o.cancel_reason || '—') : '—';
        const ks = o.kitchen_status || '';
        const statusClass = status === 'ready' && ks ? ` status-ready-${ks}` : '';
        tr.innerHTML = `
          <td>#${o.id}</td>
          <td>${o.customer_name || '—'}</td>
          <td>${totalStr}</td>
          <td><span class="account-status status-${status}${statusClass}">${orderStatusText(status, o)}</span></td>
          <td>${dateStr}</td>
          <td style="max-width:200px;word-break:break-word;">${cancelReason}</td>
          <td class="admin-food-actions">
            <button type="button" class="btn btn-sm admin-btn-edit btn-order-view" data-order-id="${o.id}">Chi tiết</button>
            ${canApprove ? '<button type="button" class="btn btn-sm admin-btn-edit btn-order-approve" data-order-id="' + o.id + '">Duyệt</button>' : ''}
            ${canSendKitchen ? '<button type="button" class="btn btn-sm admin-btn-edit btn-order-send-kitchen" data-order-id="' + o.id + '">Gửi bếp</button>' : ''}
            ${canSendShip ? '<button type="button" class="btn btn-sm admin-btn-edit btn-order-send-ship" data-order-id="' + o.id + '">Gửi ship</button>' : ''}
            ${canDeliver ? '<button type="button" class="btn btn-sm admin-btn-edit btn-order-deliver" data-order-id="' + o.id + '">Đã giao hàng</button>' : ''}
            ${canCancel ? '<button type="button" class="btn btn-sm admin-btn-delete btn-order-cancel" data-order-id="' + o.id + '">Hủy</button>' : ''}
          </td>
        `;
        tbody.appendChild(tr);
      });
      // Xem chi tiết đơn hàng
      tbody.querySelectorAll('.btn-order-view').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-order-id');
          if (!id) return;
          const order = cachedOrders.find(o => String(o.id) === String(id));
          if (!order) return;
          const items = Array.isArray(order.items) ? order.items : [];
          const itemsHtml = items.length
            ? items.map(it => {
                const qty = it.quantity || 1;
                const name = it.product_name || it.name || 'Món';
                const size = it.size ? ` <span style="font-size:0.8rem;color:#ffb347;">(Size ${it.size})</span>` : '';
                let addons = '';
                if (Array.isArray(it.addons) && it.addons.length) {
                  addons =
                    '<ul style="margin:4px 0 0 16px;padding:0;font-size:0.85rem;color:#ccc;">' +
                    it.addons
                      .map(a => {
                        const n = a.name || a.addon_name || 'Món thêm';
                        const q = a.quantity || 1;
                        return `<li>+ ${n}${q > 1 ? ' x' + q : ''}</li>`;
                      })
                      .join('') +
                    '</ul>';
                }
                return `<li style="margin-bottom:4px;">${name} x ${qty}${size}${addons}</li>`;
              }).join('')
            : '<li>Không có món trong đơn.</li>';
          const pm = (order.payment_method || '').toLowerCase();
          let payment = 'Đã thanh toán trực tuyến';
          if (pm === 'cod') payment = 'Thanh toán khi nhận hàng (COD)';
          else if (pm === 'vietqr') {
            const ps = (order.payment_status || '').toLowerCase();
            payment = ps === 'pending_confirm' ? 'VietQR (chờ xác nhận)' : 'VietQR';
          }
          const body = `
            <div class="admin-order-detail">
              <p><strong>Khách hàng:</strong> ${order.customer_name || '—'}</p>
              <p><strong>Số điện thoại:</strong> ${order.customer_phone || '—'}</p>
              <p><strong>Email:</strong> ${order.customer_email || '—'}</p>
              <p><strong>Địa chỉ giao hàng:</strong> ${order.delivery_address || '—'}</p>
              <p><strong>Phương thức thanh toán:</strong> ${payment}</p>
              <p><strong>Trạng thái:</strong> ${orderStatusText(order.status || 'pending', order)}</p>
              <p><strong>Ghi chú:</strong> ${order.note || '—'}</p>
              <p><strong>Tổng tiền:</strong> ${
                order.total_price != null ? new Intl.NumberFormat('vi-VN').format(order.total_price) + ' ₫' : '—'
              }</p>
              <hr style="border-color:rgba(255,255,255,0.1);margin:12px 0;" />
              <p><strong>Danh sách món:</strong></p>
              <ul style="margin:4px 0 0 18px;padding:0;list-style:disc;">
                ${itemsHtml}
              </ul>
            </div>
          `;
          const isVietQrPending = pm === 'vietqr' && ((order.payment_status || '').toLowerCase() === 'pending_confirm');
          const footer = `
            ${isVietQrPending ? '<button type="button" class="btn btn-primary" id="modalOrderConfirmVietQr" style="margin-right:8px;"><i class="fas fa-check"></i> Xác nhận đã chuyển khoản</button>' : ''}
            <button type="button" class="btn btn-primary" id="modalOrderDetailClose">Đóng</button>
          `;
          openModal('Chi tiết đơn #' + order.id, body, footer);
          document.getElementById('modalOrderDetailClose').addEventListener('click', closeModal);
          if (isVietQrPending) {
            document.getElementById('modalOrderConfirmVietQr').addEventListener('click', async () => {
              try {
                await updateOrder(order.id, { payment_status: 'confirmed' });
                closeModal();
                await renderOrdersTable();
                if (typeof loadDashboardStats === 'function') loadDashboardStats();
              } catch (err) {
                console.error('Confirm VietQR:', err);
              }
            });
          }
        });
      });

      tbody.querySelectorAll('.btn-order-approve').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-order-id');
          if (!id) return;
          const body = '<p style="margin:0 0 16px;color:#eee;">Duyệt đơn hàng này?</p>';
          const footer = `
            <button type="button" class="btn btn-outline" id="modalOrderApproveCancel">Hủy</button>
            <button type="button" class="btn btn-primary" id="modalOrderApproveConfirm">Duyệt</button>
          `;
          openModal('Duyệt đơn hàng', body, footer);
          document.getElementById('modalOrderApproveCancel').addEventListener('click', closeModal);
          document.getElementById('modalOrderApproveConfirm').addEventListener('click', async () => {
            try {
              await updateOrder(id, { status: 'confirmed' });
              await renderOrdersTable();
            } catch (err) {
              alert('Lỗi: ' + (err?.message || err));
            } finally {
              closeModal();
            }
          });
        });
      });
      tbody.querySelectorAll('.btn-order-send-kitchen').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-order-id');
          if (!id) return;
          const body = '<p style="margin:0 0 16px;color:#eee;">Gửi đơn này xuống bếp?</p>';
          const footer = `
            <button type="button" class="btn btn-outline" id="modalOrderKitchenCancel">Hủy</button>
            <button type="button" class="btn btn-primary" id="modalOrderKitchenConfirm">Gửi bếp</button>
          `;
          openModal('Gửi bếp', body, footer);
          document.getElementById('modalOrderKitchenCancel').addEventListener('click', closeModal);
          document.getElementById('modalOrderKitchenConfirm').addEventListener('click', async () => {
            try {
              await updateOrder(id, { status: 'ready' });
              await renderOrdersTable();
            } catch (err) {
              alert('Lỗi: ' + (err?.message || err));
            } finally {
              closeModal();
            }
          });
        });
      });
      tbody.querySelectorAll('.btn-order-send-ship').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-order-id');
          if (!id) return;
          const body = '<p style="margin:0 0 16px;color:#eee;">Gửi đơn cho shipper (đang giao hàng)?</p>';
          const footer = `
            <button type="button" class="btn btn-outline" id="modalOrderShipCancel">Hủy</button>
            <button type="button" class="btn btn-primary" id="modalOrderShipConfirm">Gửi ship</button>
          `;
          openModal('Gửi ship', body, footer);
          document.getElementById('modalOrderShipCancel').addEventListener('click', closeModal);
          document.getElementById('modalOrderShipConfirm').addEventListener('click', async () => {
            try {
              await updateOrder(id, { status: 'delivering' });
              await renderOrdersTable();
            } catch (err) {
              alert('Lỗi: ' + (err?.message || err));
            } finally {
              closeModal();
            }
          });
        });
      });
      tbody.querySelectorAll('.btn-order-deliver').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-order-id');
          if (!id) return;
          const body = '<p style="margin:0 0 16px;color:#eee;">Xác nhận đã giao hàng? Đơn sẽ được tính vào doanh thu.</p>';
          const footer = `
            <button type="button" class="btn btn-outline" id="modalOrderDeliverCancel">Hủy</button>
            <button type="button" class="btn btn-primary" id="modalOrderDeliverConfirm">Đã giao hàng</button>
          `;
          openModal('Đã giao hàng', body, footer);
          document.getElementById('modalOrderDeliverCancel').addEventListener('click', closeModal);
          document.getElementById('modalOrderDeliverConfirm').addEventListener('click', async () => {
            try {
              await updateOrder(id, { status: 'completed', completed_at: new Date().toISOString() });
              await renderOrdersTable();
              if (typeof loadDashboardStats === 'function') loadDashboardStats();
            } catch (err) {
              alert('Lỗi: ' + (err?.message || err));
            } finally {
              closeModal();
            }
          });
        });
      });
      tbody.querySelectorAll('.btn-order-cancel').forEach(btn => {
        btn.addEventListener('click', () => openCancelOrderModal(btn.getAttribute('data-order-id')));
      });
      const paginationEl = document.getElementById('ordersPagination');
      if (paginationEl) {
        const totalPages = Math.ceil(currentOrdersList.length / ADMIN_PAGE_SIZE);
        if (totalPages <= 1) {
          paginationEl.innerHTML = '';
        } else {
          paginationEl.innerHTML = `
            <span class="admin-pagination-info">Trang ${ordersCurrentPage} / ${totalPages}</span>
            <div class="admin-pagination-btns">
              <button type="button" class="btn btn-sm btn-outline admin-pagination-prev" ${ordersCurrentPage <= 1 ? 'disabled' : ''}>Trước</button>
              <button type="button" class="btn btn-sm btn-outline admin-pagination-next" ${ordersCurrentPage >= totalPages ? 'disabled' : ''}>Sau</button>
            </div>
          `;
          paginationEl.querySelector('.admin-pagination-prev')?.addEventListener('click', () => {
            if (ordersCurrentPage > 1) { ordersCurrentPage--; renderOrdersTable(currentOrdersList); }
          });
          paginationEl.querySelector('.admin-pagination-next')?.addEventListener('click', () => {
            if (ordersCurrentPage < totalPages) { ordersCurrentPage++; renderOrdersTable(currentOrdersList); }
          });
        }
      }
    } catch (err) {
      console.error('renderOrdersTable:', err);
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#c00;">Lỗi tải dữ liệu</td></tr>';
    }
  }

  function openCancelOrderModal(orderId) {
    const body = `
      <div class="admin-form-group">
        <label for="modalCancelReason">Lý do hủy đơn (thông báo gửi đến khách hàng) <span style="color:#c00;">*</span></label>
        <textarea id="modalCancelReason" rows="4" placeholder="Ví dụ: Hết nguyên liệu, khách hàng yêu cầu hủy..." required></textarea>
      </div>
    `;
    const footer = `
      <button type="button" class="btn btn-outline" id="modalCancelOrderClose">Đóng</button>
      <button type="button" class="btn btn-primary" id="modalCancelOrderConfirm" style="background:#c62828;">Xác nhận hủy đơn</button>
    `;
    openModal('Hủy đơn hàng #' + orderId, body, footer);
    document.getElementById('modalCancelOrderClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelOrderConfirm').addEventListener('click', async () => {
      const reason = document.getElementById('modalCancelReason').value.trim();
      if (!reason) {
        alert('Vui lòng nhập lý do hủy đơn để gửi đến khách hàng.');
        return;
      }
      try {
        await updateOrder(orderId, {
          status: 'cancelled',
          cancel_reason: reason,
          cancelled_at: new Date().toISOString()
        });
        alert('Đã hủy đơn. Khách hàng sẽ thấy trạng thái và lý do trên trang tài khoản.');
        closeModal();
        await renderOrdersTable();
      } catch (err) {
        alert('Lỗi: ' + (err?.message || err));
      }
    });
  }

  // Render bảng món ăn từ Firebase
  async function renderFoodsTable(productsList) {
    const tbody = document.querySelector('#foods .admin-table tbody');
    if (!tbody) return;
    try {
      let products;
      if (productsList !== undefined && Array.isArray(productsList)) {
        products = productsList;
      } else {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;">Đang tải...</td></tr>';
        await loadCategoriesIfNeeded();
        products = await getProducts();
      }
      currentFoodsList = Array.isArray(products) ? products : [];
      tbody.innerHTML = '';
      if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;">Chưa có món ăn</td></tr>';
        const paginationEl = document.getElementById('foodsPagination');
        if (paginationEl) paginationEl.innerHTML = '';
        return;
      }
      const totalPagesFoods = Math.ceil(products.length / ADMIN_PAGE_SIZE);
      foodsCurrentPage = Math.max(1, Math.min(foodsCurrentPage, totalPagesFoods));
      const pageList = products.slice((foodsCurrentPage - 1) * ADMIN_PAGE_SIZE, foodsCurrentPage * ADMIN_PAGE_SIZE);
      pageList.forEach(p => {
        const tr = document.createElement('tr');
        const price = p.price != null ? new Intl.NumberFormat('vi-VN').format(p.price) + ' ₫' : '—';
        tr.innerHTML = `
          <td>${p.product_name || '—'}</td>
          <td>${price}</td>
          <td>Size</td>
          <td>—</td>
          <td>Topping</td>
          <td>—</td>
          <td>${categoryNameById(p.category_id)}</td>
          <td class="admin-food-actions">
            <button type="button" class="btn btn-sm admin-btn-edit btn-edit-food" data-id="${p.product_id}">Sửa</button>
            <button type="button" class="btn btn-sm admin-btn-delete btn-delete-food" data-id="${p.product_id}">Xóa</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      // Event delegation: Sửa / Xóa
      tbody.querySelectorAll('.btn-edit-food').forEach(btn => {
        btn.addEventListener('click', () => openEditFoodModal(btn.getAttribute('data-id')));
      });
      tbody.querySelectorAll('.btn-delete-food').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      const body = `
        <p style="margin:0 0 16px;color:#eee;">Bạn có chắc muốn xóa món ăn này khỏi menu?</p>
      `;
      const footer = `
        <button type="button" class="btn btn-outline" id="modalFoodDeleteCancel">Hủy</button>
        <button type="button" class="btn btn-primary" id="modalFoodDeleteConfirm" style="background:#c62828;">Xóa</button>
      `;
      openModal('Xóa món ăn', body, footer);
      document.getElementById('modalFoodDeleteCancel').addEventListener('click', closeModal);
      document.getElementById('modalFoodDeleteConfirm').addEventListener('click', async () => {
        try {
          await deleteProduct(id);
          closeModal();
          await renderFoodsTable();
        } catch (err) {
          console.error('Xóa món:', err);
          alert('Lỗi khi xóa: ' + (err?.message || err));
        }
      });
    });
      });
      renderFoodsCategoryFilter();
      const paginationEl = document.getElementById('foodsPagination');
      if (paginationEl) {
        const totalPages = Math.ceil(currentFoodsList.length / ADMIN_PAGE_SIZE);
        if (totalPages <= 1) {
          paginationEl.innerHTML = '';
        } else {
          paginationEl.innerHTML = `
            <span class="admin-pagination-info">Trang ${foodsCurrentPage} / ${totalPages}</span>
            <div class="admin-pagination-btns">
              <button type="button" class="btn btn-sm btn-outline admin-pagination-prev" ${foodsCurrentPage <= 1 ? 'disabled' : ''}>Trước</button>
              <button type="button" class="btn btn-sm btn-outline admin-pagination-next" ${foodsCurrentPage >= totalPages ? 'disabled' : ''}>Sau</button>
            </div>
          `;
          paginationEl.querySelector('.admin-pagination-prev')?.addEventListener('click', () => {
            if (foodsCurrentPage > 1) { foodsCurrentPage--; renderFoodsTable(currentFoodsList); }
          });
          paginationEl.querySelector('.admin-pagination-next')?.addEventListener('click', () => {
            if (foodsCurrentPage < totalPages) { foodsCurrentPage++; renderFoodsTable(currentFoodsList); }
          });
        }
      }
    } catch (err) {
      console.error('renderFoodsTable:', err);
      const tbody = document.querySelector('#foods .admin-table tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#c00;">Lỗi tải dữ liệu: ' + (err.message || err) + '</td></tr>';
    }
  }

  async function openEditFoodModal(productId) {
    if (!productId) return;
    await loadCategoriesIfNeeded(true);
    const categoryOptions = ['<option value="">-- Chọn danh mục --</option>']
      .concat((cachedCategories || []).map(c => `<option value="${c.category_id}">${c.name}</option>`))
      .join('');
    const body = `
      <input type="hidden" id="modalFoodProductId" value="${productId}" />
      <div class="admin-form-group">
        <label for="modalFoodName">Tên món</label>
        <input type="text" id="modalFoodName" placeholder="Ví dụ: Pizza Margherita" />
      </div>
      <div class="admin-form-group">
        <label for="modalFoodImage">Hình ảnh (để trống giữ ảnh cũ)</label>
        <input type="file" id="modalFoodImage" accept="image/*" />
      </div>
      <div class="admin-form-group admin-form-row admin-form-row-3">
        <div><label>Giá size Nhỏ (VNĐ)</label><input type="number" id="modalFoodPriceSmall" min="0" placeholder="0" /></div>
        <div><label>Giá size Vừa (VNĐ)</label><input type="number" id="modalFoodPriceMedium" min="0" placeholder="0" /></div>
        <div><label>Giá size Lớn (VNĐ)</label><input type="number" id="modalFoodPriceLarge" min="0" placeholder="0" /></div>
      </div>
      <div class="admin-form-group admin-form-row admin-form-row-3">
        <div><label>Calories size Nhỏ</label><input type="number" id="modalFoodCalSmall" min="0" placeholder="0" /></div>
        <div><label>Calories size Vừa</label><input type="number" id="modalFoodCalMedium" min="0" placeholder="0" /></div>
        <div><label>Calories size Lớn</label><input type="number" id="modalFoodCalLarge" min="0" placeholder="0" /></div>
      </div>
      <div class="admin-form-group">
        <label>Topping (tên, giá VNĐ, calories)</label>
        <div id="modalFoodToppingsContainer"></div>
        <button type="button" class="btn btn-outline btn-sm" id="modalFoodAddTopping" style="margin-top:6px;">Thêm topping</button>
      </div>
      <div class="admin-form-group">
        <label for="modalFoodDesc">Mô tả</label>
        <textarea id="modalFoodDesc" rows="3" placeholder="Mô tả món ăn"></textarea>
      </div>
      <div class="admin-form-group">
        <label for="modalFoodCategory">Danh mục</label>
        <select id="modalFoodCategory">${categoryOptions}</select>
      </div>
    `;
    const footer = `
      <button type="button" class="btn btn-outline" id="modalFoodCancel">Hủy</button>
      <button type="button" class="btn btn-primary" id="modalFoodSave">Lưu</button>
    `;
    openModal('Sửa món ăn', body, footer);

    let product, details;
    try {
      product = await getProductById(productId);
      details = await getProductDetailsByProductId(productId);
    } catch (e) {
      console.error('Load món để sửa:', e);
      alert('Không tải được dữ liệu món: ' + (e?.message || e));
      return;
    }
    if (!product) {
      alert('Không tìm thấy món.');
      return;
    }
    const d = details && details[0] ? details[0] : {};
    const sizes = d.sizes || {};
    const addons = d.addons || {};

    document.getElementById('modalFoodName').value = product.product_name || '';
    document.getElementById('modalFoodPriceSmall').value = sizes.S?.price ?? '';
    document.getElementById('modalFoodPriceMedium').value = sizes.M?.price ?? '';
    document.getElementById('modalFoodPriceLarge').value = sizes.L?.price ?? '';
    document.getElementById('modalFoodCalSmall').value = sizes.S?.calories ?? '';
    document.getElementById('modalFoodCalMedium').value = sizes.M?.calories ?? '';
    document.getElementById('modalFoodCalLarge').value = sizes.L?.calories ?? '';
    document.getElementById('modalFoodDesc').value = product.description || '';
    const catSelect = document.getElementById('modalFoodCategory');
    if (catSelect) catSelect.value = product.category_id || '';

    const container = document.getElementById('modalFoodToppingsContainer');
    const addonList = Object.entries(addons).filter(([, v]) => v && (v.addon_name || v.name));
    if (addonList.length === 0) {
      const row = document.createElement('div');
      row.className = 'admin-topping-row';
      row.innerHTML = `
        <input type="text" placeholder="Tên topping" class="modal-topping-name" />
        <input type="number" min="0" placeholder="Giá (VNĐ)" class="modal-topping-price" />
        <input type="number" min="0" placeholder="Calories" class="modal-topping-cal" />
        <button type="button" class="btn btn-outline btn-sm btn-remove-row">Xóa</button>
      `;
      row.querySelector('.btn-remove-row').addEventListener('click', () => {
        if (container.querySelectorAll('.admin-topping-row').length > 1) row.remove();
      });
      container.appendChild(row);
    } else {
      addonList.forEach(([, v]) => {
        const name = v.addon_name ?? v.name ?? '';
        const price = v.addon_price ?? v.price ?? 0;
        const cal = v.calories ?? 0;
        const row = document.createElement('div');
        row.className = 'admin-topping-row';
        row.innerHTML = `
          <input type="text" placeholder="Tên topping" class="modal-topping-name" value="${name}" />
          <input type="number" min="0" placeholder="Giá (VNĐ)" class="modal-topping-price" value="${price}" />
          <input type="number" min="0" placeholder="Calories" class="modal-topping-cal" value="${cal}" />
          <button type="button" class="btn btn-outline btn-sm btn-remove-row">Xóa</button>
        `;
        row.querySelector('.btn-remove-row').addEventListener('click', () => {
          if (container.querySelectorAll('.admin-topping-row').length > 1) row.remove();
        });
        container.appendChild(row);
      });
    }
    document.getElementById('modalFoodAddTopping').addEventListener('click', () => {
      const row = document.createElement('div');
      row.className = 'admin-topping-row';
      row.innerHTML = `
        <input type="text" placeholder="Tên topping" class="modal-topping-name" />
        <input type="number" min="0" placeholder="Giá (VNĐ)" class="modal-topping-price" />
        <input type="number" min="0" placeholder="Calories" class="modal-topping-cal" />
        <button type="button" class="btn btn-outline btn-sm btn-remove-row">Xóa</button>
      `;
      row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
      container.appendChild(row);
    });

    document.getElementById('modalFoodCancel').addEventListener('click', closeModal);
    document.getElementById('modalFoodSave').addEventListener('click', async () => {
      const name = document.getElementById('modalFoodName').value.trim();
      if (!name) {
        alert('Vui lòng nhập tên món.');
        return;
      }
      const priceSmall = parseInt(document.getElementById('modalFoodPriceSmall').value, 10) || 0;
      const priceMedium = parseInt(document.getElementById('modalFoodPriceMedium').value, 10) || 0;
      const priceLarge = parseInt(document.getElementById('modalFoodPriceLarge').value, 10) || 0;
      const calSmall = parseInt(document.getElementById('modalFoodCalSmall').value, 10) || 0;
      const calMedium = parseInt(document.getElementById('modalFoodCalMedium').value, 10) || 0;
      const calLarge = parseInt(document.getElementById('modalFoodCalLarge').value, 10) || 0;
      const price = priceMedium || priceSmall || priceLarge || 0;
      const toppings = [];
      container.querySelectorAll('.admin-topping-row').forEach(row => {
        const n = row.querySelector('.modal-topping-name').value.trim();
        const p = parseInt(row.querySelector('.modal-topping-price').value, 10) || 0;
        const c = parseInt(row.querySelector('.modal-topping-cal').value, 10) || 0;
        if (n) toppings.push({ name: n, price: p, calories: c });
      });
      const categoryId = document.getElementById('modalFoodCategory').value || '';
      const description = document.getElementById('modalFoodDesc').value.trim();

      let imageUrl = product.image_url || '';
      const fileInput = document.getElementById('modalFoodImage');
      if (fileInput?.files?.length) {
        try {
          imageUrl = await uploadToCloudinary(fileInput.files[0]);
        } catch (uploadErr) {
          console.warn('Upload Cloudinary lỗi:', uploadErr);
          alert('Ảnh chưa upload được, giữ ảnh cũ. ' + (uploadErr.message || ''));
        }
      }
      try {
        await updateProduct(productId, {
          product_name: name,
          price,
          image_url: imageUrl,
          description,
          category_id: categoryId,
          calories: calMedium || calSmall || calLarge || 0
        });
        const sizes = {
          S: { price: priceSmall, calories: calSmall },
          M: { price: priceMedium, calories: calMedium },
          L: { price: priceLarge, calories: calLarge }
        };
        const addonsObj = {};
        toppings.forEach((t, i) => {
          addonsObj['topping_' + i] = { addon_name: t.name, addon_price: t.price, calories: t.calories };
        });
        await setProductDetails(productId, { sizes, addons: addonsObj });
        showAdminToast('Đã lưu món ăn vào menu.');
        closeModal();
        await renderFoodsTable();
      } catch (err) {
        console.error('Cập nhật món:', err);
        alert('Lỗi khi cập nhật: ' + (err?.message || err));
      }
    });
  }

  // Khi vào trang admin, nếu đang ở tab Món ăn thì load luôn
  const hash = window.location.hash.slice(1) || 'dashboard';
  if (hash === 'foods') {
    const foodsLink = document.querySelector('.admin-nav-link[href="#foods"]');
    if (foodsLink) {
      navLinks.forEach(l => l.classList.remove('admin-nav-link--active'));
      foodsLink.classList.add('admin-nav-link--active');
      showSection('foods');
      renderFoodsTable();
    }
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      e.preventDefault();
      const targetId = href.slice(1);
      navLinks.forEach(l => l.classList.remove('admin-nav-link--active'));
      link.classList.add('admin-nav-link--active');
      showSection(targetId);
      if (targetId === 'dashboard') loadDashboardStats();
      if (targetId === 'foods') renderFoodsTable();
      if (targetId === 'categories') {
        loadCategoriesIfNeeded(true).then(() => {
          renderCategoriesTable();
          renderFoodsCategoryFilter();
        });
      }
      if (targetId === 'users') renderUsersTable();
      if (targetId === 'orders') renderOrdersTable();
      if (targetId === 'contacts') renderContactsTable();
      if (targetId === 'reviews') renderReviewsTable();
    });
  });

  const ordersFilterStatus = document.getElementById('ordersFilterStatus');
  if (ordersFilterStatus) ordersFilterStatus.addEventListener('change', () => { ordersCurrentPage = 1; renderOrdersTable(); });
  // Realtime: tự cập nhật bảng đơn khi Firebase thay đổi (bếp đổi trạng thái, admin khác thao tác...)
  subscribeOrders((list) => renderOrdersTable(list));

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      const body = '<p style="margin:0;color:#333;">Bạn có chắc chắn muốn đăng xuất khỏi tài khoản admin?</p>';
      const footer = `
        <button type="button" class="btn btn-outline" id="adminLogoutCancel">Hủy</button>
        <button type="button" class="btn btn-primary" id="adminLogoutConfirm">Xác nhận đăng xuất</button>
      `;
      openModal('Xác nhận đăng xuất', body, footer);
      document.getElementById('adminLogoutCancel').addEventListener('click', () => closeModal());
      document.getElementById('adminLogoutConfirm').addEventListener('click', async () => {
        try {
          await logout();
          window.location.href = 'auth.html';
        } catch (err) {
          console.error('Logout error:', err);
          window.location.href = 'auth.html';
        }
      });
    });
  }

  // --- Modal ---
  function openModal(title, bodyHtml, footerHtml) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml || '';
    modalFooter.innerHTML = footerHtml || '';
    backdrop.setAttribute('aria-hidden', 'false');
    backdrop.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.style.display = 'none';
    document.body.style.overflow = '';
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop.getAttribute('aria-hidden') === 'false') closeModal();
  });

  // --- Thêm người dùng ---
  const btnRefreshUsers = document.getElementById('btnRefreshUsers');
  if (btnRefreshUsers) {
    btnRefreshUsers.addEventListener('click', () => {
      renderUsersTable();
    });
  }

  const btnAddUser = document.getElementById('btnAddUser');
  if (btnAddUser) {
    btnAddUser.addEventListener('click', () => {
  const body = `
        <div class="admin-form-group">
          <label for="modalUserEmail">Email</label>
          <input type="email" id="modalUserEmail" placeholder="email@example.com" />
        </div>
        <div class="admin-form-group">
          <label for="modalUserFullName">Họ tên</label>
          <input type="text" id="modalUserFullName" placeholder="Nguyễn Văn A" />
        </div>
        <p class="admin-form-group" style="font-size:0.85rem;color:var(--text-gray);margin-bottom:0;">Ngày tạo sẽ tự động cập nhật khi lưu.</p>
      `;
      const footer = `
        <button type="button" class="btn btn-outline" id="modalUserCancel">Hủy</button>
        <button type="button" class="btn btn-primary" id="modalUserSave">Lưu</button>
      `;
      openModal('Thêm người dùng', body, footer);
      document.getElementById('modalUserCancel').addEventListener('click', closeModal);
      document.getElementById('modalUserSave').addEventListener('click', () => {
        const email = document.getElementById('modalUserEmail').value.trim();
        const fullName = document.getElementById('modalUserFullName').value.trim();
        if (!email || !fullName) {
          alert('Vui lòng nhập đủ Email và Họ tên.');
          return;
        }
        const created_at = new Date().toISOString();
        console.log('Thêm user:', { email, fullName, created_at });
        alert('Đã lưu (chưa kết nối Firebase). Ngày tạo: ' + created_at);
        closeModal();
      });
    });
  }

  // --- Thêm món ăn ---
  const btnAddFood = document.getElementById('btnAddFood');
  if (btnAddFood) {
    btnAddFood.addEventListener('click', async () => {
      await loadCategoriesIfNeeded(true);
      const categoryOptions = ['<option value="">-- Chọn danh mục --</option>']
        .concat((cachedCategories || []).map(c => `<option value="${c.category_id}">${c.name}</option>`))
        .join('');
      const body = `
        <div class="admin-form-group">
          <label for="modalFoodName">Tên món</label>
          <input type="text" id="modalFoodName" placeholder="Ví dụ: Pizza Margherita" />
        </div>
        <div class="admin-form-group">
          <label for="modalFoodImage">Hình ảnh</label>
          <input type="file" id="modalFoodImage" accept="image/*" />
        </div>
        <div class="admin-form-group admin-form-row admin-form-row-3">
          <div>
            <label>Giá size Nhỏ (VNĐ)</label>
            <input type="number" id="modalFoodPriceSmall" min="0" placeholder="0" />
          </div>
          <div>
            <label>Giá size Vừa (VNĐ)</label>
            <input type="number" id="modalFoodPriceMedium" min="0" placeholder="0" />
      </div>
        <div>
            <label>Giá size Lớn (VNĐ)</label>
            <input type="number" id="modalFoodPriceLarge" min="0" placeholder="0" />
          </div>
        </div>
        <div class="admin-form-group admin-form-row admin-form-row-3">
          <div>
            <label>Calories size Nhỏ</label>
            <input type="number" id="modalFoodCalSmall" min="0" placeholder="0" />
          </div>
          <div>
            <label>Calories size Vừa</label>
            <input type="number" id="modalFoodCalMedium" min="0" placeholder="0" />
        </div>
        <div>
            <label>Calories size Lớn</label>
            <input type="number" id="modalFoodCalLarge" min="0" placeholder="0" />
          </div>
        </div>
        <div class="admin-form-group">
          <label>Topping (tên, giá VNĐ, calories)</label>
          <div id="modalFoodToppingsContainer">
            <div class="admin-topping-row">
              <input type="text" placeholder="Tên topping" class="modal-topping-name" />
              <input type="number" min="0" placeholder="Giá (VNĐ)" class="modal-topping-price" />
              <input type="number" min="0" placeholder="Calories" class="modal-topping-cal" />
              <button type="button" class="btn btn-outline btn-sm btn-remove-row">Xóa</button>
        </div>
      </div>
          <button type="button" class="btn btn-outline btn-sm" id="modalFoodAddTopping" style="margin-top:6px;">Thêm topping</button>
        </div>
        <div class="admin-form-group">
          <label for="modalFoodDesc">Mô tả</label>
          <textarea id="modalFoodDesc" rows="3" placeholder="Mô tả món ăn"></textarea>
      </div>
        <div class="admin-form-group">
          <label for="modalFoodCategory">Danh mục</label>
          <select id="modalFoodCategory">
            ${categoryOptions}
          </select>
      </div>
      `;
      const footer = `
        <button type="button" class="btn btn-outline" id="modalFoodCancel">Hủy</button>
        <button type="button" class="btn btn-primary" id="modalFoodSave">Lưu</button>
      `;
      openModal('Thêm món ăn', body, footer);

      const container = document.getElementById('modalFoodToppingsContainer');
      document.getElementById('modalFoodAddTopping').addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'admin-topping-row';
        row.innerHTML = `
          <input type="text" placeholder="Tên topping" class="modal-topping-name" />
          <input type="number" min="0" placeholder="Giá (VNĐ)" class="modal-topping-price" />
          <input type="number" min="0" placeholder="Calories" class="modal-topping-cal" />
          <button type="button" class="btn btn-outline btn-sm btn-remove-row">Xóa</button>
        `;
        row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
        container.appendChild(row);
      });
      container.querySelector('.btn-remove-row').addEventListener('click', () => {
        if (container.querySelectorAll('.admin-topping-row').length > 1) container.querySelector('.admin-topping-row').remove();
      });

      document.getElementById('modalFoodCancel').addEventListener('click', closeModal);
      document.getElementById('modalFoodSave').addEventListener('click', async () => {
        const name = document.getElementById('modalFoodName').value.trim();
        if (!name) {
          alert('Vui lòng nhập tên món.');
          return;
        }
        const priceSmall = parseInt(document.getElementById('modalFoodPriceSmall').value, 10) || 0;
        const priceMedium = parseInt(document.getElementById('modalFoodPriceMedium').value, 10) || 0;
        const priceLarge = parseInt(document.getElementById('modalFoodPriceLarge').value, 10) || 0;
        const calSmall = parseInt(document.getElementById('modalFoodCalSmall').value, 10) || 0;
        const calMedium = parseInt(document.getElementById('modalFoodCalMedium').value, 10) || 0;
        const calLarge = parseInt(document.getElementById('modalFoodCalLarge').value, 10) || 0;
        const price = priceMedium || priceSmall || priceLarge || 0;

        const toppings = [];
        container.querySelectorAll('.admin-topping-row').forEach(row => {
          const n = row.querySelector('.modal-topping-name').value.trim();
          const p = parseInt(row.querySelector('.modal-topping-price').value, 10) || 0;
          const c = parseInt(row.querySelector('.modal-topping-cal').value, 10) || 0;
          if (n) toppings.push({ name: n, price: p, calories: c });
        });

        const categoryId = document.getElementById('modalFoodCategory').value || '';
        const description = document.getElementById('modalFoodDesc').value.trim();

        const placeholderImageUrl = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80';
        const fileInput = document.getElementById('modalFoodImage');
        let imageUrl = placeholderImageUrl;

        if (fileInput && fileInput.files && fileInput.files[0]) {
          try {
            imageUrl = await uploadToCloudinary(fileInput.files[0]);
          } catch (uploadErr) {
            console.warn('Upload Cloudinary lỗi:', uploadErr);
            alert('Ảnh chưa upload được, dùng ảnh mặc định. ' + (uploadErr.message || ''));
          }
        }

        try {
          const productPayload = {
            product_name: name,
            price,
            image_url: imageUrl,
            description,
            category_id: categoryId,
            featured: false,
            calories: calMedium || calSmall || calLarge || 0
          };
          const productId = await addProduct(productPayload);

          const sizes = {
            S: { price: priceSmall, calories: calSmall },
            M: { price: priceMedium, calories: calMedium },
            L: { price: priceLarge, calories: calLarge }
          };
          const addons = {};
          toppings.forEach((t, i) => {
            addons['topping_' + i] = { addon_name: t.name, addon_price: t.price, calories: t.calories };
          });
          await setProductDetails(productId, { sizes, addons });

          showAdminToast('Đã lưu món ăn vào menu.');
          closeModal();
          renderFoodsTable();
        } catch (err) {
          console.error('Lưu món ăn:', err);
          alert('Lỗi khi lưu: ' + (err.message || err));
        }
      });
    });
  }

  // --- Thêm danh mục ---
  const btnAddCategory = document.getElementById('btnAddCategory');
  if (btnAddCategory) {
    btnAddCategory.addEventListener('click', () => {
      const body = `
        <div class="admin-form-group">
          <label for="modalCatName">Tên danh mục</label>
          <input type="text" id="modalCatName" placeholder="Ví dụ: Pizza, Mì, Nước uống" />
        </div>
        <div class="admin-form-group">
          <label for="modalCatDesc">Mô tả</label>
          <textarea id="modalCatDesc" rows="3" placeholder="Mô tả danh mục"></textarea>
        </div>
      `;
      const footer = `
        <button type="button" class="btn btn-outline" id="modalCatCancel">Hủy</button>
        <button type="button" class="btn btn-primary" id="modalCatSave">Lưu</button>
      `;
      openModal('Thêm danh mục', body, footer);
      document.getElementById('modalCatCancel').addEventListener('click', closeModal);
      document.getElementById('modalCatSave').addEventListener('click', async () => {
        const name = document.getElementById('modalCatName').value.trim();
        if (!name) {
          alert('Vui lòng nhập tên danh mục.');
          return;
        }
        const description = document.getElementById('modalCatDesc').value.trim();
        try {
          await addCategory({ name, description });
          await loadCategoriesIfNeeded(true);
          renderCategoriesTable();
          renderFoodsCategoryFilter();
          alert('Đã lưu danh mục lên Firebase.');
          closeModal();
        } catch (err) {
          console.error('Lưu danh mục:', err);
          alert('Lỗi khi lưu danh mục: ' + (err.message || err));
        }
      });
    });
  }
}