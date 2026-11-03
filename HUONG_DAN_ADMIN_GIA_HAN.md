# Hướng dẫn Admin – gia hạn gói 99.000đ/năm

## Hiện trạng
- App bản thường đã bật hiển thị dùng thử 30 ngày trên **tài khoản đăng nhập Google**, cảnh báo trước 3 ngày và màn hình gia hạn khi quá hạn.
- QR vẫn là ảnh `qr-thu-phi.jpg` có sẵn, không chỉnh sửa. Admin cần **quét thử và xác nhận số tiền/đích nhận** trước khi quảng bá thu phí 99.000đ.
- **Không có xác minh giao dịch tự động**: thanh toán qua QR không tự gia hạn; Admin phải kiểm tra tiền thật rồi cập nhật hạn sử dụng.
- Chế độ **Khách/ngoại tuyến** hiện không được kiểm soát bằng giấy phép tài khoản Google và cần một phương án riêng nếu muốn thu phí tất cả người dùng.
- Việc kiểm soát thời hạn hiện xử lý trong JavaScript trình duyệt: chưa thay thế được phân quyền Firestore/kiểm tra máy chủ. Không xem đây là cơ chế chống gian lận an toàn.

## Khách hàng gia hạn
1. Giáo viên đăng nhập bằng đúng Google đã đăng ký app, vào Gia hạn 99K/năm.
2. Quét QR cũ, kiểm tra **đúng số tiền 99.000đ** và thông tin người nhận trước khi xác nhận ngân hàng.
3. Bấm **Sao chép thông tin gia hạn** và gửi Admin qua Zalo 0775172026 kèm bằng chứng giao dịch; Admin đối chiếu tiền thực nhận, người chuyển và nội dung.
4. Admin mở **Firebase Console → Firestore Database → Data → nguoi_dung → {UID}** đúng tài khoản được yêu cầu.
5. **Tạo/cập nhật trường riêng `ngay_het_han_thuong`** (kiểu string ISO 8601), ví dụ `2027-12-03T00:00:00.000+07:00`. Không chỉnh trường chung `ngay_het_han`: app Trung tâm PRO có thể dùng chung tài khoản Firebase. Chỉ gia hạn sau khi xác minh thanh toán. Chính sách đề xuất: cộng 1 năm từ ngày hết hạn hiệu lực hiện tại nếu còn hạn, hoặc từ ngày xác nhận thanh toán nếu đã hết hạn.
6. Hướng dẫn giáo viên bấm **Đã được gia hạn? Kiểm tra lại** để tải trạng thái mới.

**Không sửa các trường** `ngay_dang_ky`, `ngay_het_han` hay dữ liệu lớp trong `DuLieuDayThem/{UID}`. Việc cập nhật thời hạn phải được giới hạn chỉ Admin bằng Firestore Security Rules/backend tin cậy. Nếu người dùng thường có thể tự sửa `ngay_het_han_thuong` hoặc `ngay_het_han` thì chức năng thu phí không an toàn.

## Thời gian và sao lưu
- Tài khoản tạo mới có hạn dùng thử 30 ngày kể từ khi tạo hồ sơ `nguoi_dung`. Khi chưa có `ngay_het_han_thuong`, app bản thường dùng mốc cũ `ngay_het_han` để tương thích; khi Admin gia hạn sẽ ưu tiên mốc riêng.
- Tài khoản cũ có thời gian chuyển tiếp đến **00:00 ngày 03/12/2026 (GMT+7)** nếu ngày hết hạn cũ sớm hơn mốc đó. Nếu đã được gia hạn xa hơn, giữ ngày cũ.
- Khi còn từ 3 ngày trở xuống, màn hình Tổng quan hiển thị nút **Sao lưu dữ liệu** và **Gia hạn**.
- Sau khi hết hạn, app vẫn tải dữ liệu từ Firestore (nếu kết nối/quyền cho phép) và hiển thị nút **TẢI BẢN SAO LƯU JSON**. Không được xóa dữ liệu khi hết hạn.
- Nếu mất mạng hoặc quyền đọc Firestore bị từ chối, file JSON có thể chỉ chứa bản trên máy. Hướng dẫn người dùng thử kết nối lại trước khi sao lưu và giữ nhiều bản sao lưu.

## Việc còn phải làm trước khi thu tiền quy mô lớn
- Kiểm tra/publish Firestore Rules: người dùng chỉ đọc trạng thái của mình, không được tự cập nhật thời hạn hoặc nâng quyền; cập nhật do Admin/backend bảo mật.
- Đánh giá cơ chế truy cập khách: hiện vẫn có thể dùng phần ngoại tuyến mà không đăng nhập.
- Kiểm thử thực tế với tài khoản mới, tài khoản cũ, ngày hết hạn, đăng nhập nhiều thiết bị, Cloud mất kết nối, Admin gia hạn và sao lưu.
- Nếu cần tự cộng hạn ngay khi chuyển khoản, phải triển khai backend nhận thông báo thanh toán có xác thực rồi mới cập nhật bản quyền; việc này **chưa được xây dựng**.
