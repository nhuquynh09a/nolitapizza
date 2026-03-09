// Product Detail page JS
// Firebase Realtime Database: product_details/{productId}/{detailId}
// Path đọc: product_details/{productId} → convert Object sang array bằng Object.values()

import { getProductById, getProductDetailsByProductId, resolveProductImageUrl } from './firebase.js';

// --- Utils ---
function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

// --- State ---
let product = null;
let details = [];       // Array: [d1, d2, d3] từ product_details/p1
let sizesArray = [];    // Array: [{ size, size_label, price }, ...]
let addonsArray = [];   // Array: [{ addon_id, addon_name, addon_price, ... }, ...]
let selectedSize = null;
let selectedAddons = new Map();
let basePrice = 0;
let baseCalories = 0;

/**
 * Load toàn bộ dữ liệu chi tiết sản phẩm:
 * - Lấy ?id=p1 từ URL
 * - Đọc product từ Firebase
 * - Đọc product_details/{productId} → convert object sang array bằng Object.values()
 * - Build sizesArray và addonsArray (không forEach/map trực tiếp trên object)
 */
async function loadProductDetail() {
    const idParam = qs('id');
    if (idParam === null || idParam === '') {
        document.getElementById('productName').textContent = 'Sản phẩm không tồn tại';
        return;
    }
    const productId = idParam.trim();

    // 1. Lấy sản phẩm
    product = await getProductById(productId);
    if (!product) {
        document.getElementById('productName').textContent = 'Sản phẩm không tồn tại';
        return;
    }
    const idForDetails = product.product_id ?? productId;

    // 2. Đọc product_details/{productId} — Firebase trả về object { d1, d2, d3 }; convert sang array
    const detailsRaw = await getProductDetailsByProductId(idForDetails);
    if (!Array.isArray(detailsRaw)) {
        details = [];
    } else {
        details = detailsRaw;
    }

    basePrice = product.price || 0;
    baseCalories = product.calories || 0;

    // 3. Build sizesArray từ details (chỉ dùng array, không forEach trên object)
    sizesArray = buildSizesArray(details);

    // 4. Build addonsArray từ details (addons trong mỗi detail là object → Object.values() rồi mới dùng)
    addonsArray = buildAddonsArray(details);

    // 5. Render
    renderProduct();
    renderSizes();
    renderAddons();
    recalcAndRender();
    setupListeners();
    updateCartCount();
}

/**
 * Từ mảng details → mảng size.
 * Hỗ trợ 2 cấu trúc:
 * - Mới: details[0].sizes = { S: { price, calories }, M: {...}, L: {...} } → convert Object.entries sang array
 * - Cũ: mỗi phần tử có .size, .size_label, .price
 */
function buildSizesArray(detailsList) {
    if (!Array.isArray(detailsList) || detailsList.length === 0) return [];
    const first = detailsList[0];
    if (!first || typeof first !== 'object') return [];

    if (first.sizes && typeof first.sizes === 'object' && !Array.isArray(first.sizes)) {
        const keys = Object.keys(first.sizes);
        const result = [];
        const sizeLabels = { S: 'Nhỏ', M: 'Vừa', L: 'Lớn' };
        for (let i = 0; i < keys.length; i++) {
            const sizeKey = keys[i];
            const val = first.sizes[sizeKey];
            if (!val || typeof val !== 'object') continue;
            result.push({
                size: sizeKey,
                size_label: sizeLabels[sizeKey] || sizeKey,
                price: val.price != null ? val.price : 0,
                calories: val.calories != null ? val.calories : 0
            });
        }
        return result;
    }

    const result = [];
    const seen = new Set();
    for (let i = 0; i < detailsList.length; i++) {
        const d = detailsList[i];
        if (!d || d.size == null || d.size === '') continue;
        const key = String(d.size);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({
            size: d.size,
            size_label: d.size_label || d.size,
            price: d.price != null ? d.price : 0,
            calories: d.calories != null ? d.calories : 0
        });
    }
    return result;
}

/**
 * Từ mảng details → mảng addons.
 * Hỗ trợ 2 cấu trúc:
 * - Mới: details[0].addons = { a1: {...}, a2: {...} } → Object.entries sang array, thêm addon_id
 * - Cũ: mỗi detail có .addons (object), gộp Object.values từ mọi detail
 */
function buildAddonsArray(detailsList) {
    if (!Array.isArray(detailsList) || detailsList.length === 0) return [];
    const first = detailsList[0];
    if (!first || typeof first !== 'object') return [];

    if (first.addons && typeof first.addons === 'object' && !Array.isArray(first.addons)) {
        const entries = Object.entries(first.addons);
        const result = [];
        for (let i = 0; i < entries.length; i++) {
            const id = entries[i][0];
            const a = entries[i][1];
            if (!a || typeof a !== 'object') continue;
            result.push({ addon_id: id, ...a });
        }
        return result;
    }

    const byId = new Map();
    for (let i = 0; i < detailsList.length; i++) {
        const d = detailsList[i];
        if (!d || typeof d.addons !== 'object' || d.addons === null) continue;
        if (Array.isArray(d.addons)) {
            d.addons.forEach(a => {
                if (a && (a.addon_id || a.addon_name)) {
                    const id = a.addon_id || a.id || a.addon_name;
                    if (!byId.has(id)) byId.set(id, a);
                }
            });
        } else {
            const addonList = Object.values(d.addons);
            for (let j = 0; j < addonList.length; j++) {
                const a = addonList[j];
                if (a && (a.addon_id || a.addon_name)) {
                    const id = a.addon_id || a.id || a.addon_name;
                    if (!byId.has(id)) byId.set(id, a);
                }
            }
        }
    }
    return Array.from(byId.values());
}

function renderProduct() {
    document.getElementById('productName').textContent = product.product_name;
    document.getElementById('productPrice').textContent = formatPrice(product.price || 0);
    document.getElementById('productCalories').textContent = (product.calories || 0) + ' cal';

    const firstDetail = details.length > 0 ? details[0] : null;
    document.getElementById('productLongDescription').textContent = (firstDetail && firstDetail.long_description) || product.description || '';

    const wrapper = document.getElementById('productImageWrapper');
    wrapper.innerHTML = '';
    const img = document.createElement('img');
    const fallbackImg = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80';
    img.src = resolveProductImageUrl(product.image_url, fallbackImg);
    img.referrerPolicy = 'no-referrer';
    img.alt = product.product_name;
    img.className = 'product-detail-main-image';
    img.onerror = function () { this.src = fallbackImg; };
    wrapper.appendChild(img);
}

/**
 * Hiển thị danh sách size + giá (chỉ dùng sizesArray).
 */
function renderSizes() {
    const container = document.getElementById('sizeOptions');
    if (!container) return;
    container.innerHTML = '';

    if (!Array.isArray(sizesArray) || sizesArray.length === 0) {
        selectedSize = null;
        return;
    }

    sizesArray.forEach((item, idx) => {
        const sz = item.size;
        const labelText = item.size_label || sz;
        const priceText = formatPrice(item.price);

        const label = document.createElement('label');
        label.className = 'size-option';

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'productSize';
        input.value = sz;
        input.id = 'size-' + sz;
        if (idx === 0) {
            input.checked = true;
            selectedSize = sz;
        }
        input.addEventListener('change', () => {
            selectedSize = sz;
            recalcAndRender();
        });

        const span = document.createElement('span');
        span.textContent = labelText + ' — ' + priceText;

        label.appendChild(input);
        label.appendChild(span);
        container.appendChild(label);
    });
}

/**
 * Hiển thị danh sách addon (chỉ dùng addonsArray).
 */
function renderAddons() {
    const container = document.getElementById('addonsList');
    if (!container) return;
    container.innerHTML = '';

    const activeAddons = addonsArray.filter(a => (a.addon_status ?? a.status) !== 'inactive' && (a.addon_status ?? a.status) !== 'disabled');
    if (activeAddons.length === 0) {
        container.innerHTML = '<p>Không có món thêm</p>';
        return;
    }

    activeAddons.forEach(addon => {
        const addonId = addon.addon_id || addon.id;
        const name = addon.addon_name || addon.name || addon.topping_name || '';
        const price = addon.addon_price ?? addon.price ?? 0;
        const calories = addon.addon_calories ?? addon.calories ?? 0;
        const currentQty = selectedAddons.get(addonId) || 0;

        const wrapper = document.createElement('div');
        wrapper.className = 'addon-item';

        const label = document.createElement('label');
        label.className = 'addon-label';
        label.innerHTML = '<strong>' + name + '</strong> — ' + formatPrice(price) + ' • ' + calories + ' cal';

        const qtyControl = document.createElement('div');
        qtyControl.className = 'addon-qty-control';

        const decreaseBtn = document.createElement('button');
        decreaseBtn.type = 'button';
        decreaseBtn.className = 'addon-qty-btn';
        decreaseBtn.innerHTML = '<i class="fas fa-minus"></i>';
        decreaseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const newQty = Math.max(0, (selectedAddons.get(addonId) || 0) - 1);
            if (newQty === 0) selectedAddons.delete(addonId);
            else selectedAddons.set(addonId, newQty);
            qtyInput.value = newQty;
            recalcAndRender();
        });

        const qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.className = 'addon-qty-input';
        qtyInput.min = '0';
        qtyInput.max = '10';
        qtyInput.value = currentQty;
        qtyInput.addEventListener('change', (e) => {
            const newQty = Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0));
            if (newQty === 0) selectedAddons.delete(addonId);
            else selectedAddons.set(addonId, newQty);
            qtyInput.value = newQty;
            recalcAndRender();
        });

        const increaseBtn = document.createElement('button');
        increaseBtn.type = 'button';
        increaseBtn.className = 'addon-qty-btn';
        increaseBtn.innerHTML = '<i class="fas fa-plus"></i>';
        increaseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const newQty = Math.min(10, (selectedAddons.get(addonId) || 0) + 1);
            selectedAddons.set(addonId, newQty);
            qtyInput.value = newQty;
            recalcAndRender();
        });

        qtyControl.appendChild(decreaseBtn);
        qtyControl.appendChild(qtyInput);
        qtyControl.appendChild(increaseBtn);
        wrapper.appendChild(label);
        wrapper.appendChild(qtyControl);
        container.appendChild(wrapper);
    });
}

function recalcAndRender() {
    let effectiveBasePrice = product ? (product.price || 0) : 0;
    let effectiveBaseCalories = product ? (product.calories || 0) : 0;

    if (selectedSize && Array.isArray(sizesArray)) {
        const szItem = sizesArray.find(s => s.size === selectedSize);
        if (szItem) {
            effectiveBasePrice = szItem.price != null ? szItem.price : effectiveBasePrice;
            effectiveBaseCalories = szItem.calories != null ? szItem.calories : effectiveBaseCalories;
        }
    }

    let addonsTotal = 0;
    let addonsCalories = 0;
    selectedAddons.forEach((qty, addonId) => {
        const addon = addonsArray.find(a => (a.addon_id || a.id) === addonId);
        if (addon) {
            addonsTotal += (addon.addon_price ?? addon.price ?? 0) * qty;
            addonsCalories += (addon.addon_calories ?? addon.calories ?? 0) * qty;
        }
    });

    const totalPrice = effectiveBasePrice + addonsTotal;
    const totalCalories = effectiveBaseCalories + addonsCalories;

    const totalEl = document.getElementById('totalPrice');
    const calEl = document.getElementById('totalCalories');
    if (totalEl) totalEl.textContent = formatPrice(totalPrice);
    if (calEl) calEl.textContent = totalCalories + ' cal';

    const productPriceEl = document.getElementById('productPrice');
    const productCaloriesEl = document.getElementById('productCalories');
    if (productPriceEl) productPriceEl.textContent = formatPrice(effectiveBasePrice);
    if (productCaloriesEl) productCaloriesEl.textContent = effectiveBaseCalories + ' cal';
}

function setupListeners() {
    const btn = document.getElementById('addToCartBtn');
    if (btn) btn.addEventListener('click', addProductToCart);
}

function addProductToCart() {
    if (typeof window.cartItems === 'undefined') {
        window.cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    }

    let effectiveBasePrice = product.price || 0;
    let effectiveBaseCalories = product.calories || 0;
    if (selectedSize && Array.isArray(sizesArray)) {
        const szItem = sizesArray.find(s => s.size === selectedSize);
        if (szItem) {
            effectiveBasePrice = szItem.price != null ? szItem.price : effectiveBasePrice;
            effectiveBaseCalories = szItem.calories != null ? szItem.calories : effectiveBaseCalories;
        }
    }
    let addonsTotal = 0;
    let addonsCalories = 0;
    const selected = [];
    selectedAddons.forEach((qty, addonId) => {
        const addon = addonsArray.find(a => (a.addon_id || a.id) === addonId);
        if (addon && qty > 0) {
            const p = addon.addon_price ?? addon.price ?? 0;
            const c = addon.addon_calories ?? addon.calories ?? 0;
            addonsTotal += p * qty;
            addonsCalories += c * qty;
            selected.push({
                detail_id: addon.addon_id || addon.id,
                name: addon.addon_name || addon.name || addon.topping_name,
                price: p,
                calories: c,
                quantity: qty
            });
        }
    });

    const finalPrice = effectiveBasePrice + addonsTotal;
    const finalCalories = effectiveBaseCalories + addonsCalories;

    const cartItem = {
        product_id: product.product_id,
        product_name: product.product_name,
        name: product.product_name,
        price: finalPrice,
        quantity: 1,
        calories: finalCalories,
        image: product.image_url || '',
        addons: selected,
        size: selectedSize || null,
        added_at: new Date().toISOString()
    };

    window.cartItems.push(cartItem);
    localStorage.setItem('cartItems', JSON.stringify(window.cartItems));
    updateCartCount();
    showNotification(product.product_name + ' đã được thêm vào giỏ hàng!');
}

document.addEventListener('DOMContentLoaded', loadProductDetail);
