// ============================================
// CONTACT PAGE JAVASCRIPT
// Firebase Realtime Database Integration
// ============================================

import { saveContactMessage, auth } from './firebase.js';

// Khởi tạo Contact Form khi DOM loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeContactForm();
});

/**
 * Khởi tạo Form liên hệ
 * - Kiểm tra xem form có tồn tại không
 * - Setup event handlers
 */
function initializeContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    // Chỉ chạy nếu form tồn tại (trang contact.html)
    if (!contactForm) {
        return;
    }
    
    // Gắn sự kiện submit cho form
    contactForm.addEventListener('submit', handleContactFormSubmit);
    
    // Xóa lỗi khi user bắt đầu nhập
    setupFormInputListeners(contactForm);
}

/**
 * Xử lý sự kiện submit form liên hệ
 * @param {Event} e - Submit event
 */
function handleContactFormSubmit(e) {
    e.preventDefault();

    if (!auth.currentUser) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Bạn cần đăng nhập để thực hiện thao tác.');
        }
        setTimeout(function() {
            window.location.href = 'auth.html?returnUrl=' + encodeURIComponent('contact.html');
        }, 1500);
        return;
    }
    
    // Xóa tất cả thông báo lỗi cũ
    clearAllFormErrors();
    
    // Validate form
    if (!validateContactForm()) {
        return;
    }
    
    // Lấy dữ liệu từ form
    const formData = new FormData(this);
    
    // Tạo object contactMessage theo ERD
    const contactMessage = createContactMessage(formData);
    
    // Gửi đến Firebase
    saveAndSubmitContact(contactMessage);
}

/**
 * Tạo object contactMessage theo ERD
 * @param {FormData} formData - Dữ liệu từ form
 * @returns {Object} Contact message object
 */
function createContactMessage(formData) {
    return {
        // contact_id: Giả lập bằng timestamp (sau này sẽ do server sinh)
        contact_id: Date.now(),
        
        // Thông tin khách hàng
        full_name: formData.get('full_name').trim(),
        email: formData.get('email').trim(),
        phone: formData.get('phone').trim() || null,
        subject: formData.get('subject').trim() || 'Không có tiêu đề',
        message: formData.get('message').trim(),
        
        // Metadata
        created_at: new Date().toISOString(),
        status: 'new', // Trạng thái mặc định: mới nhận
        
        // TODO: Thêm thông tin bổ sung khi cần
        // user_ip: '...',
        // user_agent: navigator.userAgent,
    };
}

/**
 * Validate form liên hệ
 * Kiểm tra:
 * - Họ tên không trống và >= 3 ký tự
 * - Email hợp lệ
 * - Lời nhắn không trống
 * 
 * @returns {Boolean} True nếu valid, False nếu có lỗi
 */
function validateContactForm() {
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    
    let isValid = true;
    
    // Validate Họ tên
    if (!fullName || fullName.length < 3) {
        showFormError('fullNameError', 'Vui lòng nhập họ tên (tối thiểu 3 ký tự)');
        isValid = false;
    }
    
    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        showFormError('emailError', 'Vui lòng nhập email hợp lệ');
        isValid = false;
    }
    
    // Validate Lời nhắn
    if (!message || message.length < 10) {
        showFormError('messageError', 'Vui lòng nhập lời nhắn (tối thiểu 10 ký tự)');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Hiển thị thông báo lỗi cho trường form
 * @param {String} errorElementId - ID của error span
 * @param {String} errorMessage - Nội dung lỗi
 */
function showFormError(errorElementId, errorMessage) {
    const errorElement = document.getElementById(errorElementId);
    if (errorElement) {
        errorElement.textContent = errorMessage;
        errorElement.classList.add('show');
    }
}

/**
 * Xóa tất cả thông báo lỗi
 */
function clearAllFormErrors() {
    const errorElements = document.querySelectorAll('.form-error');
    errorElements.forEach(error => {
        error.textContent = '';
        error.classList.remove('show');
    });
}

/**
 * Setup listeners để xóa lỗi khi user nhập
 * @param {HTMLFormElement} form - Form element
 */
function setupFormInputListeners(form) {
    const inputs = form.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            // Xóa lỗi của field này khi user focus vào
            const errorId = this.name + 'Error';
            const errorElement = document.getElementById(errorId);
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.classList.remove('show');
            }
        });
    });
}

/**
 * Gửi dữ liệu contact tới Firebase
 * @param {Object} contactMessage - Dữ liệu liên hệ
 */
async function saveAndSubmitContact(contactMessage) {
    try {
        // Gửi dữ liệu tới Firebase
        const result = await saveContactMessage(contactMessage);
        
        if (result.success) {
            // Hiển thị thông báo thành công
            showContactSuccessMessage();
            
            // Reset form
            const contactForm = document.getElementById('contactForm');
            if (contactForm) {
                contactForm.reset();
            }
            
            // Xóa tất cả lỗi
            clearAllFormErrors();
            
            console.log('Contact saved successfully with ID:', result.id);
        } else {
            // Hiển thị lỗi nếu save thất bại
            showErrorMessage(result.error || 'Có lỗi xảy ra, vui lòng thử lại!');
            console.error('Error saving contact:', result.error);
        }
    } catch (error) {
        console.error('Error in saveAndSubmitContact:', error);
        showErrorMessage('Có lỗi xảy ra, vui lòng thử lại!');
    }
}

/**
 * Hiển thị thông báo lỗi
 * @param {String} errorMessage - Nội dung lỗi
 */
function showErrorMessage(errorMessage) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'contact-error-notification';
    errorContainer.innerHTML = `
        <div class="contact-error-content">
            <i class="fas fa-exclamation-circle"></i>
            <h3>Lỗi!</h3>
            <p>${errorMessage}</p>
        </div>
    `;
    
    // Thêm styles nếu chưa có
    if (!document.querySelector('#contact-error-styles')) {
        const style = document.createElement('style');
        style.id = 'contact-error-styles';
        style.textContent = `
            .contact-error-notification {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #ff3333 0%, #cc0000 100%);
                color: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                z-index: 10000;
                text-align: center;
                max-width: 400px;
                animation: slideDown 0.5s ease-out;
            }
            
            .contact-error-content i {
                font-size: 4rem;
                display: block;
                margin-bottom: 20px;
            }
            
            .contact-error-content h3 {
                font-size: 1.8rem;
                margin-bottom: 15px;
                font-family: 'Playfair Display', serif;
            }
            
            .contact-error-content p {
                font-size: 1rem;
                line-height: 1.6;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(errorContainer);
    
    // Xóa notification sau 4 giây
    setTimeout(() => {
        errorContainer.style.opacity = '0';
        errorContainer.style.transition = 'opacity 0.3s ease';
        setTimeout(() => errorContainer.remove(), 300);
    }, 4000);
}

/**
 * Hiển thị thông báo thành công
 * Tạo một modal/notification thành công
 */
function showContactSuccessMessage() {
    // Tạo container cho message
    const successContainer = document.createElement('div');
    successContainer.className = 'contact-success-notification';
    successContainer.innerHTML = `
        <div class="contact-success-content">
            <i class="fas fa-check-circle"></i>
            <h3>Gửi liên hệ thành công!</h3>
            <p>Cảm ơn bạn đã liên hệ với Nolita Pizza.</p>
            <p style="font-size: 0.9rem; color: #ccc; margin-top: 10px;">
                Chúng tôi sẽ phản hồi liên hệ của bạn trong vòng 24 giờ.
            </p>
        </div>
    `;
    
    // Thêm styles nếu chưa có
    if (!document.querySelector('#contact-success-styles')) {
        const style = document.createElement('style');
        style.id = 'contact-success-styles';
        style.textContent = `
            .contact-success-notification {
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
            
            .contact-success-content i {
                font-size: 4rem;
                display: block;
                margin-bottom: 20px;
                animation: pulse 1s ease-in-out;
            }
            
            .contact-success-content h3 {
                font-size: 1.8rem;
                margin-bottom: 15px;
                font-family: 'Playfair Display', serif;
            }
            
            .contact-success-content p {
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
    }
    
    document.body.appendChild(successContainer);
    
    // Xóa notification sau 3 giây
    setTimeout(() => {
        successContainer.style.opacity = '0';
        successContainer.style.transition = 'opacity 0.3s ease';
        setTimeout(() => successContainer.remove(), 300);
    }, 3000);
}
