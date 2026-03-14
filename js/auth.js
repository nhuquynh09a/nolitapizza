// ===== FIREBASE AUTH (ES Module) =====
// Import auth + user profile từ firebase.js
import { auth, onAuthStateChanged, login, register, loginWithGooglePopup, loginWithGoogleRedirect, getAuthRedirectResult, logout, saveUserProfile, getUserProfile, resetPassword } from './firebase.js';

// ============================================
// FIREBASE AUTH ERROR MESSAGES (tiếng Việt)
// ============================================
const AUTH_ERROR_MESSAGES = {
    'auth/email-already-in-use': 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.',
    'auth/invalid-email': 'Email không hợp lệ.',
    'auth/operation-not-allowed': 'Phương thức đăng nhập chưa được bật. Vào Firebase Console → Authentication → Sign-in method → Bật Email/Password hoặc Google.',
    'auth/weak-password': 'Mật khẩu quá yếu (ít nhất 6 ký tự).',
    'auth/user-disabled': 'Tài khoản đã bị vô hiệu hóa.',
    'auth/user-not-found': 'Không tìm thấy tài khoản với email này.',
    'auth/wrong-password': 'Sai mật khẩu.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/too-many-requests': 'Quá nhiều lần thử. Vui lòng thử lại sau.',
    'auth/unauthorized-domain': 'Domain chưa được phép. Vào Firebase Console → Authentication → Settings → Authorized domains → Thêm 127.0.0.1 và localhost.',
    'auth/popup-blocked': 'Popup bị chặn. Đang dùng đăng nhập chuyển hướng.',
    'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập.',
    'auth/cancelled-popup-request': 'Đã hủy đăng nhập.',
    'auth/redirect-cancelled-by-user': 'Bạn đã hủy đăng nhập Google.',
    'auth/redirect-operation-pending': 'Đang xử lý đăng nhập, vui lòng đợi.',
    'auth/credential-already-in-use': 'Tài khoản này đã được liên kết với phương thức đăng nhập khác.',
};
function getAuthErrorMessage(err) {
    const code = err && err.code;
    return AUTH_ERROR_MESSAGES[code] || (err && err.message) || 'Có lỗi xảy ra. Vui lòng thử lại.';
}

// ============================================
// ĐIỀU HƯỚNG THEO ROLE (chỉ redirect khi đã lấy được role)
// ============================================
const ROLE_PAGES = {
    admin: 'admin-account.html',
    user: 'user-account.html',
    kitchen: 'kitchen-account.html',
    shipper: 'shipper-account.html',
};

/**
 * Lấy profile từ DB và chuyển hướng theo role. Gọi sau khi login thành công.
 * goToIndex = true: luôn về index.html. goToIndex = false: admin → admin-account.html, user → user-account.html, ...
 * Email quantrinolitapizza@gmail.com luôn được coi là admin (tạo profile admin nếu chưa có).
 * @param {string} uid
 * @param {boolean} goToIndex - true thì chuyển về index.html, false thì theo role
 * @returns {Promise<void>}
 */
const ADMIN_EMAIL = 'quantrinolitapizza@gmail.com';

async function redirectAfterLogin(uid, goToIndex = true) {
    // Xóa giỏ hàng của khách vãng lai khi người dùng đăng nhập (tránh thấy món khách đã thêm)
    try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem('cartItems');
        if (typeof window !== 'undefined') window.cartItems = [];
    } catch (e) {}

    if (window.__authReturnUrl) {
        const url = window.__authReturnUrl;
        window.__authReturnUrl = null;
        window.location.href = url;
        return;
    }
    if (goToIndex) {
        window.location.href = 'index.html';
        return;
    }
    try {
        let profile = await getUserProfile(uid);
        const currentUser = auth.currentUser;
        const email = (currentUser && currentUser.email) || '';
        const displayName = (currentUser && currentUser.displayName) || email;

        if (!profile) {
            if (email === ADMIN_EMAIL) {
                console.log('[auth] Tài khoản admin chưa có profile, tạo mới role=admin');
                await saveUserProfile(uid, {
                    full_name: displayName,
                    email,
                    role: 'admin',
                    status: 'active',
                    created_at: new Date().toISOString(),
                });
                profile = { role: 'admin' };
            } else {
                // Người dùng mới (Google lần đầu hoặc Auth có sẵn nhưng chưa có profile): tạo profile user
                const providerId = (currentUser.providerData && currentUser.providerData[0] && currentUser.providerData[0].providerId) || 'password';
                await saveUserProfile(uid, {
                    full_name: displayName,
                    email,
                    provider: providerId === 'google.com' ? 'google' : 'email',
                    role: 'user',
                    status: 'active',
                    created_at: new Date().toISOString(),
                });
                profile = { role: 'user' };
            }
        } else if (email === ADMIN_EMAIL && profile.role !== 'admin') {
            profile = { ...profile, role: 'admin' };
        }

        const role = profile.role;
        const page = ROLE_PAGES[role];
        if (!page) {
            console.warn('[auth] Role không hợp lệ:', role);
            window.location.href = 'index.html';
            return;
        }
        console.log('[auth] Redirect theo role:', role, '->', page);
        window.location.href = page;
    } catch (err) {
        console.error('[auth] redirectAfterLogin error:', err);
        showErrorMessage('Không thể tải thông tin tài khoản. Chuyển về trang chủ.');
        window.location.href = 'index.html';
    }
}

// Hàm dùng chung: xử lý sau khi đăng nhập Google thành công (từ popup hoặc redirect)
async function handleGoogleLoginSuccess(userCredential) {
    const user = userCredential.user;
    const uid = user.uid;
    const email = user.email || '';
    const displayName = user.displayName || email;
    let profile = await getUserProfile(uid);
    if (!profile && email !== ADMIN_EMAIL) {
        await saveUserProfile(uid, {
            full_name: displayName,
            email,
            provider: 'google',
            role: 'user',
            status: 'active',
            created_at: new Date().toISOString(),
        });
    }
    showSuccessMessage("Đăng nhập Google thành công!");
    await new Promise(r => setTimeout(r, 600));
    await redirectAfterLogin(uid, false);
}

//  ============================================
// AUTH PAGE JAVASCRIPT
// ============================================

function updateHeaderAuthState(user) {
    const authButtons = document.getElementById('auth-buttons');
    const userIcon = document.getElementById('user-icon');
    if (authButtons) authButtons.style.display = user ? 'none' : '';
    if (userIcon) userIcon.style.display = user ? '' : 'none';
    document.querySelectorAll('.auth-nav-item').forEach(el => {
        el.style.display = user ? 'none' : '';
    });
    document.body.classList.add('auth-ready');
}

onAuthStateChanged(auth, (user) => {
    updateHeaderAuthState(user);
});

const userIconEl = document.getElementById('user-icon');
if (userIconEl) {
    userIconEl.addEventListener('click', async (e) => {
        if (userIconEl.tagName.toLowerCase() === 'a') return;
        e.preventDefault();
        try {
            const current = auth.currentUser;
            if (!current) {
                window.location.href = 'auth.html';
                return;
            }
            const profile = await getUserProfile(current.uid).catch(() => null);
            const role = profile?.role || 'user';
            const page = ROLE_PAGES[role] || 'user-account.html';
            window.location.href = page;
        } catch (err) {
            console.error('[auth] user-icon redirect error:', err);
            window.location.href = 'user-account.html';
        }
    });
}

// Notification functions (dùng cho auth page + redirectAfterLogin)
function showNotification(message) {
  if (typeof window.showNotification === 'function') {
    window.showNotification(message);
    return;
  }
  const notification = document.createElement('div');
  notification.className = 'notification success-notification';
  notification.innerHTML = `<i class="fas fa-check-circle"></i><span>${message}</span>`;
  document.body.appendChild(notification);
  setTimeout(() => notification.classList.add('show'), 100);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showSuccessMessage(message) {
  showNotification(message);
}

function showErrorMessage(message) {
  const notification = document.createElement('div');
  notification.className = 'notification error-notification';
  notification.innerHTML = `
    <i class="fas fa-times-circle"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.classList.add('show'), 100);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Chỉ chạy code form/tab khi đang ở trang auth (auth.html)
if (document.getElementById('loginForm')) {

// Lưu returnUrl từ query string để sau khi đăng nhập chuyển về trang yêu cầu
(function initAuthReturnUrl() {
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get('returnUrl');
    if (returnUrl) {
        const allowed = ['index.html', 'order.html', 'contact.html', 'reviews.html'];
        const path = returnUrl.split('?')[0];
        if (allowed.includes(path)) {
            window.__authReturnUrl = returnUrl;
            showNotification('Bạn cần đăng nhập để thực hiện thao tác.');
        }
    }
})();

// Xử lý kết quả đăng nhập Google sau redirect (khi quay lại từ Google)
(async function handleGoogleRedirectResult() {
    try {
        const result = await getAuthRedirectResult();
        if (!result || !result.user) return;
        await handleGoogleLoginSuccess(result);
    } catch (err) {
        console.error('[auth] Google redirect result error:', err);
        const msg = getAuthErrorMessage(err);
        showErrorMessage(msg);
        if (err && err.code === 'auth/unauthorized-domain') {
            console.warn('[auth] Thêm 127.0.0.1 và localhost vào Firebase Console → Authentication → Authorized domains');
        }
    }
})();

// Tab Switching
document.querySelectorAll('.auth-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        switchAuthTab(tabName);
    });
});

// Tab switch via links
document.querySelectorAll('.tab-switch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = btn.dataset.tab;
        switchAuthTab(tabName);
    });
});

function switchAuthTab(tabName) {
    // Deactivate all tabs
    document.querySelectorAll('.auth-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Activate selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// Password Toggle
document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', function() {
        const targetId = this.dataset.target;
        const input = document.getElementById(targetId);
        const icon = this.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
});

// ============================================
// FORM VALIDATION
// ============================================

// Forgot password (reset via email)
const forgotLink = document.querySelector('.forgot-password-link');
const forgotBackdrop = document.getElementById('forgotPasswordBackdrop');
const forgotForm = document.getElementById('forgotPasswordForm');
const forgotEmailInput = document.getElementById('forgotEmail');
const forgotEmailError = document.getElementById('forgotEmailError');
const forgotSubmitBtn = document.getElementById('forgotSubmitBtn');
const forgotCancelBtn = document.getElementById('forgotCancelBtn');
const forgotCloseBtn = document.getElementById('forgotCloseBtn');

function openForgotModal(prefillEmail) {
    if (!forgotBackdrop) return;
    if (forgotEmailError) forgotEmailError.textContent = '';
    if (forgotEmailInput) {
        forgotEmailInput.value = prefillEmail || '';
    }
    forgotBackdrop.classList.add('auth-modal-backdrop--open');
    forgotBackdrop.setAttribute('aria-hidden', 'false');
    if (forgotEmailInput) {
        setTimeout(() => forgotEmailInput.focus(), 50);
    }
}

function closeForgotModal() {
    if (!forgotBackdrop) return;
    forgotBackdrop.classList.remove('auth-modal-backdrop--open');
    forgotBackdrop.setAttribute('aria-hidden', 'true');
}

if (forgotLink && forgotBackdrop && forgotForm) {
    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        const currentEmail = (document.getElementById('loginEmail')?.value || '').trim();
        openForgotModal(currentEmail);
    });

    forgotBackdrop.addEventListener('click', (e) => {
        if (e.target === forgotBackdrop) {
            closeForgotModal();
        }
    });
    if (forgotCancelBtn) forgotCancelBtn.addEventListener('click', closeForgotModal);
    if (forgotCloseBtn) forgotCloseBtn.addEventListener('click', closeForgotModal);

    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!forgotEmailInput || !forgotSubmitBtn) return;
        const email = forgotEmailInput.value.trim();
        if (forgotEmailError) forgotEmailError.textContent = '';

        if (!email) {
            if (forgotEmailError) forgotEmailError.textContent = 'Vui lòng nhập email';
            return;
        }
        if (!isValidEmail(email)) {
            if (forgotEmailError) forgotEmailError.textContent = 'Email không hợp lệ';
            return;
        }

        const originalText = forgotSubmitBtn.innerHTML;
        forgotSubmitBtn.disabled = true;
        forgotSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';

        try {
            await resetPassword(email);
            closeForgotModal();
            showSuccessMessage('Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.');
        } catch (err) {
            console.error('[auth] reset password error:', err);
            const msg = getAuthErrorMessage(err);
            showErrorMessage(msg);
        } finally {
            forgotSubmitBtn.disabled = false;
            forgotSubmitBtn.innerHTML = originalText;
        }
    });
}

// Login Form
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!validateLoginForm()) return;

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const userCredential = await login(email, password);
        const uid = userCredential.user.uid;
        console.log('[auth] Login thành công, uid:', uid);

        showSuccessMessage("Đăng nhập thành công!");

        await redirectAfterLogin(uid, false);

    } catch (err) {
        showErrorMessage(getAuthErrorMessage(err));
        console.error('[auth] Login error:', err);
    }
});

// Register Form
document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!validateRegisterForm()) return;

    const full_name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    try {
        const userCredential = await register(email, password);
        const uid = userCredential.user.uid;
        console.log('[auth] Đăng ký Firebase Auth thành công, uid:', uid);

        const existing = await getUserProfile(uid);
        if (existing) {
            console.warn('[auth] users/{uid} đã tồn tại, không ghi đè. uid:', uid);
            showSuccessMessage("Đăng ký thành công!");
            setTimeout(() => {
                switchAuthTab('login');
                document.getElementById('registerForm').reset();
            }, 1000);
            return;
        }

        await saveUserProfile(uid, {
            full_name,
            email,
            provider: 'email',
            role: 'user',
            status: 'active',
            created_at: new Date().toISOString(),
        });
        console.log('[auth] Đã lưu user vào Realtime Database users/' + uid);

        showSuccessMessage("Đăng ký thành công!");

        setTimeout(() => {
            switchAuthTab('login');
            document.getElementById('registerForm').reset();
        }, 1000);

    } catch (err) {
        showErrorMessage(getAuthErrorMessage(err));
        console.error('[auth] Register error:', err);
    }
});

// Validation functions
function validateLoginForm() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    let isValid = true;

    // Clear previous errors
    document.getElementById('loginEmailError').textContent = '';
    document.getElementById('loginPasswordError').textContent = '';

    // Validate email (Firebase Auth chỉ hỗ trợ đăng nhập bằng email)
    if (!email) {
        document.getElementById('loginEmailError').textContent = 'Vui lòng nhập email';
        isValid = false;
    } else if (!isValidEmail(email)) {
        document.getElementById('loginEmailError').textContent = 'Email không hợp lệ';
        isValid = false;
    }

    // Validate password
    if (!password) {
        document.getElementById('loginPasswordError').textContent = 'Vui lòng nhập mật khẩu';
        isValid = false;
    } else if (password.length < 6) {
        document.getElementById('loginPasswordError').textContent = 'Mật khẩu phải ít nhất 6 ký tự';
        isValid = false;
    }

    return isValid;
}

function validateRegisterForm() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    let isValid = true;

    // Clear previous errors
    document.getElementById('registerNameError').textContent = '';
    document.getElementById('registerEmailError').textContent = '';
    document.getElementById('registerPhoneError').textContent = '';
    document.getElementById('registerPasswordError').textContent = '';
    document.getElementById('registerConfirmPasswordError').textContent = '';

    // Validate name
    if (!name) {
        document.getElementById('registerNameError').textContent = 'Vui lòng nhập họ và tên';
        isValid = false;
    } else if (name.length < 3) {
        document.getElementById('registerNameError').textContent = 'Họ và tên phải ít nhất 3 ký tự';
        isValid = false;
    }

    // Validate email
    if (!email) {
        document.getElementById('registerEmailError').textContent = 'Vui lòng nhập email';
        isValid = false;
    } else if (!isValidEmail(email)) {
        document.getElementById('registerEmailError').textContent = 'Email không hợp lệ';
        isValid = false;
    }

    // Validate phone
    if (!phone) {
        document.getElementById('registerPhoneError').textContent = 'Vui lòng nhập số điện thoại';
        isValid = false;
    } else if (!isValidPhone(phone)) {
        document.getElementById('registerPhoneError').textContent = 'Số điện thoại phải đủ 10 chữ số';
        isValid = false;
    }

    // Validate password
    if (!password) {
        document.getElementById('registerPasswordError').textContent = 'Vui lòng nhập mật khẩu';
        isValid = false;
    } else if (password.length < 6) {
        document.getElementById('registerPasswordError').textContent = 'Mật khẩu phải ít nhất 6 ký tự';
        isValid = false;
    }

    // Validate confirm password
    if (!confirmPassword) {
        document.getElementById('registerConfirmPasswordError').textContent = 'Vui lòng xác nhận mật khẩu';
        isValid = false;
    } else if (password !== confirmPassword) {
        document.getElementById('registerConfirmPasswordError').textContent = 'Mật khẩu không khớp';
        isValid = false;
    }

    // Validate terms
    if (!agreeTerms) {
        showErrorMessage('Bạn phải đồng ý với điều khoản dịch vụ');
        isValid = false;
    }

    return isValid;
}

// Helper validation functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
}

function isValidEmailOrPhone(input) {
    return isValidEmail(input) || isValidPhone(input);
}

// Google Login: thử popup trước, nếu lỗi (COOP/popup bị chặn) thì chuyển sang redirect
document.querySelectorAll('.google-btn').forEach(btn => {
    btn.addEventListener('click', async function(e) {
        e.preventDefault();
        try {
            const userCredential = await loginWithGooglePopup();
            await handleGoogleLoginSuccess(userCredential);
        } catch (err) {
            const code = err && err.code;
            const msg = (err && err.message) || '';
            const useRedirect = code === 'auth/popup-blocked' ||
                code === 'auth/cancelled-popup-request' ||
                code === 'auth/popup-closed-by-user' ||
                /cross-origin-opener-policy|window\.closed/i.test(msg);
            if (useRedirect) {
                showSuccessMessage("Đang chuyển đến Google...");
                await loginWithGoogleRedirect();
            } else {
                showErrorMessage(getAuthErrorMessage(err));
                console.error('[auth] Google login error:', err);
            }
        }
    });
});
}
