git init
git add .
git commit -m "Update: Thêm mới... "
git remote add origin <repository-url>
git push origin main



Website thương mại điện tử bán Pizza với phong cách nhà hàng cao cấp, lấy cảm hứng từ nhà hàng Pizza phong cách New York.

## 🚀 Tính năng

- **Giao diện sang trọng, hiện đại** với phong cách nhà hàng cao cấp
- **Responsive design** - Tối ưu cho mọi thiết bị (Desktop, Tablet, Mobile)
- **Hero slider** tự động với hình ảnh Pizza đẹp mắt
- **Menu Pizza** với grid layout hiện đại
- **Smooth scroll** và animations mượt mà
- **Header cố định** với hiệu ứng đổi màu khi scroll
- **Testimonials slider** hiển thị đánh giá khách hàng
- **Newsletter subscription** form
- **Shopping cart** với counter
- **Mobile menu** với hamburger icon

## 🛠️ Công nghệ sử dụng

- **HTML5** - Cấu trúc semantic
- **CSS3** - Flexbox & Grid Layout
- **Vanilla JavaScript** - Không sử dụng framework
- **Font Awesome** - Icons
- **Google Fonts** - Typography (Playfair Display, Poppins)
- **AOS (Animate On Scroll)** - Scroll animations

## 📁 Cấu trúc thư mục

```
DoAnCoSo2/
├── index.html          # Trang chủ
├── css/
│   └── style.css      # Stylesheet chính
├── js/
│   └── main.js        # JavaScript chính
├── images/
│   ├── logo.svg       # Logo placeholder
│   └── README.md      # Hướng dẫn thay logo
└── README.md          # File này
```

## 🎨 Màu sắc chủ đạo

- **Cam (#ff7a00)** - Màu điểm nhấn, CTA buttons
- **Đen (#111111)** - Nền chính
- **Trắng (#ffffff)** - Nội dung, text

## 🚀 Cách sử dụng

1. **Mở file trực tiếp:**
   - Mở file `index.html` bằng trình duyệt web
   - Website sẽ chạy ngay mà không cần cài đặt

2. **Hoặc sử dụng local server (khuyến nghị):**
   ```bash
   # Sử dụng Python
   python -m http.server 8000
   
   # Hoặc sử dụng Node.js (nếu có http-server)
   npx http-server
   ```
   Sau đó truy cập: `http://localhost:8000`

## 📱 Responsive Breakpoints

- **Desktop:** > 968px
- **Tablet:** 768px - 968px
- **Mobile:** < 768px

## ✨ Các section chính

1. **Header** - Navigation với logo và menu
2. **Hero Section** - Slider tự động với hình ảnh Pizza
3. **About Section** - Giới thiệu về thương hiệu
4. **Menu Section** - Grid hiển thị các món Pizza nổi bật
5. **CTA Section** - Call-to-action đặt hàng
6. **Testimonials Section** - Đánh giá khách hàng (slider)
7. **Newsletter Section** - Đăng ký nhận tin
8. **Footer** - Thông tin liên hệ, giờ mở cửa, social media

## 🎯 Tính năng JavaScript

- Header scroll effect
- Hero slider tự động
- Testimonials slider
- Mobile menu toggle
- Active nav link on scroll
- Smooth scroll
- Add to cart functionality
- Newsletter form handling
- Notification system

## 📝 Lưu ý

- Logo hiện tại là placeholder (SVG). Vui lòng thay thế bằng logo thực tế trong thư mục `images/`
- Hình ảnh Pizza sử dụng Unsplash (CDN). Có thể thay thế bằng hình ảnh thực tế
- Website này chỉ là frontend demo, không có backend integration

## 🔧 Tùy chỉnh

### Thay đổi màu sắc:
Chỉnh sửa các biến CSS trong `css/style.css`:
```css
:root {
    --primary-color: #ff7a00;
    --bg-dark: #111111;
    /* ... */
}
```

### Thay đổi nội dung:
Chỉnh sửa trực tiếp trong file `index.html`

### Thêm menu items:
Thêm các item mới vào `.menu-grid` trong `index.html`

## 📄 License

Dự án này được tạo cho mục đích học tập và demo.

---

**Tác giả:** Frontend Developer  
**Ngày tạo:** 2024
