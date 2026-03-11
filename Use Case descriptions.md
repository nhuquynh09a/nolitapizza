# Nolita Pizza – Use Case Descriptions

Định dạng: **Actor** | **Mô tả** | **Precondition** | **Main Flow** | **Postcondition** | **Exception**

Các actor: **Khách vãng lai**, **Người dùng** (đã đăng nhập với role user), **Quản trị viên**, **Bếp**, **Giao hàng**.

---

## UC001: Đăng nhập

**Actor:** Khách vãng lai, Người dùng, Quản trị viên, Bếp, Giao hàng

**Mô tả:** Người dùng đăng nhập vào hệ thống bằng email/mật khẩu hoặc Google để truy cập chức năng theo vai trò (khách hàng, admin, bếp, giao hàng).

**Precondition:** Người dùng chưa đăng nhập hoặc phiên hết hạn; có tài khoản Firebase Auth (email/password hoặc Google).

**Main Flow:**
1. Người dùng truy cập trang đăng nhập (auth.html).
2. Chọn cách đăng nhập: **Email/Mật khẩu** hoặc **Đăng nhập bằng Google**.
3. Nếu chọn Email: nhập email và mật khẩu, bấm **Đăng nhập**.
4. Nếu chọn Google: bấm nút Google, xác thực qua popup/redirect của Google.
5. Hệ thống xác thực thông tin qua Firebase Auth.
6. Hệ thống lấy profile (role) từ Realtime Database (users/{uid}).
7. Hệ thống chuyển hướng theo role: Người dùng → user-account.html; Quản trị viên → admin-account.html; Bếp → kitchen-account.html; Giao hàng → shipper-account.html.

**Postcondition:** Người dùng đã đăng nhập thành công và được chuyển đến trang tương ứng với vai trò; header hiển thị icon tài khoản thay cho "Đăng ký/Đăng nhập".

**Exception:** Thông tin đăng nhập không chính xác (sai email/mật khẩu) → hệ thống hiển thị thông báo lỗi; đóng popup Google → không chuyển trang; tài khoản bị vô hiệu hóa → thông báo lỗi tương ứng.

---

## UC002: Đăng ký tài khoản

**Actor:** Khách vãng lai

**Mô tả:** Khách vãng lai tạo tài khoản mới bằng email và mật khẩu để trở thành Người dùng, có thể đặt món, xem đơn hàng và đánh giá.

**Precondition:** Người dùng chưa đăng nhập; truy cập auth.html ở chế độ đăng ký.

**Main Flow:**
1. Người dùng truy cập trang đăng nhập và chuyển sang form **Đăng ký**.
2. Nhập email, mật khẩu (và xác nhận mật khẩu nếu có).
3. Bấm **Đăng ký**.
4. Hệ thống tạo tài khoản trong Firebase Auth.
5. Hệ thống tạo bản ghi profile trong Realtime Database (users/{uid}) với role = "user", status = "active".
6. Hệ thống thông báo đăng ký thành công và có thể tự động đăng nhập, chuyển đến user-account.html hoặc index.html.

**Postcondition:** Tài khoản mới được tạo; người dùng có thể đăng nhập và sử dụng chức năng dành cho Người dùng.

**Exception:** Email đã tồn tại → hệ thống báo lỗi; mật khẩu quá yếu → Firebase trả lỗi, hiển thị thông báo; lỗi mạng → thông báo thử lại.

---

## UC003: Xem trang chủ

**Actor:** Khách vãng lai, Người dùng

**Mô tả:** Người dùng xem trang chủ với thông tin thương hiệu, slider, món nổi bật, ưu đãi, nhà cung cấp và footer.

**Precondition:** Truy cập index.html (có thể chưa hoặc đã đăng nhập).

**Main Flow:**
1. Người dùng truy cập trang chủ (index.html).
2. Hệ thống hiển thị Header (logo, menu, giỏ hàng, icon tài khoản nếu đã đăng nhập), Hero slider, section Giới thiệu, Thực đơn Pizza nổi bật (từ Firebase), banner khuyến mãi, section Nhà cung cấp uy tín, Footer.
3. Số lượng giỏ hàng trên header được cập nhật từ localStorage (nếu có).
4. Người dùng có thể cuộn trang, xem animation (AOS), chuyển slide hero; nhấn vào Món ăn, Đặt Món, Liên hệ, Về Chúng Tôi, Đánh giá.

**Postcondition:** Người dùng nắm được thông tin thương hiệu và có thể điều hướng sang menu, đặt món, liên hệ.

**Exception:** Không tải được món nổi bật từ Firebase → hiển thị thông báo hoặc trạng thái trống; localStorage bị chặn (Tracking Prevention) → số giỏ hàng hiển thị 0.

---

## UC004: Xem danh mục món ăn

**Actor:** Khách vãng lai, Người dùng

**Mô tả:** Người dùng xem danh sách đầy đủ các món pizza/món ăn, lọc theo danh mục và mở chi tiết từng món.

**Precondition:** Truy cập menu.html; Firebase cho phép đọc products và categories.

**Main Flow:**
1. Người dùng truy cập trang Món ăn (menu.html).
2. Hệ thống tải danh mục và sản phẩm từ Firebase, hiển thị lưới món với ảnh, tên, giá, mô tả, calories, nút "Thêm vào giỏ"; món hết hàng có nhãn "Hết món".
3. Người dùng có thể chọn danh mục từ dropdown để lọc.
4. Người dùng nhấn vào món hoặc link chi tiết để mở trang chi tiết món (product-detail.html?id=...).

**Postcondition:** Người dùng xem được danh sách món và có thể thêm vào giỏ hoặc xem chi tiết.

**Exception:** Lỗi tải Firebase → hiển thị thông báo lỗi hoặc dữ liệu trống.

---

## UC005: Xem chi tiết món ăn

**Actor:** Khách vãng lai, Người dùng

**Mô tả:** Người dùng xem thông tin chi tiết một món (ảnh, mô tả, size, topping, giá) và có thể thêm vào giỏ.

**Precondition:** Truy cập product-detail.html với tham số id món hợp lệ.

**Main Flow:**
1. Người dùng mở trang chi tiết món (từ menu hoặc link).
2. Hệ thống tải thông tin món và product_details (size, topping) từ Firebase, hiển thị ảnh, tên, mô tả, các lựa chọn size/topping và giá tương ứng.
3. Người dùng chọn size, topping (nếu có), số lượng.
4. Người dùng bấm **Thêm vào giỏ** → hệ thống ghi vào localStorage (cartItems), cập nhật số lượng giỏ trên header, hiển thị thông báo.

**Postcondition:** Người dùng đã xem chi tiết món và có thể đã thêm món vào giỏ.

**Exception:** Món không tồn tại hoặc id sai → hiển thị thông báo hoặc trang lỗi; localStorage bị chặn → thông báo không thêm được giỏ.

---

## UC006: Thêm món vào giỏ hàng

**Actor:** Khách vãng lai, Người dùng

**Mô tả:** Người dùng thêm một hoặc nhiều món (từ trang Món ăn hoặc Chi tiết món) vào giỏ hàng; giỏ lưu trong localStorage và hiển thị số lượng trên header.

**Precondition:** Trang menu.html hoặc product-detail.html đã tải; món còn hàng (available); trình duyệt cho phép localStorage.

**Main Flow:**
1. Người dùng chọn món, size/topping (nếu có) và bấm **Thêm vào giỏ** (trên menu hoặc trang chi tiết).
2. Hệ thống đọc/cập nhật cartItems trong localStorage: thêm mới hoặc tăng số lượng nếu món (cùng id/size/topping) đã có.
3. Hệ thống cập nhật số lượng trên icon giỏ hàng ở header (tổng số lượng tất cả món trong giỏ).
4. Hệ thống hiển thị thông báo (notification) "Đã thêm vào giỏ" hoặc tương tự.

**Postcondition:** Giỏ hàng chứa món vừa thêm; số lượng giỏ hiển thị đúng trên mọi trang có header.

**Exception:** localStorage đầy hoặc bị chặn → không lưu được, có thể báo lỗi; món hết hàng → nút bị vô hiệu hóa.

---

## UC007: Xem giỏ hàng và đặt món

**Actor:** Khách vãng lai, Người dùng

**Mô tả:** Người dùng xem danh sách món trong giỏ, chỉnh sửa số lượng hoặc xóa món, nhập thông tin giao hàng và phương thức thanh toán (COD/VietQR), sau đó xác nhận đặt hàng.

**Precondition:** Giỏ hàng (localStorage cartItems) có ít nhất một món; người dùng truy cập order.html.

**Main Flow:**
1. Người dùng truy cập trang Đặt Món (order.html).
2. Hệ thống đọc giỏ từ localStorage, hiển thị danh sách món (ảnh, tên, size, topping, số lượng, đơn giá), tổng số món, tổng calories, tổng tiền.
3. Người dùng có thể tăng/giảm số lượng từng món hoặc xóa món (có xác nhận modal).
4. Người dùng nhập Họ tên, Số điện thoại, Email, Địa chỉ giao hàng, Ghi chú (tùy chọn). Nếu đã đăng nhập, hệ thống có thể điền sẵn từ profile.
5. Người dùng chọn phương thức thanh toán: **Thanh toán khi nhận hàng (COD)** hoặc **Thanh toán online (VietQR)**.
6. Người dùng bấm **Đặt hàng**.
7. Hệ thống kiểm tra thông tin bắt buộc (tên, SĐT, địa chỉ).
8. Hệ thống tạo đơn trong Firebase (orders) với trạng thái pending, lưu thông tin khách, danh sách món, tổng tiền, payment_method.
9. Nếu chọn COD: hệ thống xóa giỏ (localStorage), hiển thị thông báo đặt hàng thành công; có thể chuyển về trang chủ hoặc tài khoản.
10. Nếu chọn VietQR: hệ thống chuyển đến payment.html?order_id=... (UC008).

**Postcondition:** Đơn hàng được tạo trong Firebase; với COD thì quy trình đặt món kết thúc; với VietQR thì chuyển sang bước thanh toán.

**Exception:** Giỏ trống khi submit → thông báo "Giỏ hàng trống"; thiếu thông tin bắt buộc → thông báo lỗi validation; lỗi Firebase → thông báo không tạo được đơn.

---

## UC008: Thanh toán online VietQR

**Actor:** Khách vãng lai, Người dùng

**Mô tả:** Người dùng sau khi đặt món chọn thanh toán VietQR được chuyển đến trang hiển thị mã QR và thông tin chuyển khoản; có thể xác nhận đã chuyển hoặc hủy giao dịch.

**Precondition:** Đơn hàng đã được tạo với phương thức VietQR; người dùng được chuyển đến payment.html?order_id=...

**Main Flow:**
1. Người dùng truy cập trang thanh toán (payment.html) với order_id trên URL.
2. Hệ thống tải đơn từ Firebase theo order_id; hiển thị số tiền, mã đơn, mã QR VietQR, thông tin ngân hàng (số tài khoản, chủ tài khoản, nội dung chuyển khoản).
3. Người dùng mở app ngân hàng, quét mã QR và thực hiện chuyển khoản đúng số tiền và nội dung.
4. Người dùng bấm **Tôi đã thanh toán**.
5. Hệ thống cập nhật đơn: payment_status = "pending_confirm"; hiển thị màn hình "Đã ghi nhận", hướng dẫn theo dõi đơn tại trang Tài khoản.

**Postcondition:** Đơn được đánh dấu chờ xác nhận chuyển khoản; admin có thể xác nhận VietQR trên trang quản lý đơn.

**Exception (Luồng phụ – Hủy giao dịch):** Người dùng bấm **Hủy giao dịch** → hệ thống xóa đơn trong Firebase (deleteOrder), không ghi nhận đơn và không tính là đơn hủy; chuyển về order.html.  
**Exception:** Thiếu order_id hoặc không tìm thấy đơn → hiển thị lỗi và link quay lại đặt món; lỗi cập nhật Firebase → thông báo thử lại.

---

## UC009: Xem và cập nhật thông tin cá nhân

**Actor:** Người dùng

**Mô tả:** Người dùng đã đăng nhập xem và chỉnh sửa hồ sơ cá nhân (họ tên, email, số điện thoại, địa chỉ) trên trang Tài khoản.

**Precondition:** Người dùng đã đăng nhập với role "user"; truy cập user-account.html; Firebase Auth và Realtime Database (users) sẵn sàng.

**Main Flow:**
1. Người dùng truy cập trang Tài khoản (user-account.html), chọn tab **Thông tin cá nhân**.
2. Hệ thống tải profile từ Firebase (users/{uid}) và hiển thị Họ tên, Email, Số điện thoại, Địa chỉ, Ngày tạo tài khoản.
3. Người dùng bấm **Chỉnh sửa**, sửa các trường và bấm **Lưu**.
4. Hệ thống kiểm tra dữ liệu hợp lệ, cập nhật profile vào Realtime Database (saveUserProfile).

**Postcondition:** Thông tin cá nhân được cập nhật; thông tin này được dùng để tự điền vào form đặt món khi đặt hàng.

**Exception:** Chưa đăng nhập → chuyển hướng về auth.html; lỗi Firebase → thông báo không lưu được.

---

## UC010: Xem lịch sử đơn hàng và hủy đơn

**Actor:** Người dùng

**Mô tả:** Người dùng xem danh sách đơn hàng của mình, xem chi tiết từng đơn và có thể hủy đơn khi đơn ở trạng thái cho phép (ví dụ Chờ xác nhận).

**Precondition:** Người dùng đã đăng nhập; truy cập user-account.html, tab **Đơn hàng của tôi**.

**Main Flow:**
1. Người dùng mở tab Đơn hàng của tôi.
2. Hệ thống tải danh sách đơn từ Firebase theo user_id/email (getOrdersByUserId), hiển thị bảng: Mã đơn, Ngày giờ, Tổng tiền, Trạng thái, nút **Xem**, nút **Hủy** (nếu đơn được phép hủy).
3. Người dùng bấm **Xem** → hệ thống hiển thị chi tiết đơn (danh sách món, địa chỉ giao hàng, phương thức thanh toán, trạng thái).
4. Với đơn có nút Hủy: người dùng bấm **Hủy**, nhập lý do hủy trong modal, xác nhận → hệ thống cập nhật đơn: status = "cancelled", cancel_reason, cancelled_at (updateOrder).

**Postcondition:** Người dùng nắm được trạng thái đơn; đơn đã hủy hiển thị trạng thái "Đã hủy" và lý do (admin cũng thấy).

**Exception:** Đơn không thuộc user → không hiển thị hoặc báo lỗi; đơn đã confirmed/ready/delivering/completed → không cho hủy; lỗi Firebase → thông báo thử lại.

---

## UC011: Viết đánh giá món

**Actor:** Người dùng

**Mô tả:** Người dùng đã đăng nhập gửi đánh giá (số sao, nội dung) cho món ăn đã mua; đánh giá được lưu và hiển thị (trang đánh giá, admin quản lý).

**Precondition:** Người dùng đã đăng nhập; truy cập user-account.html, tab **Đánh giá của tôi**; có đơn hàng đã hoàn thành (hoặc hệ thống cho phép chọn món đã mua).

**Main Flow:**
1. Người dùng mở tab Đánh giá của tôi.
2. Hệ thống hiển thị form hoặc danh sách món/đơn có thể đánh giá; người dùng chọn món, nhập nội dung đánh giá và số sao.
3. Người dùng bấm gửi đánh giá.
4. Hệ thống lưu đánh giá vào Firebase (reviews) với user_id, product_id, rating, content, created_at (saveReview).

**Postcondition:** Đánh giá được lưu; admin có thể xem và xóa trong trang Quản lý đánh giá; có thể hiển thị trên trang reviews.html.

**Exception:** Chưa đăng nhập → chuyển auth; nội dung trống hoặc không hợp lệ → thông báo; lỗi Firebase → thông báo thử lại.

---

## UC012: Gửi liên hệ / góp ý

**Actor:** Khách vãng lai, Người dùng

**Mô tả:** Người dùng gửi tin nhắn liên hệ (họ tên, email, điện thoại, tiêu đề, nội dung) cho nhà hàng qua form trên trang Liên hệ.

**Precondition:** Truy cập contact.html; Firebase cho phép ghi vào node contacts.

**Main Flow:**
1. Người dùng truy cập trang Liên hệ (contact.html).
2. Người dùng điền form: Họ tên, Email, Điện thoại, Tiêu đề, Nội dung.
3. Người dùng bấm **Gửi** (hoặc tương tự).
4. Hệ thống kiểm tra validation (email, số điện thoại, nội dung bắt buộc).
5. Hệ thống lưu liên hệ vào Firebase (contacts) với trạng thái pending/chưa đọc.
6. Hệ thống hiển thị thông báo gửi thành công.

**Postcondition:** Tin nhắn liên hệ được lưu; Quản trị viên xem và xử lý trong trang Quản lý liên hệ.

**Exception:** Dữ liệu không hợp lệ → thông báo lỗi; lỗi Firebase → thông báo không gửi được.

---

## UC013: Đăng xuất

**Actor:** Người dùng, Quản trị viên, Bếp, Giao hàng

**Mô tả:** Người dùng đang đăng nhập thực hiện đăng xuất để kết thúc phiên làm việc.

**Precondition:** Người dùng đã đăng nhập (bất kỳ role); đang ở trang user-account, admin-account, kitchen-account hoặc shipper-account.

**Main Flow:**
1. Người dùng bấm nút **Đăng xuất** (trong sidebar hoặc menu tài khoản).
2. Hệ thống hiển thị xác nhận đăng xuất (modal) nếu có.
3. Người dùng xác nhận.
4. Hệ thống gọi Firebase Auth signOut (logout).
5. Hệ thống chuyển hướng về auth.html hoặc index.html.

**Postcondition:** Phiên đăng nhập kết thúc; header hiển thị "Đăng ký/Đăng nhập" thay cho icon tài khoản; truy cập lại trang admin/kitchen/shipper sẽ chuyển về đăng nhập hoặc trang chủ.

**Exception:** Lỗi logout (mạng) → vẫn có thể chuyển trang local; người dùng hủy xác nhận → không đăng xuất.

---

## UC014: Quản trị viên – Xem dashboard và thống kê

**Actor:** Quản trị viên

**Mô tả:** Quản trị viên xem tổng quan doanh thu, người dùng mới, món ăn mới và biểu đồ theo khoảng thời gian (hôm nay, 7 ngày, 30 ngày).

**Precondition:** Quản trị viên đã đăng nhập với role "admin"; truy cập admin-account.html, section Dashboard.

**Main Flow:**
1. Quản trị viên mở trang Admin, mặc định hiển thị Dashboard.
2. Hệ thống tải dữ liệu từ Firebase (orders, users, products), lọc theo khoảng thời gian (dashboardPeriod: today / 7 / 30 ngày).
3. Hệ thống hiển thị: Doanh thu (đơn completed + VietQR đã xác nhận), Số người dùng mới, Số món ăn mới; có thể có biểu đồ doanh thu (line/bar chart).
4. Quản trị viên có thể đổi dropdown "Hôm nay / 7 ngày qua / 30 ngày qua" để cập nhật số liệu.

**Postcondition:** Quản trị viên nắm được tình hình doanh thu và hoạt động hệ thống.

**Exception:** Không đủ quyền → chuyển về index.html; lỗi tải dữ liệu → hiển thị "—" hoặc thông báo.

---

## UC015: Quản trị viên – Quản lý món ăn

**Actor:** Quản trị viên

**Mô tả:** Quản trị viên xem danh sách món ăn có phân trang (12 món/trang), thêm món mới, sửa hoặc xóa món; ảnh món upload lên Cloudinary.

**Precondition:** Quản trị viên đã đăng nhập; truy cập admin-account.html, tab **Món ăn**.

**Main Flow:**
1. Quản trị viên mở tab Món ăn.
2. Hệ thống tải danh sách products từ Firebase, hiển thị bảng: Tên món, Giá, Size, Calories (size), Topping, Calories (topping), Danh mục; nút **Sửa**, **Xóa**; phân trang 12 món/trang với nút Trước/Sau.
3. **Thêm món:** Quản trị viên bấm **Thêm món ăn** → mở modal nhập Tên món, Ảnh (file), Giá/Calories theo size (S/M/L), Topping (tên, giá, cal), Mô tả, Danh mục → Lưu → hệ thống upload ảnh Cloudinary, tạo product + product_details trong Firebase.
4. **Sửa món:** Quản trị viên bấm **Sửa** trên một dòng → mở modal với dữ liệu hiện tại, chỉnh sửa và Lưu → hệ thống cập nhật Firebase (updateProduct, setProductDetails).
5. **Xóa món:** Quản trị viên bấm **Xóa** → xác nhận → hệ thống xóa product và product_details (deleteProduct, xóa details).

**Postcondition:** Danh sách món trên website (menu, đặt món) phản ánh đúng dữ liệu sau thêm/sửa/xóa.

**Exception:** Upload ảnh Cloudinary lỗi (preset sai, mạng) → báo lỗi hoặc giữ ảnh cũ; thiếu tên món → báo "Vui lòng nhập tên món"; lỗi Firebase → thông báo không lưu/xóa được.

---

## UC016: Quản trị viên – Quản lý danh mục

**Actor:** Quản trị viên

**Mô tả:** Quản trị viên xem danh sách danh mục món ăn, thêm danh mục mới, sửa tên hoặc xóa danh mục.

**Precondition:** Quản trị viên đã đăng nhập; truy cập admin-account.html, tab **Danh mục**.

**Main Flow:**
1. Quản trị viên mở tab Danh mục.
2. Hệ thống tải danh sách categories từ Firebase, hiển thị bảng với tên danh mục và nút Sửa/Xóa.
3. **Thêm:** Bấm **Thêm danh mục** → nhập tên → Lưu → addCategory.
4. **Sửa:** Bấm Sửa → sửa tên → Lưu → updateCategory.
5. **Xóa:** Bấm Xóa → xác nhận → deleteCategory.

**Postcondition:** Danh mục được cập nhật; dropdown danh mục trên trang Món ăn và form món dùng đúng danh mục.

**Exception:** Tên trống → báo "Vui lòng nhập tên danh mục"; lỗi Firebase → thông báo.

---

## UC017: Quản trị viên – Quản lý đơn hàng

**Actor:** Quản trị viên

**Mô tả:** Quản trị viên xem danh sách đơn hàng có phân trang (12 đơn/trang) và lọc trạng thái; duyệt đơn, gửi bếp, gửi ship, xác nhận đã giao, hủy đơn, xác nhận đã chuyển khoản VietQR.

**Precondition:** Quản trị viên đã đăng nhập; truy cập admin-account.html, tab **Đơn hàng**.

**Main Flow:**
1. Quản trị viên mở tab Đơn hàng.
2. Hệ thống đăng ký subscribeOrders (realtime), hiển thị bảng: Mã đơn, Khách hàng, Tổng tiền, Trạng thái, Ngày giờ, Lý do hủy; nút Chi tiết, Duyệt, Gửi bếp, Gửi ship, Đã giao hàng, Hủy (tùy trạng thái); phân trang 12 đơn/trang; bộ lọc trạng thái (Tất cả, Chờ xác nhận, Đã xác nhận, ...).
3. **Xem chi tiết:** Bấm **Chi tiết** → modal hiển thị thông tin khách, địa chỉ, danh sách món, phương thức thanh toán, trạng thái; nếu đơn VietQR chờ xác nhận thì có nút **Xác nhận đã chuyển khoản** → updateOrder payment_status = "confirmed".
4. **Duyệt đơn:** Đơn pending → bấm **Duyệt** → xác nhận → status = "confirmed".
5. **Gửi bếp:** Đơn confirmed → bấm **Gửi bếp** → status = "ready", kitchen_status có thể được set.
6. **Gửi ship:** Đơn ready và kitchen_status = "done" → bấm **Gửi ship** → status = "delivering".
7. **Đã giao hàng:** Đơn delivering → bấm **Đã giao hàng** → status = "completed", completed_at; đơn tính vào doanh thu.
8. **Hủy đơn:** Bấm **Hủy** → nhập lý do hủy (gửi đến khách) → xác nhận → status = "cancelled", cancel_reason, cancelled_at.

**Postcondition:** Trạng thái đơn được cập nhật theo quy trình; khách hàng và Bếp/Giao hàng thấy cập nhật realtime; doanh thu dashboard dùng đơn completed.

**Exception:** Đơn không tồn tại hoặc đã bị xóa → báo lỗi; lỗi updateOrder → thông báo thử lại.

---

## UC018: Quản trị viên – Quản lý người dùng

**Actor:** Quản trị viên

**Mô tả:** Quản trị viên xem danh sách người dùng (users) trong hệ thống, sửa thông tin (email, họ tên) hoặc xóa tài khoản.

**Precondition:** Quản trị viên đã đăng nhập; truy cập admin-account.html, tab **Người dùng**.

**Main Flow:**
1. Quản trị viên mở tab Người dùng.
2. Hệ thống tải danh sách users từ Firebase (getUsersList), hiển thị bảng: UID, Email, Họ tên, Vai trò (role), Ngày tạo; nút Sửa, Xóa.
3. **Sửa:** Bấm Sửa → modal nhập Email, Họ tên → Lưu → saveUserProfile (cập nhật users/{uid}).
4. **Xóa:** Bấm Xóa → xác nhận → deleteUserProfile (xóa bản ghi users/{uid}); có thể không xóa Firebase Auth tùy triển khai.

**Postcondition:** Thông tin người dùng được cập nhật hoặc tài khoản bị gỡ khỏi danh sách quản lý.

**Exception:** Thiếu email/họ tên → báo lỗi; lỗi Firebase → thông báo.

---

## UC019: Quản trị viên – Quản lý liên hệ

**Actor:** Quản trị viên

**Mô tả:** Quản trị viên xem danh sách tin nhắn liên hệ từ khách, cập nhật trạng thái (đã đọc/xử lý) hoặc xóa.

**Precondition:** Quản trị viên đã đăng nhập; truy cập admin-account.html, tab **Liên hệ**.

**Main Flow:**
1. Quản trị viên mở tab Liên hệ.
2. Hệ thống tải danh sách contacts từ Firebase, hiển thị bảng: Họ tên, Email, Điện thoại, Tiêu đề, Nội dung, Ngày, Trạng thái; nút Sửa trạng thái, Xóa.
3. Quản trị viên có thể cập nhật trạng thái (updateContact) hoặc xóa (deleteContact).

**Postcondition:** Tin nhắn liên hệ được đánh dấu đã xử lý hoặc xóa khỏi danh sách.

**Exception:** Lỗi Firebase → thông báo.

---

## UC020: Quản trị viên – Quản lý đánh giá

**Actor:** Quản trị viên

**Mô tả:** Quản trị viên xem danh sách đánh giá của khách hàng về món ăn và có thể xóa đánh giá không phù hợp.

**Precondition:** Quản trị viên đã đăng nhập; truy cập admin-account.html, tab **Đánh giá**.

**Main Flow:**
1. Quản trị viên mở tab Đánh giá.
2. Hệ thống tải danh sách reviews từ Firebase, hiển thị bảng với thông tin người đánh giá, món, số sao, nội dung, ngày; nút Xóa.
3. Quản trị viên bấm **Xóa** trên một đánh giá → xác nhận → deleteReview.

**Postcondition:** Đánh giá bị xóa không còn hiển thị trên trang đánh giá công khai (nếu có).

**Exception:** Lỗi Firebase → thông báo.

---

## UC021: Bếp – Xem đơn cần chế biến và cập nhật trạng thái

**Actor:** Bếp

**Mô tả:** Nhân viên bếp đăng nhập vào trang kitchen-account.html, xem danh sách đơn đã được admin duyệt và gửi xuống bếp, cập nhật trạng thái chế biến (đang chế biến / đã xong).

**Precondition:** Người dùng đã đăng nhập với role "kitchen"; truy cập kitchen-account.html.

**Main Flow:**
1. Nhân viên bếp truy cập trang Bếp (kitchen-account.html).
2. Hệ thống đăng ký subscribeOrders, lọc đơn có status = "ready" (đã gửi bếp), hiển thị danh sách đơn với thông tin: mã đơn, khách hàng, địa chỉ, danh sách món, ghi chú.
3. Nhân viên bếp chọn đơn và cập nhật **Đang chế biến** → updateOrder kitchen_status = "cooking".
4. Sau khi chế biến xong, nhân viên bếp cập nhật **Đã xong** → updateOrder kitchen_status = "done".
5. Hệ thống có thể gửi thông báo cho admin (pushNotification) khi đơn đã chế biến xong.

**Postcondition:** Trạng thái kitchen_status của đơn được cập nhật; admin và shipper thấy đơn sẵn sàng giao khi kitchen_status = "done".

**Exception:** Chưa đăng nhập hoặc role khác → chuyển về index/auth; lỗi Firebase → thông báo.

---

## UC022: Giao hàng – Xem đơn cần giao và cập nhật trạng thái

**Actor:** Giao hàng

**Mô tả:** Nhân viên giao hàng đăng nhập vào trang shipper-account.html, xem danh sách đơn đã sẵn sàng giao (ready + kitchen done), nhận giao và cập nhật trạng thái đang giao / đã giao.

**Precondition:** Người dùng đã đăng nhập với role "shipper"; truy cập shipper-account.html.

**Main Flow:**
1. Nhân viên giao hàng truy cập trang Giao hàng (shipper-account.html).
2. Hệ thống đăng ký subscribeOrders, lọc đơn có status = "ready" và kitchen_status = "done" (hoặc đơn delivering đã được shipper nhận), hiển thị danh sách đơn với thông tin khách, địa chỉ, món, tổng tiền.
3. Nhân viên giao hàng **Nhận đơn** → updateOrder status = "delivering", shipping_status = "accepted" (hoặc tương tự).
4. Sau khi giao xong, nhân viên giao hàng đánh dấu **Đã giao** → updateOrder status = "completed", completed_at (hoặc admin thực hiện bước "Đã giao hàng" trên admin).

**Postcondition:** Đơn chuyển sang trạng thái đang giao và sau đó hoàn thành; khách hàng và admin thấy cập nhật realtime.

**Exception:** Chưa đăng nhập hoặc role khác → chuyển về index/auth; lỗi Firebase → thông báo.

---

*Tài liệu Use Case mô tả đầy đủ theo các actor: Khách vãng lai, Người dùng, Quản trị viên, Bếp, Giao hàng – phù hợp với hệ thống Nolita Pizza (website đặt món, Firebase Auth, Realtime Database, Cloudinary, VietQR).*
