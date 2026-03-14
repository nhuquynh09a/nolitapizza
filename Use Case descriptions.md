# Nolita Pizza – Use Case Descriptions

Định dạng: **Actor** | **Mô tả** | **Precondition** | **Main Flow** | **Postcondition** | **Exception**

Các actor: **Khách vãng lai**, **Người dùng**, **Quản trị viên**, **Bếp**, **Giao hàng**.

---

## UC001: Đăng nhập

**Actor:** Khách vãng lai, Người dùng, Quản trị viên, Bếp, Giao hàng

**Mô tả:** Người dùng đăng nhập vào hệ thống bằng email/mật khẩu hoặc Google để truy cập chức năng theo vai trò.

**Precondition:** Người dùng chưa đăng nhập; có tài khoản trong hệ thống (Firebase Auth).

**Main Flow:**
1. Người dùng truy cập trang đăng nhập (auth.html)
2. Chọn đăng nhập bằng Email/Mật khẩu hoặc Google
3. Nhập thông tin (email, mật khẩu) hoặc xác thực qua Google
4. Hệ thống xác thực và lấy profile (role) từ Realtime Database
5. Hệ thống chuyển hướng theo role: Người dùng → user-account; Admin → admin-account; Bếp → kitchen-account; Giao hàng → shipper-account

**Postcondition:** Người dùng đã đăng nhập thành công và vào trang tương ứng vai trò.

**Exception:** Sai email/mật khẩu, đóng popup Google, tài khoản bị vô hiệu hóa → hiển thị thông báo lỗi.

---

## UC002: Đăng ký tài khoản

**Actor:** Khách vãng lai

**Mô tả:** Khách vãng lai tạo tài khoản mới bằng email và mật khẩu để trở thành Người dùng.

**Precondition:** Người dùng chưa đăng nhập; truy cập auth.html, form Đăng ký.

**Main Flow:**
1. Người dùng chuyển sang form Đăng ký và nhập Họ tên, Email, Số điện thoại, Mật khẩu, Xác nhận mật khẩu
2. Đồng ý điều khoản và bấm Đăng ký
3. Hệ thống tạo tài khoản Firebase Auth và profile (users/{uid}) với role "user"
4. Hệ thống thông báo thành công, chuyển sang tab Đăng nhập hoặc index

**Postcondition:** Tài khoản mới được tạo; người dùng có thể đăng nhập và dùng chức năng Người dùng.

**Exception:** Email đã tồn tại, thông tin không hợp lệ


---

## UC003: Quên mật khẩu

**Actor:** Khách vãng lai, Người dùng

**Mô tả:** Người dùng yêu cầu đặt lại mật khẩu khi quên.

**Precondition:** Có tài khoản trong hệ thống (đăng ký bằng email/mật khẩu).

**Main Flow:**
1. Người dùng chọn "Quên mật khẩu?" trên trang đăng nhập
2. Hệ thống hiển thị modal nhập email
3. Người dùng nhập email đã đăng ký và bấm Gửi
4. Hệ thống gửi link đặt lại mật khẩu qua email (Firebase sendPasswordResetEmail)
5. Người dùng mở email, click vào link
6. Trên trang Firebase, nhập mật khẩu mới và xác nhận
7. Hệ thống xác nhận đặt lại mật khẩu

**Postcondition:** Mật khẩu được đặt lại thành công; người dùng có thể đăng nhập bằng mật khẩu mới.

**Exception:** Email không tồn tại, email sai định dạng → thông báo lỗi; link hết hạn → yêu cầu gửi lại email.

---

## UC004: Xem trang chủ

**Actor:** Khách vãng lai, Người dùng

**Mô tả:** Người dùng xem trang chủ với thông tin thương hiệu, món nổi bật, ưu đãi, nhà cung cấp.

**Precondition:** Truy cập index.html (đã hoặc chưa đăng nhập).

**Main Flow:**
1. Người dùng truy cập trang chủ
2. Hệ thống hiển thị Header, Hero slider, Giới thiệu, Thực đơn nổi bật (Firebase), banner khuyến mãi, Nhà cung cấp uy tín, Footer
3. Số giỏ hàng trên header cập nhật từ localStorage (nếu có)
4. Người dùng có thể điều hướng sang Món ăn, Đặt Món, Liên hệ, Về Chúng Tôi, Đánh giá

**Postcondition:** Người dùng nắm thông tin thương hiệu và có thể chuyển sang các trang khác.

**Exception:** Không tải được món nổi bật → trạng thái trống; localStorage bị chặn → số giỏ hiển thị 0.

---

## UC005: Xem danh mục món ăn

**Actor:** Khách vãng lai, Người dùng

**Mô tả:** Người dùng xem danh sách món pizza, lọc theo danh mục và mở chi tiết món.

**Precondition:** Truy cập menu.html; Firebase cho phép đọc products và categories.

**Main Flow:**
1. Người dùng truy cập trang Món ăn
2. Hệ thống tải món từ Firebase, hiển thị lưới (ảnh, tên, giá, mô tả, calories, Thêm vào giỏ; Hết món nếu cần)
3. Người dùng có thể lọc theo danh mục
4. Người dùng nhấn vào món để xem chi tiết (product-detail.html)

**Postcondition:** Người dùng xem được danh sách món và có thể thêm vào giỏ hoặc xem chi tiết.

**Exception:** Lỗi tải Firebase → thông báo hoặc dữ liệu trống.

---

## UC006: Xem chi tiết món ăn

**Actor:** Khách vãng lai, Người dùng

**Mô tả:** Người dùng xem thông tin chi tiết món (ảnh, mô tả, size, topping, giá) và thêm vào giỏ.

**Precondition:** Truy cập product-detail.html với id món hợp lệ.

**Main Flow:**
1. Người dùng mở trang chi tiết món
2. Hệ thống tải món và product_details từ Firebase, hiển thị ảnh, tên, mô tả, size/topping, giá
3. Người dùng chọn size, topping, số lượng và bấm Thêm vào giỏ
4. Hệ thống lưu vào localStorage (cartItems), cập nhật số giỏ trên header, hiển thị thông báo

**Postcondition:** Người dùng đã xem chi tiết và có thể đã thêm món vào giỏ.

**Exception:** Món không tồn tại → thông báo; localStorage bị chặn → không thêm được giỏ.

---

## UC007: Thêm món vào giỏ hàng

**Actor:** Khách vãng lai, Người dùng

**Mô tả:** Người dùng thêm món (từ Món ăn hoặc Chi tiết món) vào giỏ; giỏ lưu localStorage, số lượng hiển thị trên header.

**Precondition:** Trang menu hoặc product-detail đã tải; món còn hàng; localStorage khả dụng.

**Main Flow:**
1. Người dùng chọn món, size/topping (nếu có) và bấm Thêm vào giỏ
2. Hệ thống cập nhật cartItems trong localStorage (thêm mới hoặc tăng số lượng)
3. Hệ thống cập nhật số lượng trên icon giỏ hàng và hiển thị thông báo thành công

**Postcondition:** Giỏ hàng chứa món; số lượng giỏ đúng trên mọi trang.

**Exception:** localStorage đầy/bị chặn → không lưu; món hết hàng → nút vô hiệu.

---

## UC008: Xem giỏ hàng và đặt món

**Actor:** Khách vãng lai, Người dùng

**Mô tả:** Người dùng xem giỏ, chỉnh sửa số lượng/xóa món, nhập thông tin giao hàng và thanh toán (COD/VietQR), xác nhận đặt hàng.

**Precondition:** Giỏ có ít nhất một món; truy cập order.html.

**Main Flow:**
1. Người dùng truy cập trang Đặt Món
2. Hệ thống hiển thị danh sách món, tổng tiền; người dùng có thể sửa số lượng, xóa món
3. Người dùng nhập Họ tên, SĐT, Email, Địa chỉ, Ghi chú (đã đăng nhập có thể điền sẵn)
4. Chọn thanh toán COD hoặc VietQR, bấm Đặt hàng
5. Hệ thống kiểm tra thông tin, tạo đơn trong Firebase (orders) với status pending
6. COD: xóa giỏ, thông báo thành công; VietQR: chuyển payment.html?order_id=...

**Postcondition:** Đơn hàng được tạo; COD hoàn tất; VietQR chuyển sang bước thanh toán.

**Exception:** Giỏ trống, thiếu thông tin → thông báo; lỗi Firebase → thông báo không tạo được đơn.

---

## UC009: Thanh toán online VietQR

**Actor:** Người dùng

**Mô tả:** Người dùng xem mã QR và thông tin chuyển khoản, xác nhận đã thanh toán hoặc hủy giao dịch.

**Precondition:** Đơn đã tạo với VietQR; chuyển đến payment.html?order_id=...

**Main Flow:**
1. Người dùng mở trang thanh toán với order_id
2. Hệ thống tải đơn, hiển thị số tiền, mã đơn, mã QR VietQR, thông tin ngân hàng
3. Người dùng quét QR và chuyển khoản bằng app ngân hàng
4. Người dùng bấm "Tôi đã thanh toán" → hệ thống cập nhật payment_status pending_confirm, hiển thị "Đã ghi nhận"

**Postcondition:** Đơn chờ xác nhận chuyển khoản; admin có thể xác nhận VietQR.

**Exception:** Bấm "Hủy giao dịch" → xóa đơn, chuyển về order.html; thiếu order_id, không tìm thấy đơn → lỗi và link quay lại.

---

## UC010: Xem và cập nhật thông tin cá nhân

**Actor:** Người dùng

**Mô tả:** Người dùng xem và chỉnh sửa hồ sơ (họ tên, email, SĐT, địa chỉ) trên trang Tài khoản.

**Precondition:** Đã đăng nhập (role user); truy cập user-account.html, tab Thông tin cá nhân.

**Main Flow:**
1. Người dùng mở tab Thông tin cá nhân
2. Hệ thống tải profile từ Firebase và hiển thị
3. Người dùng bấm Chỉnh sửa, sửa các trường và bấm Lưu
4. Hệ thống cập nhật profile vào Firebase (saveUserProfile)

**Postcondition:** Thông tin cá nhân được cập nhật; dùng để tự điền form đặt món.

**Exception:** Chưa đăng nhập → chuyển auth; lỗi Firebase → thông báo không lưu được.

---

## UC011: Đổi mật khẩu (người dùng email/mật khẩu)

**Actor:** Người dùng

**Mô tả:** Người dùng đăng nhập bằng email/mật khẩu đổi mật khẩu hiện tại ngay trên trang Tài khoản (reauthenticate + updatePassword Firebase Auth).

**Precondition:** Đã đăng nhập (role user) bằng email/mật khẩu; truy cập user-account.html, tab Đổi mật khẩu.

**Main Flow:**
1. Người dùng mở tab Đổi mật khẩu
2. Nhập Mật khẩu cũ, Mật khẩu mới, Xác nhận mật khẩu mới
3. Bấm Cập nhật
4. Hệ thống xác thực lại bằng mật khẩu cũ (reauthenticateWithCredential), rồi gọi updatePassword với mật khẩu mới
5. Hệ thống thông báo thành công và xóa các ô nhập

**Postcondition:** Mật khẩu Firebase Auth của tài khoản được đổi; lần đăng nhập sau dùng mật khẩu mới.

**Exception:** Tài khoản đăng nhập bằng Google → thông báo không thể đổi mật khẩu tại đây; sai mật khẩu cũ, mật khẩu mới quá yếu hoặc xác nhận không khớp → thông báo lỗi.

---

## UC012: Xem lịch sử đơn hàng và hủy đơn

**Actor:** Người dùng

**Mô tả:** Người dùng xem danh sách đơn, xem chi tiết và hủy đơn khi ở trạng thái cho phép.

**Precondition:** Đã đăng nhập; user-account.html, tab Đơn hàng của tôi.

**Main Flow:**
1. Người dùng mở tab Đơn hàng của tôi
2. Hệ thống tải đơn theo user, hiển thị Mã đơn, Ngày, Tổng tiền, Trạng thái, nút Xem, Hủy (nếu được phép)
3. Người dùng bấm Xem → xem chi tiết; bấm Hủy → nhập lý do, xác nhận
4. Hệ thống cập nhật đơn status = cancelled, cancel_reason, cancelled_at

**Postcondition:** Lịch sử đơn hiển thị; đơn hủy có trạng thái và lý do (admin thấy).

**Exception:** Đơn không thuộc user; đơn đã confirmed/ready/delivering/completed → không cho hủy; lỗi Firebase → thông báo.

---

## UC013: Viết đánh giá món

**Actor:** Người dùng

**Mô tả:** Người dùng gửi đánh giá (số sao, nội dung) cho món đã mua; admin quản lý đánh giá.

**Precondition:** Đã đăng nhập; user-account.html, tab Đánh giá của tôi; có đơn hoàn thành.

**Main Flow:**
1. Người dùng mở tab Đánh giá của tôi
2. Chọn món/đơn, nhập nội dung và số sao, bấm gửi
3. Hệ thống lưu đánh giá vào Firebase (reviews)

**Postcondition:** Đánh giá được lưu; admin xem/xóa trong Quản lý đánh giá.

**Exception:** Chưa đăng nhập, nội dung trống → thông báo; lỗi Firebase → thông báo.

---

## UC014: Gửi liên hệ / góp ý

**Actor:** Khách vãng lai, Người dùng

**Mô tả:** Người dùng gửi tin nhắn liên hệ (họ tên, email, SĐT, tiêu đề, nội dung) cho nhà hàng.

**Precondition:** Truy cập contact.html; Firebase cho phép ghi contacts.

**Main Flow:**
1. Người dùng truy cập trang Liên hệ và điền form
2. Bấm Gửi
3. Hệ thống kiểm tra validation, lưu vào Firebase (contacts), thông báo thành công

**Postcondition:** Tin nhắn được lưu; Quản trị viên xem và xử lý trong Quản lý liên hệ.

**Exception:** Dữ liệu không hợp lệ, lỗi Firebase → thông báo.

---

## UC015: Đăng xuất

**Actor:** Người dùng, Quản trị viên, Bếp, Giao hàng

**Mô tả:** Người dùng đăng xuất để kết thúc phiên làm việc.

**Precondition:** Đã đăng nhập; đang ở trang user-account, admin-account, kitchen-account hoặc shipper-account.

**Main Flow:**
1. Người dùng bấm Đăng xuất
2. Hệ thống hiển thị xác nhận (nếu có), người dùng xác nhận
3. Hệ thống gọi Firebase signOut và chuyển về auth.html hoặc index.html

**Postcondition:** Phiên kết thúc; header hiển thị Đăng ký/Đăng nhập; truy cập lại trang admin/bếp/giao hàng sẽ chuyển về đăng nhập.

**Exception:** Lỗi mạng → vẫn có thể chuyển trang; hủy xác nhận → không đăng xuất.

---

## UC016: Quản trị viên – Xem dashboard và thống kê

**Actor:** Quản trị viên

**Mô tả:** Quản trị viên xem tổng quan doanh thu, người dùng mới, món ăn mới và biểu đồ theo thời gian.

**Precondition:** Đã đăng nhập (role admin); admin-account.html, section Dashboard.

**Main Flow:**
1. Quản trị viên mở trang Admin (mặc định Dashboard)
2. Hệ thống tải orders, users, products từ Firebase, lọc theo Hôm nay / 7 ngày / 30 ngày
3. Hiển thị Doanh thu, Người dùng mới, Món ăn mới; có thể có biểu đồ
4. Quản trị viên đổi dropdown để cập nhật số liệu

**Postcondition:** Quản trị viên nắm tình hình doanh thu và hoạt động hệ thống.

**Exception:** Không đủ quyền → chuyển index; lỗi tải → hiển thị "—" hoặc thông báo.

---

## UC017: Quản trị viên – Quản lý món ăn

**Actor:** Quản trị viên

**Mô tả:** Quản trị viên xem danh sách món , thêm, sửa, xóa món; ảnh upload Cloudinary.

**Precondition:** Đã đăng nhập (admin); admin-account.html, tab Món ăn.

**Main Flow:**
1. Quản trị viên mở tab Món ăn; hệ thống tải products, hiển thị bảng có phân trang, nút Sửa, Xóa
2. Thêm món: bấm Thêm món ăn → modal nhập tên, ảnh, giá/cal size, topping, mô tả, danh mục → Lưu → upload Cloudinary, tạo product + product_details
3. Sửa món: bấm Sửa → modal chỉnh sửa → Lưu → cập nhật Firebase
4. Xóa món: bấm Xóa → xác nhận → xóa product và details

**Postcondition:** Danh sách món trên website phản ánh đúng dữ liệu.

**Exception:** Upload ảnh lỗi, thiếu tên món, lỗi Firebase → thông báo.

---

## UC018: Quản trị viên – Quản lý danh mục

**Actor:** Quản trị viên

**Mô tả:** Quản trị viên xem danh sách danh mục, thêm, sửa tên, xóa danh mục.

**Precondition:** Đã đăng nhập (admin); admin-account.html, tab Danh mục.

**Main Flow:**
1. Quản trị viên mở tab Danh mục; hệ thống tải categories, hiển thị bảng, nút Sửa, Xóa
2. Thêm: nhập tên → Lưu (addCategory)
3. Sửa: sửa tên → Lưu (updateCategory)
4. Xóa: xác nhận → deleteCategory

**Postcondition:** Danh mục cập nhật; dropdown danh mục trên Món ăn và form món dùng đúng.

**Exception:** Tên trống, lỗi Firebase → thông báo.

---

## UC019: Quản trị viên – Quản lý đơn hàng

**Actor:** Quản trị viên

**Mô tả:** Quản trị viên xem đơn (12/trang, lọc trạng thái), duyệt, gửi bếp, gửi ship, xác nhận giao, hủy đơn, xác nhận VietQR.

**Precondition:** Đã đăng nhập (admin); admin-account.html, tab Đơn hàng.

**Main Flow:**
1. Quản trị viên mở tab Đơn hàng; hệ thống subscribeOrders, hiển thị bảng có phân trang và lọc trạng thái
2. Xem chi tiết: bấm Chi tiết → modal thông tin khách, món, thanh toán; VietQR chờ xác nhận có nút Xác nhận đã chuyển khoản
3. Duyệt đơn (pending → confirmed), Gửi bếp (confirmed → ready), Gửi ship (ready → delivering), Đã giao hàng (delivering → completed)
4. Hủy đơn: nhập lý do → xác nhận → status cancelled, cancel_reason, cancelled_at

**Postcondition:** Trạng thái đơn cập nhật theo quy trình; khách và Bếp/Giao hàng thấy realtime; doanh thu dùng đơn completed.

**Exception:** Đơn không tồn tại, lỗi updateOrder → thông báo.

---

## UC020: Quản trị viên – Quản lý người dùng

**Actor:** Quản trị viên

**Mô tả:** Quản trị viên xem danh sách users, sửa thông tin (email, họ tên) hoặc xóa tài khoản.

**Precondition:** Đã đăng nhập (admin); admin-account.html, tab Người dùng.

**Main Flow:**
1. Quản trị viên mở tab Người dùng; hệ thống tải users, hiển thị bảng, nút Sửa, Xóa
2. Sửa: modal nhập Email, Họ tên → Lưu (saveUserProfile)
3. Xóa: xác nhận → deleteUserProfile

**Postcondition:** Thông tin người dùng cập nhật hoặc bị gỡ khỏi quản lý.

**Exception:** Thiếu email/họ tên, lỗi Firebase → thông báo.

---

## UC021: Quản trị viên – Quản lý liên hệ

**Actor:** Quản trị viên

**Mô tả:** Quản trị viên xem tin nhắn liên hệ từ khách, cập nhật trạng thái hoặc xóa.

**Precondition:** Đã đăng nhập (admin); admin-account.html, tab Liên hệ.

**Main Flow:**
1. Quản trị viên mở tab Liên hệ; hệ thống tải contacts, hiển thị bảng
2. Cập nhật trạng thái (updateContact) hoặc xóa (deleteContact)

**Postcondition:** Tin nhắn đánh dấu đã xử lý hoặc xóa.

**Exception:** Lỗi Firebase → thông báo.

---

## UC022: Quản trị viên – Quản lý đánh giá

**Actor:** Quản trị viên

**Mô tả:** Quản trị viên xem đánh giá của khách về món ăn và có thể xóa đánh giá không phù hợp.

**Precondition:** Đã đăng nhập (admin); admin-account.html, tab Đánh giá.

**Main Flow:**
1. Quản trị viên mở tab Đánh giá; hệ thống tải reviews, hiển thị bảng
2. Bấm Xóa trên một đánh giá → xác nhận → deleteReview

**Postcondition:** Đánh giá bị xóa không còn hiển thị (nếu có trang công khai).

**Exception:** Lỗi Firebase → thông báo.

---

## UC023: Bếp – Xem đơn cần chế biến và cập nhật trạng thái

**Actor:** Bếp

**Mô tả:** Nhân viên bếp xem đơn đã gửi xuống bếp, cập nhật trạng thái đang chế biến / đã xong.

**Precondition:** Đã đăng nhập (role kitchen); kitchen-account.html.

**Main Flow:**
1. Nhân viên bếp truy cập trang Bếp; hệ thống hiển thị đơn status = ready
2. Cập nhật Đang chế biến → kitchen_status = cooking
3. Sau khi xong, cập nhật Đã xong → kitchen_status = done
4. Hệ thống có thể gửi thông báo cho admin

**Postcondition:** Trạng thái kitchen_status cập nhật; admin và Giao hàng thấy đơn sẵn sàng khi done.

**Exception:** Chưa đăng nhập/role khác → chuyển index/auth; lỗi Firebase → thông báo.

---

## UC024: Giao hàng – Xem đơn cần giao và cập nhật trạng thái

**Actor:** Giao hàng

**Mô tả:** Nhân viên giao hàng xem đơn sẵn sàng giao, nhận đơn và cập nhật đang giao / đã giao.

**Precondition:** Đã đăng nhập (role shipper); shipper-account.html.

**Main Flow:**
1. Nhân viên giao hàng truy cập trang Giao hàng; hệ thống hiển thị đơn ready + kitchen done (hoặc delivering đã nhận)
2. Nhận đơn → status = delivering, shipping_status = accepted
3. Sau khi giao xong, đánh dấu Đã giao → status = completed, completed_at (hoặc admin thực hiện Đã giao hàng)

**Postcondition:** Đơn chuyển đang giao rồi hoàn thành; khách và admin thấy realtime.

**Exception:** Chưa đăng nhập/role khác → chuyển index/auth; lỗi Firebase → thông báo.

---

*Tài liệu Use Case: Khách vãng lai, Người dùng, Quản trị viên, Bếp, Giao hàng – Nolita Pizza (Firebase Auth, Realtime Database, Cloudinary, VietQR).*
