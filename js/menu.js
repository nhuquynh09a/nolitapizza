// ============================================
// MENU PAGE JAVASCRIPT
// Firebase Realtime Database Integration
// ============================================

// Note: AOS is initialized in main.js, no need to init again here

// ============================================
// DATA IMPORT - FIREBASE
// ============================================
import { getProducts, getCategories, resolveProductImageUrl } from "./firebase.js";

// ============================================
// GLOBAL VARIABLES
// ============================================
const ITEMS_PER_PAGE = 12;
let currentPage = 1;
let allProducts = []; // Will be populated from Firebase
let allCategories = []; // Will be populated from Firebase
let filteredProducts = [];

// Initialize cartItems from localStorage (avoid conflict with main.js)
// Use window.cartItems to make it global and avoid redeclaration
if (typeof window.cartItems === 'undefined') {
    window.cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
}

// ============================================
// RENDER PRODUCTS (single page slice)
// ============================================
function renderProducts(products) {
    try {
        const productsGrid = document.getElementById('productsGrid');
        const productsEmpty = document.getElementById('productsEmpty');
        const productsCount = document.getElementById('productsCount');
        const productsPagination = document.getElementById('productsPagination');

        if (!productsGrid || !productsEmpty || !productsCount) {
            console.error('Menu elements not found');
            return;
        }

        // Clear grid
        productsGrid.innerHTML = '';

        // Show empty state if no products
        if (products.length === 0) {
            productsGrid.style.display = 'none';
            if (productsPagination) productsPagination.style.display = 'none';
            productsEmpty.style.display = 'block';
            productsCount.textContent = 'Không tìm thấy món ăn nào';
            return;
        }

        // Hide empty state, show grid
        productsGrid.style.display = 'grid';
        productsEmpty.style.display = 'none';

        // Render each product
        products.forEach((product, index) => {
            const productCard = createProductCard(product, index);
            productsGrid.appendChild(productCard);
        });

        if (typeof AOS !== 'undefined') {
            AOS.refresh();
        }
    } catch (error) {
        console.error('Error rendering products:', error);
        const productsCount = document.getElementById('productsCount');
        if (productsCount) {
            productsCount.textContent = 'Có lỗi xảy ra khi tải sản phẩm';
        }
    }
}

// ============================================
// RENDER CURRENT PAGE FROM FILTERED LIST + PAGINATION
// ============================================
function renderPageFromFiltered() {
    const total = filteredProducts.length;
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = Math.min(start + ITEMS_PER_PAGE, total);
    const pageProducts = filteredProducts.slice(start, end);

    const productsCount = document.getElementById('productsCount');
    const productsPagination = document.getElementById('productsPagination');

    if (productsCount) {
        if (total <= ITEMS_PER_PAGE) {
            productsCount.textContent = `Tìm thấy ${total} món ăn`;
        } else {
            productsCount.textContent = `Hiển thị ${start + 1}-${end} / ${total} món • Trang ${currentPage}/${totalPages}`;
        }
    }

    renderProducts(pageProducts);

    if (productsPagination) {
        if (totalPages <= 1) {
            productsPagination.style.display = 'none';
        } else {
            productsPagination.style.display = 'flex';
            renderPagination(total, totalPages);
        }
    }
}

// ============================================
// RENDER PAGINATION BUTTONS
// ============================================
function renderPagination(totalItems, totalPages) {
    const container = document.getElementById('productsPagination');
    if (!container) return;

    let html = '';

    // Prev
    html += `<button type="button" class="pagination-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''} aria-label="Trang trước"><i class="fas fa-chevron-left"></i></button>`;

    // Page numbers: show first, last, current and neighbours
    const showPages = getVisiblePages(currentPage, totalPages);
    for (const p of showPages) {
        if (p === '...') {
            html += `<span class="pagination-ellipsis">…</span>`;
        } else {
            const active = p === currentPage ? ' active' : '';
            html += `<button type="button" class="pagination-btn${active}" data-page="${p}">${p}</button>`;
        }
    }

    // Next
    html += `<button type="button" class="pagination-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''} aria-label="Trang sau"><i class="fas fa-chevron-right"></i></button>`;

    container.innerHTML = html;

    container.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
        if (btn.disabled) return;
        btn.addEventListener('click', () => {
            const page = parseInt(btn.getAttribute('data-page'), 10);
            if (page >= 1 && page <= totalPages) {
                currentPage = page;
                renderPageFromFiltered();
                window.scrollTo({ top: document.querySelector('.products-section')?.offsetTop || 0, behavior: 'smooth' });
            }
        });
    });
}

function getVisiblePages(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = [];
    if (current <= 3) {
        pages.push(1, 2, 3, 4, '...', total);
    } else if (current >= total - 2) {
        pages.push(1, '...', total - 3, total - 2, total - 1, total);
    } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
    return pages;
}

// ============================================
// CREATE PRODUCT CARD
// ============================================
function createProductCard(product, index) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-aos', 'fade-up');
    card.setAttribute('data-aos-delay', (index % 4) * 100);
    
    // Chỉ hiển thị "Hết món" khi có trường tồn kho và = 0, hoặc status unavailable/inactive. Món không có stock trong Firebase = còn bán.
    const hasStockField = 'stock_quantity' in product || 'stock_quality' in product;
    const stock = Number(product.stock_quantity ?? product.stock_quality ?? 0);
    const statusOk = product.status !== 'unavailable' && product.status !== 'inactive';
    const isAvailable = statusOk && (!hasStockField || stock > 0);
    const caloriesVal = product.calories ?? 0;
    const caloriesIcon = caloriesVal < 300 ? 'fa-bolt' : 'fa-fire';
    const caloriesText = caloriesVal < 300 ? 'Ít cal' : `${caloriesVal} cal`;
    
    // Ảnh: hỗ trợ URL đầy đủ hoặc tên file (sẽ thêm prefix images/)
    const fallbackImg = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80';
    const imageUrl = resolveProductImageUrl(product.image_url, fallbackImg);

    card.innerHTML = `
        <div class="product-image-wrapper">
            <img src="${imageUrl}" alt="${product.product_name}" class="product-image" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='${fallbackImg}'">
            ${!isAvailable ? '<span class="product-badge out-of-stock">Hết món</span>' : ''}
        </div>
        <div class="product-content">
            <h3 class="product-name">${product.product_name}</h3>
            <p class="product-description">${product.description}</p>
            <div class="product-meta">
                <div class="product-calories">
                    <i class="fas ${caloriesIcon}"></i>
                    <span>${caloriesText}</span>
                </div>
                <div class="product-price">${formatPrice(product.price)}</div>
            </div>
            <div class="product-footer">
                <button class="product-btn product-btn-primary add-to-cart-btn" 
                        ${!isAvailable ? 'disabled' : ''}
                        data-product-id="${product.product_id}"
                        data-product-name="${product.product_name}"
                        data-product-price="${product.price}">
                    <i class="fas fa-shopping-cart"></i>
                    ${isAvailable ? 'Thêm vào giỏ' : 'Hết món'}
                </button>
                <a href="product-detail.html?id=${product.product_id}" class="product-btn product-btn-secondary">
                    <i class="fas fa-eye"></i>
                    Chi tiết
                </a>
            </div>
        </div>
    `;
    
    return card;
}

/**
 * Kiểm tra URL có hợp lệ không
 */
function isValidUrl(url) {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
}

// ============================================
// FORMAT PRICE
// ============================================
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

// ============================================
// FILTER PRODUCTS
// ============================================
function filterProducts() {
    const categoryFilter = document.getElementById('filterCategory').value;
    const caloriesFilter = document.getElementById('filterCalories').value;
    const priceFilter = document.getElementById('filterPrice').value;
    
    console.log('\n========== FILTER PRODUCTS DEBUG ==========');
    console.log('Filters applied:');
    console.log('  - category_id:', categoryFilter);
    console.log('  - calories:', caloriesFilter);
    console.log('  - price:', priceFilter);
    console.log('Total products:', allProducts.length);
    
    let filtered = [...allProducts];
    
    // Filter by category
    if (categoryFilter !== 'all') {
        // NOTE: category_id in Firebase can be a string like "c1"
        // So we must NOT parseInt() here (it would become NaN)
        const categoryId = String(categoryFilter);
        console.log('\nFiltering by category_id =', categoryId);
        
        const beforeCount = filtered.length;
        filtered = filtered.filter(product => {
            const productCategoryId = product?.category_id;
            const match = String(productCategoryId) === categoryId;
            if (!match) {
                console.log(`  ✗ Product "${product.product_name}": category_id=${productCategoryId} (no match)`);
            }
            return match;
        });
        console.log(`  Result: ${beforeCount} → ${filtered.length} products`);
    }
    
    // Filter by calories
    if (caloriesFilter !== 'all') {
        console.log('\nFiltering by calories:', caloriesFilter);
        const beforeCount = filtered.length;
        
        filtered = filtered.filter(product => {
            const cal = product.calories ?? 0;
            if (caloriesFilter === 'low') return cal < 300;
            if (caloriesFilter === 'medium') return cal >= 300 && cal <= 500;
            if (caloriesFilter === 'high') return cal > 500;
            return true;
        });
        
        console.log(`  Result: ${beforeCount} → ${filtered.length} products`);
    }
    
    // Sort by price
    if (priceFilter !== 'all') {
        console.log('\nSorting by price:', priceFilter);
        
        filtered.sort((a, b) => {
            if (priceFilter === 'low') return a.price - b.price;
            if (priceFilter === 'high') return b.price - a.price;
            return 0;
        });
        
        console.log('  Result: products sorted');
    }
    
    console.log('\nFinal result:', filtered.length, 'products');
    if (filtered.length > 0) {
        console.log('First 3:', filtered.slice(0, 3).map(p => ({id: p.product_id, name: p.product_name, catId: p.category_id})));
    }
    console.log('==========================================\n');

    filteredProducts = filtered;
    currentPage = 1;
    renderPageFromFiltered();
}

// ============================================
// RESET FILTERS
// ============================================
function resetAllFilters() {
    document.getElementById('filterCategory').value = 'all';
    document.getElementById('filterCalories').value = 'all';
    document.getElementById('filterPrice').value = 'all';
    filteredProducts = [...allProducts];
    renderProducts(filteredProducts);
}

// Expose to global scope for onclick handlers
window.resetAllFilters = resetAllFilters;

// ============================================
// ADD TO CART
// ============================================
function addToCart(productId, productName, productPrice) {
    console.log('========== ADD TO CART DEBUG ==========');
    console.log('Adding product:');
    console.log('  - product_id:', productId, '(type:', typeof productId, ')');
    console.log('  - product_name:', productName);
    console.log('  - price:', productPrice);
    
    // Check if product already in cart
    const existingItem = window.cartItems.find(item => item.product_id === productId);
    
    if (existingItem) {
        console.log('Product already in cart, incrementing quantity...');
        existingItem.quantity += 1;
        console.log('New quantity:', existingItem.quantity);
    } else {
        // Find product to get image and calories
        const product = allProducts.find(p => p.product_id === productId) || {};
        console.log('Found product in allProducts:', product);
        
        const newItem = {
            product_id: productId,
            product_name: productName,
            name: productName,
            price: productPrice,
            quantity: 1,
            calories: product.calories || 0,
            image: product.image_url || ''
        };
        
        console.log('New cart item:', newItem);
        window.cartItems.push(newItem);
    }
    
    // Save to localStorage
    localStorage.setItem('cartItems', JSON.stringify(window.cartItems));
    console.log('Cart items saved to localStorage');
    console.log('Current cart items count:', window.cartItems.length);
    console.log('======================================');
    
    // Update cart count
    updateCartCount();
    
    // Show notification
    showNotification(`${productName} đã được thêm vào giỏ hàng!`);
}

// ============================================
// UPDATE CART COUNT
// ============================================
function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount && window.cartItems) {
        const totalItems = window.cartItems.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        
        // Animation
        cartCount.style.animation = 'pulse 0.5s ease';
        setTimeout(() => {
            cartCount.style.animation = '';
        }, 500);
    }
}

// ============================================
// SHOW NOTIFICATION
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

// ============================================
// RENDER CATEGORIES TO DROPDOWN
// ============================================
function renderCategories(categories) {
    const filterCategory = document.getElementById('filterCategory');
    if (!filterCategory) {
        console.error('filterCategory element not found');
        return;
    }
    
    console.log('========== RENDER CATEGORIES DEBUG ==========');
    console.log('Raw categories from Firebase:', categories);
    console.log('Categories type:', Array.isArray(categories) ? 'Array' : 'Object');
    
    // Keep "Tất cả" option
    const allOption = '<option value="all">Tất cả</option>';
    
    // Handle different category structures from Firebase
    let categoryOptions = '';
    
    if (Array.isArray(categories)) {
        console.log('Categories is an array');
        // Case 1: Array of objects like [{category_id: 1, name: "Pizza Bò"}, ...]
        categoryOptions = categories
            .filter(cat => {
                const hasId = cat.category_id || cat.id;
                const hasName = cat.name;
                console.log(`Category check - ID: ${hasId}, Name: ${hasName}, Valid: ${!!(hasId && hasName)}`);
                return hasId && hasName;
            })
            .map(cat => {
                const catId = cat.category_id || cat.id;
                const catName = cat.name;
                console.log(`Creating option: value="${catId}", text="${catName}"`);
                return `<option value="${catId}">${catName}</option>`;
            })
            .join('');
    } else if (typeof categories === 'object' && categories !== null) {
        console.log('Categories is an object - converting to array');
        // Case 2: Object like {1: "Pizza Bò", 2: "Pizza Hải Sản", ...}
        // Or {category_id: 1, name: "Pizza Bò", ...} (single object - wrong)
        
        // Check if it's a collection of categories or single category
        if (categories.category_id && categories.name) {
            // Single category object (wrong structure) - skip
            console.warn('Categories structure is wrong (single object instead of collection)');
        } else {
            // It's a collection
            Object.entries(categories).forEach(([key, value]) => {
                console.log(`Found category entry - key: ${key}, value:`, value);
                
                if (typeof value === 'object' && value.category_id && value.name) {
                    // {cat_1: {category_id: 1, name: "Pizza Bò"}}
                    const catId = value.category_id;
                    const catName = value.name;
                    console.log(`Creating option from object: value="${catId}", text="${catName}"`);
                    categoryOptions += `<option value="${catId}">${catName}</option>`;
                } else if (typeof value === 'string') {
                    // {1: "Pizza Bò"} - simple id:name mapping
                    const catId = key;
                    const catName = value;
                    console.log(`Creating option from simple mapping: value="${catId}", text="${catName}"`);
                    categoryOptions += `<option value="${catId}">${catName}</option>`;
                }
            });
        }
    }
    
    // Combine and set
    filterCategory.innerHTML = allOption + categoryOptions;
    console.log('===========================================');

    console.log('Categories rendered successfully to dropdown');
}
// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', async function () {
  try {
    // Check if we're on the menu page
    if (!document.getElementById('productsGrid')) {
      return;
    }

    console.log('\n========== MENU PAGE LOADING START ==========');
    console.log('Page URL:', window.location.href);
    console.log('Timestamp:', new Date().toISOString());
    
    // Clear old cache data to ensure fresh load from Firebase
    console.log('Clearing old cache...');
    localStorage.removeItem('products_cache');
    localStorage.removeItem('categories_cache');
    
    // Fetch products from Firebase
    console.log('Fetching products from Firebase...');
    allProducts = await getProducts();
    console.log('✓ Products loaded:', allProducts.length, 'items');
    console.log('First product structure:', allProducts[0]);
    
    // Fetch categories from Firebase
    console.log('Fetching categories from Firebase...');
    allCategories = await getCategories();
    console.log('✓ Categories loaded:', allCategories);
    console.log('First category structure:', typeof allCategories === 'object' ? 
        (Array.isArray(allCategories) ? allCategories[0] : Object.keys(allCategories).slice(0, 1)) : null);
    
    filteredProducts = [...allProducts];
    currentPage = 1;

    // Initial render with pagination
    if (allProducts.length > 0) {
      console.log('Rendering products to grid...');
      renderPageFromFiltered();
      console.log('✓ Products rendered successfully');
    } else {
      console.warn('⚠️ No products loaded from Firebase');

      const productsCount = document.getElementById('productsCount');
      if (productsCount) {
        productsCount.textContent = 'Không có sản phẩm';
      }
    }
    
    // Render categories to dropdown
    if (allCategories && (Array.isArray(allCategories) ? allCategories.length > 0 : Object.keys(allCategories).length > 0)) {
      console.log('Rendering categories to dropdown...');
      renderCategories(allCategories);
      console.log('✓ Categories rendered successfully');
    } else {
      console.warn('⚠️ No categories loaded from Firebase');
    }

    // Update cart count
    updateCartCount();
    
    // Filter event listeners
    const filterCategory = document.getElementById('filterCategory');
    const filterCalories = document.getElementById('filterCalories');
    const filterPrice = document.getElementById('filterPrice');
    const resetFilters = document.getElementById('resetFilters');
    
    if (filterCategory) {
        filterCategory.addEventListener('change', function(e) {
            console.log('Category filter changed to:', e.target.value);
            filterProducts();
        });
    }
    if (filterCalories) {
        filterCalories.addEventListener('change', filterProducts);
    }
    if (filterPrice) {
        filterPrice.addEventListener('change', filterProducts);
    }
    if (resetFilters) {
        resetFilters.addEventListener('click', resetAllFilters);
    }
    
    // Add to cart event listeners (delegation)
    document.addEventListener('click', function(e) {
        if (e.target.closest('.add-to-cart-btn') && !e.target.closest('.add-to-cart-btn').disabled) {
            const btn = e.target.closest('.add-to-cart-btn');
            // product_id can be string (e.g. "p1"), so keep as string
            const productId = btn.getAttribute('data-product-id');
            const productName = btn.getAttribute('data-product-name');
            const productPrice = Number(btn.getAttribute('data-product-price'));
            
            console.log('Add to cart clicked - Product:', {id: productId, name: productName, price: productPrice});
            addToCart(productId, productName, productPrice);
        }
    });
    
    console.log('========== MENU PAGE LOADING COMPLETE ==========\n');
  } catch (error) {
    console.error('❌ Error initializing menu page:', error);
    console.error('Error stack:', error.stack);
    const productsCount = document.getElementById('productsCount');
    if (productsCount) {
        productsCount.textContent = 'Lỗi khi tải sản phẩm - ' + error.message;
    }
  }
});

// ============================================
// ADD NOTIFICATION STYLES (if not exists)
// ============================================
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
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
}
