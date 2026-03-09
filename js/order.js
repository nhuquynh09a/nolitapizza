// ============================================
// ORDER PAGE FUNCTIONALITY
// Firebase Realtime Database Integration
// ============================================

import { saveOrder, resolveProductImageUrl, auth, onAuthStateChanged, getUserProfile } from './firebase.js';
// Initialize order page when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('orderItemsList')) {
        initializeOrderPage();
    }
});

/**
 * Initialize Order Page
 * - Render cart items từ localStorage
 * - Setup form handlers
 * - Calculate totals
 */
function initializeOrderPage() {
    // Update cart count in header
    updateCartCount();
    
    renderOrderItems();
    setupOrderFormHandlers();
    // Bind delete-item confirm modal buttons
    const deleteBackdrop = document.getElementById('orderDeleteBackdrop');
    const deleteCancel = document.getElementById('orderDeleteCancel');
    const deleteConfirm = document.getElementById('orderDeleteConfirm');
    if (deleteCancel) {
        deleteCancel.addEventListener('click', function () {
            closeRemoveItemModal();
        });
    }
    if (deleteBackdrop) {
        deleteBackdrop.addEventListener('click', function (e) {
            if (e.target === deleteBackdrop) {
                closeRemoveItemModal();
            }
        });
    }
    if (deleteConfirm) {
        deleteConfirm.addEventListener('click', function () {
            if (pendingRemoveIndex === null) {
                closeRemoveItemModal();
                return;
            }
            const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
            if (pendingRemoveIndex >= 0 && pendingRemoveIndex < cartItems.length) {
                cartItems.splice(pendingRemoveIndex, 1);
                localStorage.setItem('cartItems', JSON.stringify(cartItems));
                renderOrderItems();
            }
            closeRemoveItemModal();
        });
    }
    // Điền sẵn họ tên, SĐT, email khi đã đăng nhập và đã có thông tin (chờ auth sẵn sàng)
    onAuthStateChanged(auth, (user) => {
        if (user && document.getElementById('orderForm')) prefillOrderFormFromProfile();
    });
}

/**
 * Nếu người dùng đã đăng nhập và đã lưu thông tin cá nhân (họ tên, SĐT, email) ở trang tài khoản
 * thì điền sẵn vào form đặt hàng. Người dùng vẫn có thể sửa. Nếu chưa nhập thông tin thì không điền.
 */
async function prefillOrderFormFromProfile() {
    const nameInput = document.getElementById('customerName') || document.querySelector('#orderForm [name="name"]');
    const phoneInput = document.getElementById('customerPhone') || document.querySelector('#orderForm [name="phone"]');
    const emailInput = document.getElementById('customerEmail') || document.querySelector('#orderForm [name="email"]');
    if (!nameInput || !phoneInput || !emailInput) return;

    const user = auth.currentUser;
    if (!user) return;

    const profile = await getUserProfile(user.uid).catch(() => null);
    if (!profile) return;

    if (profile.full_name && profile.full_name.trim()) nameInput.value = profile.full_name.trim();
    if (profile.phone && profile.phone.trim()) phoneInput.value = profile.phone.trim();
    if (profile.email && profile.email.trim()) emailInput.value = profile.email.trim();
}
function renderOrderItems() {
    const orderItemsList = document.getElementById('orderItemsList');
    const orderEmpty = document.getElementById('orderEmpty');
    const orderSummary = document.getElementById('orderSummary');
    
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    
    if (cartItems.length === 0) {
        orderItemsList.style.display = 'none';
        orderSummary.style.display = 'none';
        orderEmpty.style.display = 'block';
        return;
    }
    
    orderItemsList.innerHTML = '';
    let totalItems = 0;
    let totalCalories = 0;
    let totalPrice = 0;
    
    cartItems.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        totalItems += item.quantity;
        totalCalories += (item.calories || 0) * item.quantity;
        totalPrice += subtotal;
        
        // Build addons display if they exist
        let addonsHTML = '';
        if (item.addons && Array.isArray(item.addons) && item.addons.length > 0) {
            addonsHTML = '<div class="order-item-addons">';
            item.addons.forEach(addon => {
                // Show quantity if available
                const qty = addon.quantity || 1;
                const qtyDisplay = qty > 1 ? ` x${qty}` : '';
                addonsHTML += `
                    <div class="addon-tag">
                        <i class="fas fa-plus"></i> ${addon.name}${qtyDisplay}
                        <span class="addon-price">${formatPrice((addon.price || 0) * qty)}</span>
                    </div>
                `;
            });
            addonsHTML += '</div>';
        }

        // Display size if selected
        let sizeHTML = '';
        if (item.size) {
            sizeHTML = `<div class="order-item-size"><strong>Size:</strong> ${item.size}</div>`;
        }

        const fallbackImg = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&q=80';
        const itemImageSrc = resolveProductImageUrl(item.image || item.image_url, fallbackImg);
        
        const orderItemHTML = `
            <div class="order-item" data-index="${index}">
                <img 
                    src="${itemImageSrc}" 
                    alt="${item.name || item.product_name || 'Pizza'}" 
                    class="order-item-image"
                    referrerpolicy="no-referrer"
                    onerror="this.src='${fallbackImg}'"
                >
                <div class="order-item-details">
                    <div class="order-item-name">${item.name}</div>
                    ${sizeHTML}
                    ${addonsHTML}
                    <div class="order-item-meta">                        <span class="order-item-meta-item">
                            <i class="fas fa-fire"></i> ${item.calories || 0} cal
                        </span>
                        <span class="order-item-meta-item">
                            <i class="fas fa-tag"></i> ${formatPrice(item.price)}/cái
                        </span>
                    </div>
                </div>
                <div class="order-item-controls">
                    <div class="quantity-control">
                        <button class="quantity-btn qty-decrease" onclick="decreaseQuantity(${index})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input 
                            type="number" 
                            class="quantity-input" 
                            value="${item.quantity}" 
                            min="1" 
                            max="50"
                            onchange="updateQuantity(${index}, this.value)"
                        >
                        <button class="quantity-btn qty-increase" onclick="increaseQuantity(${index})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <div class="order-item-subtotal">
                        <div class="order-item-price">${formatPrice(subtotal)}</div>
                    </div>
                    <button 
                        class="order-item-remove" 
                        onclick="removeOrderItem(${index})"
                        title="Xóa món ăn"
                    >
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
        
        orderItemsList.innerHTML += orderItemHTML;
    });
    
    // Update summary
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('totalCalories').textContent = totalCalories + ' cal';
    document.getElementById('totalPrice').textContent = formatPrice(totalPrice);
    
    // Store total price for form submission
    window.orderTotalPrice = totalPrice;
}

/**
 * Format Price to Vietnamese format
 * 349000 -> "349.000đ"
 */
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

/**
 * Increase Quantity
 */
function increaseQuantity(index) {
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    if (cartItems[index]) {
        cartItems[index].quantity = Math.min(cartItems[index].quantity + 1, 50);
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
        renderOrderItems();
    }
}

/**
 * Decrease Quantity
 */
function decreaseQuantity(index) {
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    if (cartItems[index]) {
        cartItems[index].quantity = Math.max(cartItems[index].quantity - 1, 1);
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
        renderOrderItems();
    }
}

/**
 * Update Quantity by direct input
 */
function updateQuantity(index, newQuantity) {
    const quantity = Math.max(1, Math.min(parseInt(newQuantity) || 1, 50));
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    if (cartItems[index]) {
        cartItems[index].quantity = quantity;
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
        renderOrderItems();
    }
}

// Delete item confirm (custom modal)
let pendingRemoveIndex = null;

function openRemoveItemModal(index) {
    pendingRemoveIndex = index;
    const backdrop = document.getElementById('orderDeleteBackdrop');
    if (backdrop) {
        backdrop.classList.add('order-confirm-backdrop--open');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

function closeRemoveItemModal() {
    const backdrop = document.getElementById('orderDeleteBackdrop');
    if (backdrop) {
        backdrop.classList.remove('order-confirm-backdrop--open');
        backdrop.setAttribute('aria-hidden', 'true');
    }
    pendingRemoveIndex = null;
}

function removeOrderItem(index) {
    openRemoveItemModal(index);
}

/**
 * Setup Order Form Handlers
 * - Form validation
 * - Firebase integration for order saving
 */
function setupOrderFormHandlers() {
    const orderForm = document.getElementById('orderForm');
    
    // Return safely if form not found (not on order page)
    if (!orderForm) {
        return;
    }
    
    orderForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!auth.currentUser) {
            if (typeof window.showNotification === 'function') {
                window.showNotification('Bạn cần đăng nhập để thực hiện thao tác.');
            }
            setTimeout(function() {
                window.location.href = 'auth.html?returnUrl=' + encodeURIComponent('order.html');
            }, 1500);
            return;
        }
        
        // Clear previous errors
        clearFormErrors();
        
        // Validate form
        if (!validateOrderForm()) {
            return;
        }
        
        // Get form data
        const formData = new FormData(orderForm);
        const orderData = Object.fromEntries(formData);
        
        // Get cart items
        const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
        
        // Prepare order object for Firebase (gắn user_id nếu đã đăng nhập để hiển thị ở trang tài khoản)
        const orderToSave = {
            customer_name: orderData.name,
            customer_phone: orderData.phone,
            customer_email: orderData.email,
            delivery_address: orderData.delivery_address,
            payment_method: orderData.payment_method || 'cash',
            note: orderData.note || '',
            total_price: window.orderTotalPrice || 0,
            order_date: new Date().toISOString(),
            status: 'pending',
            items: cartItems
        };
        if (auth.currentUser) {
            orderToSave.user_id = auth.currentUser.uid;
        }
        
        try {
            // Save order to Firebase
            const result = await saveOrder(orderToSave);

            if (result.success) {
                const paymentMethod = (orderData.payment_method || '').toUpperCase();
                const useVietQr = paymentMethod === 'ONLINE' || paymentMethod === 'BANK';

                if (useVietQr && result.id) {
                    // Chuyển sang trang thanh toán VietQR
                    localStorage.removeItem('cartItems');
                    orderForm.reset();
                    updateCartCount();
                    window.location.href = 'payment.html?order_id=' + encodeURIComponent(result.id);
                    return;
                }

                // Thanh toán COD hoặc khác: thông báo thành công và về trang chủ
                showOrderSuccessMessage(orderData.name);

                localStorage.removeItem('cartItems');
                orderForm.reset();
                updateCartCount();

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                showNotification('Lỗi khi lưu đơn hàng: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving order:', error);
            showNotification('Lỗi: ' + error.message);
        }
    });
}

/**
 * Validate Order Form
 * - Check required fields
 * - Validate email & phone format
 * - Check if cart is not empty
 */
function validateOrderForm() {
    const form = document.getElementById('orderForm');
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    
    // Check cart empty
    if (cartItems.length === 0) {
        showNotification('Giỏ hàng của bạn đang trống!');
        return false;
    }
    
    const name = form.querySelector('[name="name"]').value.trim();
    const phone = form.querySelector('[name="phone"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const address = form.querySelector('[name="delivery_address"]').value.trim();
    
    let isValid = true;
    
    // Validate name
    if (!name || name.length < 3) {
        showFormError('nameError', 'Vui lòng nhập họ tên (tối thiểu 3 ký tự)');
        isValid = false;
    }
    
    // Validate phone
    const phoneRegex = /^(0[0-9]{9}|[0-9]{10})$/;
    if (!phone || !phoneRegex.test(phone)) {
        showFormError('phoneError', 'Vui lòng nhập số điện thoại hợp lệ (10 chữ số)');
        isValid = false;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        showFormError('emailError', 'Vui lòng nhập email hợp lệ');
        isValid = false;
    }
    
    // Validate address
    if (!address || address.length < 5) {
        showFormError('addressError', 'Vui lòng nhập địa chỉ giao hàng (tối thiểu 5 ký tự)');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Show Form Error Message
 */
function showFormError(errorElementId, message) {
    const errorElement = document.getElementById(errorElementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

/**
 * Clear All Form Errors
 */
function clearFormErrors() {
    document.querySelectorAll('.form-error').forEach(error => {
        error.textContent = '';
        error.classList.remove('show');
    });
}

/**
 * Show Order Success Message
 * TODO: Tạo modal thay vì notification đơn giản
 */
function showOrderSuccessMessage(customerName) {
    const notification = document.createElement('div');
    notification.className = 'order-success-notification';
    notification.innerHTML = `
        <div class="order-success-content">
            <i class="fas fa-check-circle"></i>
            <h3>Đặt hàng thành công!</h3>
            <p>Cảm ơn <strong>${customerName}</strong>,</p>
            <p>Đơn hàng của bạn đã được xác nhận.</p>
            <p style="font-size: 0.9rem; color: #ccc; margin-top: 10px;">
                Chúng tôi sẽ liên hệ sớm nhất để xác nhận thời gian giao hàng.
            </p>
        </div>
    `;
    
    // Add styles for notification
    const style = document.createElement('style');
    style.textContent = `
        .order-success-notification {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, var(--primary-color) 0%, #ff5500 100%);
            color: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            z-index: 10000;
            text-align: center;
            max-width: 400px;
            animation: slideDown 0.5s ease-out;
        }
        
        .order-success-content i {
            font-size: 4rem;
            display: block;
            margin-bottom: 20px;
            animation: pulse 1s ease-in-out;
        }
        
        .order-success-content h3 {
            font-size: 1.8rem;
            margin-bottom: 15px;
        }
        
        .order-success-content p {
            font-size: 1rem;
            line-height: 1.6;
        }
        
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translate(-50%, -60%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Remove after 2 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

/**
 * Export functions to global window scope for HTML onclick handlers
 */
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.updateQuantity = updateQuantity;
window.removeOrderItem = removeOrderItem;