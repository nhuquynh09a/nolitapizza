// js/firebase.js

import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";

import { getDatabase, ref, get, set, push, update, remove, onValue } from
"https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, GoogleAuthProvider, onAuthStateChanged, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from
"https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyABXBpbxsPiTQUAvHV6XVkI2TT1xL6aR9A",
  authDomain: "pizza-fe7e6.firebaseapp.com",

  databaseURL:
  "https://pizza-fe7e6-default-rtdb.asia-southeast1.firebasedatabase.app",

  projectId: "pizza-fe7e6",
  storageBucket: "pizza-fe7e6.appspot.com",
  messagingSenderId: "596928106256",
  appId: "1:596928106256:web:84ba0323ad73517b485f95"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);
export { onAuthStateChanged };
export { ref, onValue };

// ============================================
// FIREBASE AUTH HELPERS (ES Module)
// ============================================

/**
 * Đăng ký tài khoản mới với email/password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function register(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Đăng nhập với email/password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Gửi email đặt lại mật khẩu.
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Đổi mật khẩu cho user đăng nhập bằng email/password.
 * Cần xác thực lại bằng mật khẩu cũ (reauthenticate) rồi mới gọi updatePassword.
 * @param {string} oldPassword - Mật khẩu hiện tại
 * @param {string} newPassword - Mật khẩu mới (ít nhất 6 ký tự)
 * @returns {Promise<void>}
 * @throws Nếu chưa đăng nhập, đăng nhập bằng Google (không có mật khẩu), sai mật khẩu cũ, hoặc mật khẩu mới không hợp lệ.
 */
export async function changePassword(oldPassword, newPassword) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Bạn chưa đăng nhập.');
  const providerId = user.providerData && user.providerData[0] && user.providerData[0].providerId;
  if (providerId === 'google.com') throw new Error('Tài khoản đăng nhập bằng Google không thể đổi mật khẩu tại đây.');
  if (!newPassword || newPassword.length < 6) throw new Error('Mật khẩu mới phải ít nhất 6 ký tự.');
  const credential = EmailAuthProvider.credential(user.email, oldPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

/**
 * Đăng nhập bằng Google (popup). Dùng thử trước; nếu lỗi COOP/popup bị chặn thì dùng loginWithGoogleRedirect.
 */
export async function loginWithGooglePopup() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

/**
 * Đăng nhập bằng Google (redirect). Dùng khi popup bị chặn hoặc lỗi COOP.
 * Sau khi quay lại trang auth, gọi getAuthRedirectResult() để lấy kết quả.
 */
export async function loginWithGoogleRedirect() {
  const provider = new GoogleAuthProvider();
  return signInWithRedirect(auth, provider);
}

/** @deprecated Dùng loginWithGoogleRedirect. Giữ tên cũ để tương thích. */
export async function loginWithGoogle() {
  return loginWithGoogleRedirect();
}

/**
 * Lấy kết quả đăng nhập sau khi quay lại từ redirect (Google). Gọi khi trang auth load.
 * @returns {Promise<import('firebase/auth').UserCredential | null>}
 */
export async function getAuthRedirectResult() {
  return getRedirectResult(auth);
}

/**
 * Đăng xuất.
 * Xóa giỏ hàng localStorage để khách vãng lai không thấy giỏ của tài khoản vừa đăng xuất.
 * @returns {Promise<void>}
 */
export async function logout() {
  // Xóa giỏ hàng khi đăng xuất (giỏ chỉ lưu local, không lưu theo user)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('cartItems');
    }
    if (typeof window !== 'undefined') {
      window.cartItems = [];
    }
  } catch (e) {
    // Bỏ qua nếu localStorage bị chặn
  }
  return signOut(auth);
}

// ============================================
// USER PROFILE (Realtime Database: users/{uid})
// ============================================

/**
 * Lưu thông tin user vào Realtime Database tại users/{uid}.
 * @param {string} uid
 * @param {Object} data - full_name, email, provider, role, status, created_at (uid sẽ được thêm tự động)
 */
export async function saveUserProfile(uid, data) {
  const userRef = ref(db, 'users/' + uid);
  await set(userRef, { ...data, uid });
}

/**
 * Lấy thông tin user từ Realtime Database users/{uid}.
 * @param {string} uid
 * @returns {Promise<Object|null>} user object hoặc null nếu chưa có
 */
export async function getUserProfile(uid) {
  const userRef = ref(db, 'users/' + uid);
  const snapshot = await get(userRef);
  return snapshot.exists() ? snapshot.val() : null;
}

/**
 * Lấy danh sách tất cả user từ Realtime Database (users/) để admin quản lý.
 * @returns {Promise<Array>} Mảng { uid, full_name, email, role, status, created_at, ... }
 */
export async function getUsersList() {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    if (typeof data !== 'object' || Array.isArray(data)) return [];
    // Lọc bỏ entry null (một số key có thể bị xóa nhưng vẫn còn key rỗng)
    return Object.entries(data)
      .filter(([, val]) => val != null && typeof val === 'object')
      .map(([uid, val]) => ({ ...val, uid }));
  } catch (error) {
    console.error('getUsersList:', error);
    throw error;
  }
}

/**
 * Xóa profile user khỏi Realtime Database (Auth vẫn tồn tại, chỉ xóa bản ghi trong DB).
 * @param {string} uid
 */
export async function deleteUserProfile(uid) {
  const userRef = ref(db, 'users/' + uid);
  await set(userRef, null);
}

/**
 * Trả về URL ảnh sản phẩm. Chỉ dùng URL đầy đủ (http/https); đường dẫn local (images/...)
 * trả về fallback để tránh 404 khi file không có trên server.
 */
export function resolveProductImageUrl(imageUrl, fallback) {
  if (!imageUrl || typeof imageUrl !== 'string') return fallback || '';
  const t = imageUrl.trim();
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return fallback || '';
}

// ============================================
// HELPER FUNCTIONS FOR FIREBASE REALTIME DB
// ============================================

/**
 * Fetch all products from Firebase - filters out invalid/undefined products
 */
export async function getProducts() {
  try {
    const productsRef = ref(db, 'products');
    const snapshot = await get(productsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      let products = [];

      // Firebase lưu dạng object { "-Nkey1": { ... }, "-Nkey2": { ... } } — nếu món không có product_id thì dùng key làm id
      if (typeof data === 'object' && !Array.isArray(data)) {
        products = Object.entries(data).map(([key, val]) => {
          if (val && typeof val === 'object') {
            return { ...val, product_id: val.product_id != null && val.product_id !== '' ? val.product_id : key };
          }
          return null;
        }).filter(Boolean);
      } else if (Array.isArray(data)) {
        products = data.map((p, i) => {
          if (p && typeof p === 'object') {
            return { ...p, product_id: p.product_id != null && p.product_id !== '' ? p.product_id : String(i) };
          }
          return null;
        }).filter(Boolean);
      }

      // Chỉ giữ món có đủ product_name, price (product_id đã gán ở trên nếu thiếu)
      return products.filter(p => p && p.product_name != null && p.price !== undefined);
    }
    return [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

/**
 * Thêm món ăn mới vào Firebase Realtime Database.
 * @param {Object} productData - { product_name, price, image_url [, description, category_id, featured, calories ] }
 * @returns {Promise<string>} product_id (Firebase push key)
 */
export async function addProduct(productData) {
  const productsRef = ref(db, 'products');
  const newRef = push(productsRef);
  const productId = newRef.key;
  const payload = {
    product_id: productId,
    product_name: productData.product_name || '',
    price: Number(productData.price) || 0,
    image_url: productData.image_url || '',
    description: productData.description || '',
    category_id: productData.category_id || '',
    featured: productData.featured === true,
    calories: Number(productData.calories) || 0,
    created_at: new Date().toISOString()
  };
  await set(newRef, payload);
  return productId;
}

/**
 * Ghi chi tiết món (size, topping) cho một product_id.
 * Cấu trúc: sizes = { S: { price, calories }, M: {...}, L: {...} }, addons = { id: { addon_name, calories }, ... }
 * @param {string} productId
 * @param {Object} detailsData - { sizes: {...}, addons: {...} }
 */
export async function setProductDetails(productId, detailsData) {
  const detailsRef = ref(db, 'product_details/' + productId);
  await set(detailsRef, detailsData);
}

/**
 * Cập nhật một phần thông tin sản phẩm (vd: description, category_id).
 * @param {string} productId
 * @param {Object} updates - { image_url?, calories?, ... }
 */
export async function updateProduct(productId, updates) {
  const productRef = ref(db, 'products/' + productId);
  await update(productRef, updates);
}

/**
 * Xóa món khỏi products và product_details.
 * @param {string} productId
 */
export async function deleteProduct(productId) {
  const productRef = ref(db, 'products/' + productId);
  const detailsRef = ref(db, 'product_details/' + productId);
  await set(productRef, null);
  await set(detailsRef, null);
}

/**
 * Lấy danh sách sản phẩm nổi bật (featured products).
 * Ưu tiên món có featured === true; nếu không có món nào thì trả về 6 món đầu (fallback).
 */
export async function getFeaturedProducts() {
  try {
    const all = await getProducts();
    const featured = all.filter(p => p && p.featured === true);
    if (featured.length > 0) {
      console.log('🔥 Featured products from Firebase:', featured);
      return featured;
    }
    // Fallback: không có field featured trong DB thì hiển thị 6 món đầu
    const fallback = all.slice(0, 6);
    console.log('🔥 No featured flag in DB, showing first', fallback.length, 'products');
    return fallback;
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }
}

/**
 * Fetch product by ID (the product_id field).
 * Hỗ trợ cả product_id dạng số (1, 2) và chuỗi (p1, p2).
 */
export async function getProductById(productId) {
  try {
    if (productId == null || productId === '') return null;
    const all = await getProducts();
    const idStr = String(productId);
    const idNum = Number(productId);
    const isNumeric = idNum === idNum; // false nếu NaN
    const found = all.find(p => {
      if (!p || !p.product_id) return false;
      if (isNumeric && Number(p.product_id) === idNum) return true;
      if (String(p.product_id) === idStr) return true;
      return false;
    });
    return found || null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

/**
 * Chuẩn hóa product_details từ Firebase: hỗ trợ cả cấu trúc phẳng (d1, d2...)
 * và cấu trúc nested theo product_id (p1: { d1: {...}, d2: {...} }).
 */
function normalizeProductDetails(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  const topValues = Object.values(data);
  const result = [];
  for (const v of topValues) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) {
      result.push(v);
      continue;
    }
    const inner = Object.values(v);
    const isNestedByProduct = inner.length > 0 && inner[0] && (inner[0].product_id !== undefined || inner[0].detail_id !== undefined);
    if (isNestedByProduct) {
      result.push(...inner);
    } else {
      result.push(v);
    }
  }
  return result;
}

/**
 * Fetch all product details (addons & sizes)
 */
export async function getProductDetails() {
  try {
    const detailsRef = ref(db, 'product_details');
    const snapshot = await get(detailsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return normalizeProductDetails(data);
    }
    return [];
  } catch (error) {
    console.error('Error fetching product details:', error);
    return [];
  }
}

/**
 * Fetch product details by product ID.
 * Hỗ trợ: product_details/p1/d1,d2... HOẶC product_details = { p1: { d1, d2 }, p2: {...} }.
 */
export async function getProductDetailsByProductId(productId) {
  const idStr = String(productId).trim();
  const DEBUG = false;
  if (DEBUG) console.log('[firebase] getProductDetailsByProductId:', { productId, idStr });

  try {
    if (productId == null || productId === '') return [];

    // Cách 1: Đọc trực tiếp product_details/p1
    const path1 = 'product_details/' + idStr;
    const directRef = ref(db, path1);
    const directSnap = await get(directRef);
    if (DEBUG) console.log('[firebase] Path', path1, 'exists:', directSnap.exists());
    if (directSnap.exists()) {
      const inner = directSnap.val();
      if (DEBUG) console.log('[firebase] directSnap.val() type:', Array.isArray(inner) ? 'array' : typeof inner, 'keys:', inner ? (Array.isArray(inner) ? 'length=' + inner.length : Object.keys(inner)) : inner);
      if (inner != null && typeof inner === 'object') {
        // Cấu trúc mới: p1 là 1 object có .sizes và .addons → trả về [inner]
        if (inner.sizes && typeof inner.sizes === 'object' && inner.addons && typeof inner.addons === 'object') {
          if (DEBUG) console.log('[firebase] Cấu trúc mới (sizes/addons), return [inner]');
          return [inner];
        }
        // Cấu trúc cũ: p1 = { d1, d2, d3 } → Object.values()
        let list;
        if (Array.isArray(inner)) {
          list = inner.filter(d => d && typeof d === 'object');
        } else {
          list = Object.values(inner).filter(d => d && typeof d === 'object');
        }
        if (DEBUG) console.log('[firebase] list.length (cách 1):', list.length);
        if (list.length > 0) return list;
      }
    }

    // Cách 2: Đọc cả node product_details
    const detailsRef = ref(db, 'product_details');
    const snapshot = await get(detailsRef);
    if (DEBUG) console.log('[firebase] product_details exists:', snapshot.exists());
    if (!snapshot.exists()) {
      console.warn('[firebase] product_details node không tồn tại hoặc trống');
      return [];
    }

    const data = snapshot.val();
    if (DEBUG) console.log('[firebase] data keys:', data ? Object.keys(data) : data, 'isArray:', Array.isArray(data));
    if (!data || typeof data !== 'object') return [];

    // data có thể là { p1: {...} } hoặc { "0": {...} } (key là "0" thay vì "p1")
    let byProduct = data[idStr] ?? data[productId];
    if (byProduct == null && Array.isArray(data) && data.length > 0) {
      byProduct = data.find(item => {
        if (!item || typeof item !== 'object') return false;
        const firstChild = Object.values(item)[0];
        return firstChild && (String(firstChild.product_id) === idStr || firstChild.product_id === productId);
      });
      if (byProduct == null) byProduct = data[0];
    }
    if (byProduct == null) {
      const keys = Object.keys(data);
      if (keys.length === 1) byProduct = data[keys[0]];
    }
    if (DEBUG) console.log('[firebase] byProduct for', idStr, ':', !!byProduct, byProduct ? (Array.isArray(byProduct) ? 'array' : Object.keys(byProduct)) : '');
    if (byProduct != null && typeof byProduct === 'object') {
      if (byProduct.sizes && typeof byProduct.sizes === 'object' && byProduct.addons && typeof byProduct.addons === 'object') {
        if (DEBUG) console.log('[firebase] Cấu trúc mới (sizes/addons), return [byProduct]');
        return [byProduct];
      }
      const list = Array.isArray(byProduct)
        ? byProduct.filter(d => d && typeof d === 'object')
        : Object.values(byProduct).filter(d => d && typeof d === 'object');
      if (DEBUG) console.log('[firebase] list.length (cách 2):', list.length);
      if (list.length > 0) return list;
    }

    // Cách 3: Tìm key có detail.product_id trùng
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (!val || typeof val !== 'object' || Array.isArray(val)) continue;
      const first = Object.values(val)[0];
      if (first && typeof first === 'object' && (String(first.product_id) === idStr || first.product_id === productId)) {
        const list = Object.values(val).filter(d => d && typeof d === 'object');
        if (list.length > 0) return list;
      }
    }

    const altRef = ref(db, 'productDetails/' + idStr);
    const altSnap = await get(altRef);
    if (altSnap.exists()) {
      const inner = altSnap.val();
      if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
        const list = Object.values(inner).filter(d => d && typeof d === 'object');
        if (list.length > 0) return list;
      }
    }

    const flatList = normalizeProductDetails(data);
    return flatList.filter(d => d && (String(d.product_id) === idStr || d.product_id === productId));
  } catch (error) {
    console.error('[firebase] Error getProductDetailsByProductId:', error?.message || error, error);
    return [];
  }
}

/**
 * Save contact message to Firebase
 */
export async function saveContactMessage(contactData) {
  try {
    const contactsRef = ref(db, 'contacts');
    const newContactRef = push(contactsRef);
    await set(newContactRef, {
      ...contactData,
      created_at: new Date().toISOString()
    });
    return { success: true, id: newContactRef.key };
  } catch (error) {
    console.error('Error saving contact message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lấy tất cả liên hệ từ Firebase (admin quản lý).
 * @returns {Promise<Array>} Mảng { id, full_name, email, phone, subject, message, status, created_at }
 */
export async function getContacts() {
  try {
    const refContacts = ref(db, 'contacts');
    const snapshot = await get(refContacts);
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    if (typeof data !== 'object' || Array.isArray(data)) return [];
    return Object.entries(data).map(([key, val]) => ({ ...val, id: key }));
  } catch (error) {
    console.error('getContacts:', error);
    return [];
  }
}

/**
 * Cập nhật một liên hệ (admin).
 * @param {string} id - key trong contacts
 * @param {Object} updates - full_name, email, phone, subject, message, status
 */
export async function updateContact(id, updates) {
  const contactRef = ref(db, 'contacts/' + id);
  await update(contactRef, updates);
}

/**
 * Xóa một liên hệ (admin).
 * @param {string} id
 */
export async function deleteContact(id) {
  const contactRef = ref(db, 'contacts/' + id);
  await set(contactRef, null);
}

/**
 * Save order to Firebase
 */
export async function saveOrder(orderData) {
  try {
    const ordersRef = ref(db, 'orders');
    const newOrderRef = push(ordersRef);
    await set(newOrderRef, {
      ...orderData,
      created_at: new Date().toISOString(),
      status: 'pending'
    });
    return { success: true, id: newOrderRef.key };
  } catch (error) {
    console.error('Error saving order:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lấy tất cả đơn hàng (admin quản lý).
 * @returns {Promise<Array>} Mảng { id, customer_name, total_price, status, order_date, ... }
 */
export async function getOrders() {
  try {
    const ordersRef = ref(db, 'orders');
    const snapshot = await get(ordersRef);
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    if (typeof data !== 'object' || Array.isArray(data)) return [];
    return Object.entries(data)
      .filter(([, val]) => val != null && typeof val === 'object')
      .map(([key, val]) => ({ ...val, id: key }));
  } catch (error) {
    console.error('getOrders:', error);
    return [];
  }
}

/**
 * Lấy một đơn hàng theo id (dùng cho trang thanh toán VietQR).
 * @param {string} orderId - key trong orders
 * @returns {Promise<Object|null>} Đơn hàng { id, customer_name, total_price, ... } hoặc null
 */
export async function getOrderById(orderId) {
  if (!orderId) return null;
  try {
    const orderRef = ref(db, 'orders/' + orderId);
    const snapshot = await get(orderRef);
    if (!snapshot.exists()) return null;
    return { ...snapshot.val(), id: orderId };
  } catch (error) {
    console.error('getOrderById:', error);
    return null;
  }
}

/**
 * Đăng ký lắng nghe realtime đơn hàng (admin/kitchen tự cập nhật khi Firebase thay đổi).
 * @param {function(Array): void} callback - Nhận mảng đơn hàng [{ id, ... }, ...]
 * @returns {function()} Hàm hủy đăng ký (gọi để ngừng lắng nghe)
 */
export function subscribeOrders(callback) {
  const ordersRef = ref(db, 'orders');
  const unsubscribe = onValue(ordersRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    if (typeof data !== 'object' || Array.isArray(data)) {
      callback([]);
      return;
    }
    const list = Object.entries(data)
      .filter(([, val]) => val != null && typeof val === 'object')
      .map(([key, val]) => ({ ...val, id: key }));
    callback(list);
  });
  return unsubscribe;
}

/**
 * Cập nhật đơn hàng (trạng thái, lý do hủy, ...).
 * @param {string} orderId - key trong orders
 * @param {Object} updates - status, cancel_reason?, cancelled_at?, ...
 */
export async function updateOrder(orderId, updates) {
  const orderRef = ref(db, 'orders/' + orderId);
  await update(orderRef, updates);
}

/**
 * Xóa đơn hàng (dùng khi khách hủy tại trang thanh toán – không ghi nhận đơn, không tính là hủy đơn).
 * @param {string} orderId - key trong orders
 */
export async function deleteOrder(orderId) {
  if (!orderId) return;
  const orderRef = ref(db, 'orders/' + orderId);
  await remove(orderRef);
}

/**
 * Gửi thông báo cho admin (vd: bếp đã chế biến xong đơn).
 * Lưu tại notifications/{pushId} = { type, order_id, message, created_at, read }
 * @param {Object} data - { type, order_id, message }
 */
export async function pushNotification(data) {
  const notifRef = ref(db, 'notifications');
  const newRef = push(notifRef);
  await set(newRef, {
    type: data.type || 'info',
    order_id: data.order_id || '',
    message: data.message || '',
    created_at: new Date().toISOString(),
    read: false
  });
  return newRef.key;
}

/**
 * Lấy danh sách đơn hàng theo user_id (và tùy chọn theo email cho đơn cũ chưa có user_id).
 * @param {string} uid - Firebase Auth user id
 * @param {string} [email] - Email user; nếu có, đơn không có user_id nhưng trùng customer_email cũng trả về
 * @returns {Promise<Array>} Mảng đơn hàng, mỗi phần tử có id (key), ...các field từ Firebase
 */
export async function getOrdersByUserId(uid, email) {
  try {
    const ordersRef = ref(db, 'orders');
    const snapshot = await get(ordersRef);
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    const list = typeof data === 'object' && !Array.isArray(data)
      ? Object.entries(data).map(([key, val]) => ({ ...val, id: key }))
      : [];
    return list.filter(o => {
      if (!o) return false;
      if (o.user_id === uid || o.user_id === String(uid)) return true;
      if (email && (o.customer_email === email || (o.customer_email && o.customer_email.trim().toLowerCase() === String(email).trim().toLowerCase()))) return true;
      return false;
    });
  } catch (error) {
    console.error('getOrdersByUserId:', error);
    return [];
  }
}

/**
 * Save review to Firebase
 */
export async function saveReview(reviewData) {
  try {
    const reviewsRef = ref(db, 'reviews');
    const newReviewRef = push(reviewsRef);
    await set(newReviewRef, {
      ...reviewData,
      created_at: new Date().toISOString()
    });
    return { success: true, id: newReviewRef.key };
  } catch (error) {
    console.error('Error saving review:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lấy tất cả đánh giá từ Firebase (admin quản lý).
 * @returns {Promise<Array>} Mảng { id, user_id, user_name, rating/stars, content, created_at, product_id?, product_name? }
 */
export async function getReviews() {
  try {
    const reviewsRef = ref(db, 'reviews');
    const snapshot = await get(reviewsRef);
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    if (typeof data !== 'object' || Array.isArray(data)) return [];
    return Object.entries(data).map(([key, val]) => ({ ...val, id: key }));
  } catch (error) {
    console.error('getReviews:', error);
    return [];
  }
}

/**
 * Xóa một đánh giá (admin hoặc chủ review).
 * @param {string} id
 */
export async function deleteReview(id) {
  const reviewRef = ref(db, 'reviews/' + id);
  await set(reviewRef, null);
}

/**
 * Cập nhật đánh giá (user sửa nội dung, admin ẩn/hiện).
 * @param {string} reviewId
 * @param {Object} updates - content, rating, images, status, ...
 */
export async function updateReview(reviewId, updates) {
  const reviewRef = ref(db, 'reviews/' + reviewId);
  await update(reviewRef, updates);
}

/**
 * Lấy đánh giá theo user_id/uid (trang tài khoản người dùng).
 * @param {string} uid
 * @returns {Promise<Array>}
 */
export async function getReviewsByUserId(uid) {
  const all = await getReviews();
  return all.filter(r => (r.user_id && r.user_id === uid) || (r.uid && r.uid === uid) || r.user_id === String(uid) || r.uid === String(uid));
}

/**
 * Initialize Firebase Database with data from data.js (one-time setup)
 * This will populate products and productDetails if database is empty
 */
export async function initializeFirebaseDatabase() {
  try {
    // Check if products already exist
    const productsRef = ref(db, 'products');
    const snapshot = await get(productsRef);
    
    if (snapshot.exists()) {
      console.log('Products already exist in Firebase');
      return { success: true, message: 'Database already initialized' };
    }
    
    // Import data from data.js
    const { productsData, productDetails } = await import('./data.js');
    
    // Populate products - only valid ones
    const productsToAdd = {};
    productsData.forEach(product => {
      if (product && product.product_id && product.product_name && product.price !== undefined && product.image_url) {
        productsToAdd[product.product_id] = product;
      }
    });
    
    await set(ref(db, 'products'), productsToAdd);
    console.log('Products initialized:', Object.keys(productsToAdd).length, 'products added');
    
    // Populate product details
    const detailsToAdd = {};
    productDetails.forEach((detail, index) => {
      if (detail && detail.product_id) {
        detailsToAdd[index] = detail;
      }
    });
    
    await set(ref(db, 'product_details'), detailsToAdd);
    console.log('Product details initialized:', Object.keys(detailsToAdd).length, 'details added');
    
    return { success: true, message: 'Database initialized successfully' };
  } catch (error) {
    console.error('Error initializing Firebase database:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear all data from Firebase (for reset/debugging)
 * WARNING: This will delete all products, orders, contacts, etc.
 */
export async function clearFirebaseDatabase() {
  try {
    await set(ref(db, 'products'), null);
    await set(ref(db, 'product_details'), null);
    console.log('Firebase database cleared');
    return { success: true, message: 'Database cleared' };
  } catch (error) {
    console.error('Error clearing Firebase database:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Thêm danh mục
 * Lưu tại: categories/{pushKey} = { category_id, name, description }
 */
export async function addCategory({ name, description }) {
  const categoriesRef = ref(db, 'categories');
  const newRef = push(categoriesRef);
  const categoryId = newRef.key;
  await set(newRef, {
    category_id: categoryId,
    name: String(name || '').trim(),
    description: String(description || '').trim()
  });
  return categoryId;
}

/**
 * Cập nhật danh mục (admin).
 * @param {string} categoryId - key trong categories
 * @param {Object} updates - { name, description }
 */
export async function updateCategory(categoryId, updates) {
  const categoryRef = ref(db, 'categories/' + categoryId);
  await update(categoryRef, {
    name: String(updates.name ?? '').trim(),
    description: String(updates.description ?? '').trim()
  });
}

/**
 * Xóa danh mục (admin).
 * @param {string} categoryId - key trong categories
 */
export async function deleteCategory(categoryId) {
  const categoryRef = ref(db, 'categories/' + categoryId);
  await set(categoryRef, null);
}

/**
 * Lấy danh mục (chuẩn hóa về mảng object có { category_id, name, description }).
 */
export async function getCategories() {
  try {
    const snapshot = await get(ref(db, "categories"));
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (!data || typeof data !== 'object') return [];
      return Object.entries(data)
        .map(([key, val]) => {
          if (typeof val === 'string') {
            return { category_id: key, name: val, description: '' };
          }
          if (!val || typeof val !== 'object') return null;
          return {
            category_id: val.category_id || val.id || key,
            name: val.name || val.category_name || val.title || '',
            description: val.description || val.desc || ''
          };
        })
        .filter(c => c && c.category_id && c.name);
    }
    return [];
  } catch (err) {
    console.error("Lỗi load categories:", err);
    return [];
  }
}