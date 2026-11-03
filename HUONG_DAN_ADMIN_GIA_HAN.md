# Hướng dẫn Admin – bảo vệ bản quyền app Dạy thêm bản thường (99.000đ/năm)

## Phạm vi và giới hạn
- App **bản thường** dùng hồ sơ **`ban_quyen_thuong/{uid}`**, tách khỏi `nguoi_dung/{uid}` mà bản PRO cũng đang đọc.
- Ngày dùng thử `trial_started_at` là kiểu **Timestamp** được máy chủ ghi khi đăng nhập lần đầu (30 ngày).
- Chỉ Admin cập nhật `paid_until` kiểu **Timestamp**. Người dùng không có quyền sửa/xóa hồ sơ bản quyền. Không tin các ngày dạng chuỗi trong `nguoi_dung` để gia hạn bản thường.
- Hết hạn: người dùng vẫn được **đọc và sao lưu** dữ liệu của mình; ghi dữ liệu lên Firestore sẽ bị từ chối sau thời điểm bảo vệ **17/11/2026, 07:00 (GMT+7)** nếu không có giấy phép. Đã có khoảng chuyển tiếp 14 ngày để các phiên bản cũ cập nhật và tải sao lưu.
- **KHÔNG tự gia hạn khi quét QR**. Admin đối chiếu tiền thực nhận rồi gia hạn.
- Ảnh QR hiện tại vẫn giữ nguyên; phải kiểm tra người nhận, ngân hàng và số tiền 99.000đ bằng ứng dụng ngân hàng trước khi thu thật.

## Thứ tự triển khai an toàn – KHÔNG đảo ngược
1. Trước tiên sao lưu Rules hiện tại từ Firebase Console và sao lưu dữ liệu thử nghiệm.
2. Publish toàn bộ file [`firebase-rules/01_chuan_bi_khong_khoa_app.rules`](./firebase-rules/01_chuan_bi_khong_khoa_app.rules) vào **Firebase Project `quan-ly-day-them-f7b1e`**. Đây là bước chỉ thêm hồ sơ giấy phép mới; **chưa hạn chế quyền ghi** `DuLieuDayThem`, nên bản cũ vẫn dùng được.
3. Kiểm thử Rules giai đoạn A bằng Rules Playground và một tài khoản thử: đăng ký `ban_quyen_thuong/{uid}` với `serverTimestamp`, chỉ chính chủ đọc; không sửa được `paid_until`, `trial_started_at`.
4. Merge PR nâng cấp và xác nhận trang web đang chạy **đúng bản mới**. Đăng nhập bằng tài khoản thử, xác minh có hồ sơ giấy phép riêng trong Firestore, thử tạo lớp, lưu điểm danh, thu học phí, tải sao lưu. **Kiểm tra cả PRO**.
5. **Chỉ sau khi xác nhận thông báo sao lưu mới đã xuất hiện trong app**, Publish toàn bộ file [`firebase-rules/02_kich_hoat_bao_ve_thu_phi.rules`](./firebase-rules/02_kich_hoat_bao_ve_thu_phi.rules). **Đã có đệm 14 ngày:** trước **07:00 ngày 17/11/2026 (giờ Việt Nam)**, các tài khoản đã đăng nhập vẫn có quyền ghi như trước; từ thời điểm đó, bắt buộc giấy phép còn hạn để tạo/sửa/xóa `DuLieuDayThem`. Quyền đọc/sao lưu vẫn giữ nguyên ngay cả sau khi hết hạn.
6. Kiểm thử tài khoản chưa hạn, hết hạn, Admin đã gia hạn; một tài khoản khác không thể đọc/ghi dữ liệu người khác. Lưu ảnh kết quả **ALLOW/DENY** từ Rules Playground để đối chiếu.
7. Khi cần quay lại trong trường hợp sự cố: **Publish lại Rules giai đoạn A**, không xóa dữ liệu và không sửa hồ sơ bản quyền. Rules có thể mất thời gian để áp dụng lên các kết nối đang mở.

**Quan trọng:** Các file trong GitHub không tự Publish lên Firebase. Không dùng `firebase deploy` với một Rules file thiếu các đường dẫn GVCN/GVBM, vì có thể ghi đè toàn bộ Rules của dự án.

## Thu phí và gia hạn do Admin duyệt
1. Giáo viên chuyển khoản **99.000đ/năm**, xác nhận đúng người nhận và gửi Zalo Admin 0775172026 (email đăng nhập, mã người dùng và thông tin giao dịch).
2. Admin đối chiếu ngân hàng thật. Không chấp nhận nút “Đã chuyển tiền” làm bằng chứng tự động.
3. Mở Firebase Console → Firestore Database → Data → **`ban_quyen_thuong` → `{uid}`**.
4. Chỉ khi đã xác minh, thêm hoặc cập nhật **`paid_until` kiểu Timestamp**, không phải chuỗi. Ví dụ chọn ngày và giờ tương đương 12 tháng sau hạn hiện tại nếu còn hạn, hoặc 12 tháng sau ngày thanh toán nếu đã hết hạn. Không sửa `trial_started_at`.
5. Giáo viên bấm “Đã được gia hạn? Kiểm tra lại” hoặc tải lại trang, trình duyệt đọc lại giấy phép từ máy chủ.

## Dữ liệu cũ và app PRO
- Không xóa hay ghi đè dữ liệu `DuLieuDayThem/{uid}`.
- Không đổi cấu trúc `UsersPro`, `DuLieuGVCN`, `DuLieuGVBM`, `class_members`, `classes/*/activityLogs`.
- Hạn cũ trong `nguoi_dung/{uid}.ngay_het_han_thuong` **không còn được dùng để quyết định quyền** do từng có thể tự khai. Nếu giáo viên đã đóng tiền từ trước, Admin xác minh và chuyển hạn thật sang `ban_quyen_thuong/{uid}.paid_until`.
- Người dùng đang lưu ngoại tuyến bằng chế độ Khách: trên màn hình đăng nhập mới có nút **Sao lưu dữ liệu cũ trên máy**; phải tải JSON trước khi đổi trình duyệt.
- Quyền truy cập từ trình duyệt không thể chống việc sao chép mã nguồn hoặc sử dụng một bản ngoại tuyến đã tải từ trước. Nhưng sau khi Publish Rules B, Firestore sẽ từ chối **ghi Cloud** nếu không còn giấy phép.

## Kịch bản cần thử bằng Emulator/Rules Playground
- Người chưa đăng nhập tạo/đọc/sửa giấy phép → DENY.
- Người A tạo giấy phép của chính A có một trường `trial_started_at = request.time` → ALLOW.
- Người A tự ghi `trial_started_at` là thời điểm trong tương lai → DENY.
- Người A tự thêm `paid_until` lúc tạo → DENY.
- Người A sửa `trial_started_at` hoặc `paid_until` sau khi tạo → DENY.
- Người A đọc giấy phép của B → DENY.
- Tài khoản hết hạn: A đọc `DuLieuDayThem/A` → ALLOW bất kể thời điểm. Trước 07:00 ngày 17/11/2026 quyền ghi vẫn ALLOW cho chính chủ trong giai đoạn chuyển tiếp; từ đó ghi → DENY nếu hết hạn.
- Còn hạn: A ghi `DuLieuDayThem/A` → ALLOW (giai đoạn B), cả trước và sau ngày 17/11/2026.
- B không thể đọc hoặc ghi `DuLieuDayThem/A`.
- GVCN, GVBM và PRO vẫn thao tác được ở những đường dẫn vốn được phép.

## Chưa xác minh trực tiếp
- Các Rules ở repo mới được kiểm tra cú pháp theo mẫu và logic bằng mô phỏng. **Chưa chạy Firebase Emulator, chưa Publish, chưa thử kết nối Firebase thật**.
- Chưa xác minh được domain website đang dùng đã tự triển khai từ GitHub `main` hay chưa.
