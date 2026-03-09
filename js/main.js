// ============================================
// INITIALIZE AOS (Animate On Scroll)
// ============================================
if (typeof AOS !== 'undefined') {
    AOS.init({
        duration: 1000,
        once: true,
        offset: 100,
        easing: 'ease-in-out'
    });
}

// ============================================
// HEADER SCROLL EFFECT
// ============================================
const headerElement = document.getElementById('header');

if (headerElement) {
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            headerElement.classList.add('scrolled');
        } else {
            headerElement.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
}

// ============================================
// SHOPPING CART BUTTON REDIRECT
// ============================================
const cartButton = document.querySelector('.btn-cart');

if (cartButton) {
    cartButton.addEventListener('click', () => {
        window.location.href = 'order.html';
    });
}

// ============================================
// ACCOUNT BUTTON REDIRECT
// ============================================
const accountButton = document.getElementById('accountBtn');

if (accountButton) {
    accountButton.addEventListener('click', () => {
        window.location.href = 'auth.html';
    });
}

// ============================================
// MOBILE MENU TOGGLE
// ============================================
const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');
const navLinks = document.querySelectorAll('.nav-link');

if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
        menuToggle.classList.toggle('active');
    });

    // Close menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
            menuToggle.classList.remove('active');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
            nav.classList.remove('active');
            menuToggle.classList.remove('active');
        }
    });
}

// ============================================
// ACTIVE NAV LINK ON SCROLL
// ============================================
const sections = document.querySelectorAll('section[id]');

function activateNavLink() {
    const scrollY = window.pageYOffset;
    
    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
        
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLinks.forEach(link => link.classList.remove('active'));
            if (navLink) {
                navLink.classList.add('active');
            }
        }
    });
}

window.addEventListener('scroll', activateNavLink);

// ============================================
// HERO SLIDER
// ============================================
const heroSlides = document.querySelectorAll('.hero-slide');
const heroDots = document.querySelectorAll('.hero-dots .dot');
const heroPrev = document.querySelector('.hero-prev');
const heroNext = document.querySelector('.hero-next');
const hero = document.querySelector('.hero');

// Only initialize hero slider if elements exist (on index page)
if (heroSlides.length > 0 && heroNext && heroPrev) {
    let currentSlide = 0;
    let slideInterval;

    function showSlide(index) {
        heroSlides.forEach((slide, i) => {
            slide.classList.remove('active');
            if (i === index) {
                slide.classList.add('active');
            }
        });
        
        heroDots.forEach((dot, i) => {
            dot.classList.remove('active');
            if (i === index) {
                dot.classList.add('active');
            }
        });
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % heroSlides.length;
        showSlide(currentSlide);
    }

    function prevSlide() {
        currentSlide = (currentSlide - 1 + heroSlides.length) % heroSlides.length;
        showSlide(currentSlide);
    }

    function startSlider() {
        slideInterval = setInterval(nextSlide, 5000);
    }

    function stopSlider() {
        clearInterval(slideInterval);
    }

    // Initialize slider
    startSlider();

    // Event listeners
    heroNext.addEventListener('click', () => {
        nextSlide();
        stopSlider();
        startSlider();
    });

    heroPrev.addEventListener('click', () => {
        prevSlide();
        stopSlider();
        startSlider();
    });

    heroDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentSlide = index;
            showSlide(currentSlide);
            stopSlider();
            startSlider();
        });
    });

    // Pause on hover
    if (hero) {
        hero.addEventListener('mouseenter', stopSlider);
        hero.addEventListener('mouseleave', startSlider);
    }
}

// ============================================
// TESTIMONIALS SLIDER
// ============================================
const testimonialSlides = document.querySelectorAll('.testimonial-slide');
const testimonialDots = document.querySelectorAll('.testimonial-dots .dot');
let currentTestimonial = 0;
let testimonialInterval;

function showTestimonial(index) {
    testimonialSlides.forEach((slide, i) => {
        slide.classList.remove('active');
        if (i === index) {
            slide.classList.add('active');
        }
    });
    
    testimonialDots.forEach((dot, i) => {
        dot.classList.remove('active');
        if (i === index) {
            dot.classList.add('active');
        }
    });
}

function nextTestimonial() {
    currentTestimonial = (currentTestimonial + 1) % testimonialSlides.length;
    showTestimonial(currentTestimonial);
}

function startTestimonialSlider() {
    testimonialInterval = setInterval(nextTestimonial, 6000);
}

// Initialize testimonial slider
startTestimonialSlider();

testimonialDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        currentTestimonial = index;
        showTestimonial(currentTestimonial);
        clearInterval(testimonialInterval);
        startTestimonialSlider();
    });
});

// ============================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        
        if (target) {
            const headerHeight = header.offsetHeight;
            const targetPosition = target.offsetTop - headerHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ============================================
// ADD TO CART FUNCTIONALITY (for index page)
// ============================================
const addToCartButtons = document.querySelectorAll('.add-to-cart');
const cartCount = document.querySelector('.cart-count');

// Only initialize if elements exist and cartItems is not already declared (from menu.js)
if (addToCartButtons.length > 0 && cartCount && typeof cartItems === 'undefined') {
    let cartItemCount = 0;

    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productName = this.getAttribute('data-name');
            const productPrice = this.getAttribute('data-price');
            
            cartItemCount++;
            cartCount.textContent = cartItemCount;
            cartCount.style.animation = 'pulse 0.5s ease';
            
            // Show notification
            showNotification(`${productName} đã được thêm vào giỏ hàng!`);
            
            // Reset animation
            setTimeout(() => {
                cartCount.style.animation = '';
            }, 500);
        });
    });
}

// ============================================
// UPDATE CART COUNT IN HEADER
// ============================================
function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (!cartCount) return;
    try {
        const raw = localStorage.getItem('cartItems');
        const cartItems = raw ? JSON.parse(raw) : [];
        let totalQuantity = 0;
        if (Array.isArray(cartItems)) {
            cartItems.forEach(item => { totalQuantity += item.quantity || 1; });
        }
        cartCount.textContent = totalQuantity;
    } catch (e) {
        cartCount.textContent = '0';
    }
}

// Expose to global scope for use in ES6 modules
window.updateCartCount = updateCartCount;

// Cập nhật số lượng giỏ hàng trên header khi load trang (Trang chủ, Liên hệ, Về chúng tôi, Đánh giá, ...)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateCartCount);
} else {
    updateCartCount();
}

// ============================================
// NOTIFICATION FUNCTION
// ============================================
function showNotification(message) {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Hide and remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Expose to global scope for use in ES6 modules
window.showNotification = showNotification;

// Add notification styles
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 100px;
        right: 20px;
        background-color: var(--primary-color);
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.3s ease;
        font-weight: 500;
    }
    
    .notification.show {
        opacity: 1;
        transform: translateX(0);
    }
    
    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.2);
        }
    }
`;
document.head.appendChild(style);

// ============================================
// NEWSLETTER FORM HANDLING
// ============================================
const newsletterForm = document.getElementById('newsletterForm');

// Only add listener if newsletter form exists (not on order page)
if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = this.querySelector('.newsletter-input').value;
        
        if (email) {
            showNotification('Cảm ơn bạn đã đăng ký nhận tin!');
            this.querySelector('.newsletter-input').value = '';
        }
    });
}

// ============================================
// IMAGE LAZY LOADING (Optional Enhancement)
// ============================================
const images = document.querySelectorAll('img[data-src]');

const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.getAttribute('data-src');
            img.removeAttribute('data-src');
            observer.unobserve(img);
        }
    });
});

images.forEach(img => imageObserver.observe(img));

// ============================================
// PARALLAX EFFECT FOR HERO (Optional)
// ============================================
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroImages = document.querySelectorAll('.hero-image');
    
    heroImages.forEach(img => {
        if (img.parentElement.classList.contains('active')) {
            img.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });
});

// ============================================
// LOADING ANIMATION (Optional)
// ============================================
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// ============================================
// FEATURED PRODUCTS (HOME PAGE)
// ============================================
(async function initFeaturedProducts() {
    // Chỉ chạy trên trang chủ (index.html) – kiểm tra phần tử đặc trưng
    const heroSection = document.querySelector('.hero');
    const featuredSection = document.getElementById('featuredProducts');

    if (!heroSection || !featuredSection) {
        return;
    }

    try {
        console.log('🏁 Loading featured products...');

        // Dynamic import để không phá các trang khác đang dùng main.js như script thường
        const { getFeaturedProducts, resolveProductImageUrl } = await import('./firebase.js');

        const products = await getFeaturedProducts();
        console.log('✅ Featured products loaded:', products);

        renderFeaturedProducts(products, featuredSection, resolveProductImageUrl);
    } catch (error) {
        console.error('❌ Error loading featured products:', error);
    }
})();

/**
 * Render slider món nổi bật (center nổi bật, hai bên nhỏ + mờ, autoplay, hover dừng)
 */
function renderFeaturedProducts(products, containerSection, resolveProductImageUrl) {
    const track = containerSection.querySelector('.featured-track');
    const slider = containerSection.querySelector('.featured-slider');

    if (!track || !slider) {
        const wrap = containerSection;
        if (wrap) wrap.innerHTML = '<p class="featured-empty">Chưa có món nổi bật.</p>';
        return;
    }

    track.innerHTML = '';

    if (!products || products.length === 0) {
        containerSection.innerHTML = '<p class="featured-empty">Chưa có món nổi bật.</p>';
        return;
    }

    const fallbackImg = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80';
    products.forEach(product => {
        const imageUrl = resolveProductImageUrl
            ? resolveProductImageUrl(product.image_url, fallbackImg)
            : (product.image_url || fallbackImg);
        const priceText = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price || 0);

        const slide = document.createElement('div');
        slide.className = 'featured-slide';
        slide.innerHTML = `
            <div class="featured-card">
                <a href="product-detail.html?id=${product.product_id}" class="featured-image-wrapper">
                    <img src="${imageUrl}" alt="${(product.product_name || '').replace(/"/g, '&quot;')}" class="featured-image" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='${fallbackImg}'">
                </a>
                <div class="featured-content">
                    <h3 class="featured-name">
                        <a href="product-detail.html?id=${product.product_id}">${(product.product_name || 'Món ăn').replace(/</g, '&lt;')}</a>
                    </h3>
                    <div class="featured-price">${priceText}</div>
                </div>
            </div>
        `;
        track.appendChild(slide);
    });

    initFeaturedSlider(containerSection, products.length);
}

const FEATURED_AUTOPLAY_MS = 3500;

function initFeaturedSlider(containerSection, totalSlides) {
    const track = containerSection.querySelector('.featured-track');
    const viewport = containerSection.querySelector('.featured-viewport');
    const prevBtn = containerSection.querySelector('.featured-prev');
    const nextBtn = containerSection.querySelector('.featured-next');
    const slider = containerSection.querySelector('.featured-slider');

    if (!track || !viewport || totalSlides === 0) return;

    let currentIndex = 0;
    let autoplayTimer = null;
    let paused = false;

    function getSlideStep() {
        const first = track.querySelector('.featured-slide');
        if (!first || !viewport) return viewport ? viewport.offsetWidth / 3 : 280;
        return first.offsetWidth + 24;
    }

    function updateSlider() {
        const slides = track.querySelectorAll('.featured-slide');
        if (slides.length === 0) return;

        currentIndex = (currentIndex % totalSlides + totalSlides) % totalSlides;
        const step = getSlideStep();
        const first = track.querySelector('.featured-slide');
        const slideWidth = first ? first.offsetWidth : step;
        const centerOffset = (viewport.offsetWidth / 2) - (slideWidth / 2);
        const translateX = centerOffset - currentIndex * step;
        track.style.transform = `translate3d(${translateX}px, 0, 0)`;

        slides.forEach((el, i) => {
            el.classList.remove('featured-slide--center', 'featured-slide--side');
            if (i === currentIndex) el.classList.add('featured-slide--center');
            else el.classList.add('featured-slide--side');
        });
    }

    function go(delta) {
        currentIndex += delta;
        updateSlider();
    }

    function startAutoplay() {
        if (autoplayTimer) clearInterval(autoplayTimer);
        if (paused) return;
        autoplayTimer = setInterval(() => go(1), FEATURED_AUTOPLAY_MS);
    }

    function stopAutoplay() {
        if (autoplayTimer) clearInterval(autoplayTimer);
        autoplayTimer = null;
    }

    if (prevBtn) prevBtn.addEventListener('click', () => { go(-1); startAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { go(1); startAutoplay(); });
    if (slider) {
        slider.addEventListener('mouseenter', () => { paused = true; stopAutoplay(); });
        slider.addEventListener('mouseleave', () => { paused = false; startAutoplay(); });
    }

    window.addEventListener('resize', () => updateSlider());
    updateSlider();
    startAutoplay();
}

// ============================================
// SUPPLIERS CAROUSEL (Các nhà cung cấp uy tín)
// ============================================
const suppliersViewport = document.querySelector('.suppliers-viewport');
const suppliersTrack = document.querySelector('.suppliers-track');
const suppliersPrev = document.querySelector('.suppliers-prev');
const suppliersNext = document.querySelector('.suppliers-next');
const suppliersDotsEl = document.getElementById('suppliersDots');

if (suppliersViewport && suppliersTrack) {
    const slides = suppliersTrack.querySelectorAll('.suppliers-slide');
    const total = slides.length;
    let currentPage = 0;
    const GAP = 32;

    function getSlidesPerView() {
        const first = slides[0];
        if (!first) return 1;
        const slideWidth = first.offsetWidth;
        const viewportWidth = suppliersViewport.offsetWidth;
        return Math.max(1, Math.floor((viewportWidth + GAP) / (slideWidth + GAP)));
    }

    function getMaxPage() {
        const perView = getSlidesPerView();
        return Math.max(0, total - perView);
    }

    function updateSuppliersCarousel() {
        const first = slides[0];
        if (!first) return;
        const slideWidth = first.offsetWidth;
        const maxPage = getMaxPage();
        currentPage = Math.max(0, Math.min(currentPage, maxPage));
        const tx = -currentPage * (slideWidth + GAP);
        suppliersTrack.style.transform = `translate3d(${tx}px, 0, 0)`;

        if (suppliersDotsEl) {
            suppliersDotsEl.innerHTML = '';
            const dotCount = maxPage + 1;
            for (let i = 0; i < dotCount; i++) {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'dot' + (i === currentPage ? ' active' : '');
                dot.setAttribute('aria-label', 'Trang ' + (i + 1));
                dot.addEventListener('click', () => { currentPage = i; updateSuppliersCarousel(); });
                suppliersDotsEl.appendChild(dot);
            }
        }
    }

    if (suppliersPrev) suppliersPrev.addEventListener('click', () => { currentPage--; updateSuppliersCarousel(); });
    if (suppliersNext) suppliersNext.addEventListener('click', () => { currentPage++; updateSuppliersCarousel(); });
    window.addEventListener('resize', updateSuppliersCarousel);
    updateSuppliersCarousel();
}

// ============================================
// ORDER PAGE FUNCTIONALITY
// (Moved to assets/js/order.js to keep main.js focused on shared behavior)
// ============================================

// Note: order-specific logic has been moved to `assets/js/order.js`.
// The new file is loaded on `order.html` after `js/main.js` so it can
// safely call shared helpers defined in `main.js` (e.g., `showNotification`, `updateCartCount`).
