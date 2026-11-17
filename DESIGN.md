# Thiết kế giao diện

Skill evon:ui-ux đọc file này trước khi dựng. Sửa tay được; file trái với code thì code thắng.

## Sản phẩm
- Sản phẩm: CRMPLUS - Hệ thống Quản trị & Chăm sóc Khách hàng Phòng khám / Nha khoa
- Người dùng: Nhân viên kinh doanh, nhân viên CSKH, kỹ thuật viên phòng khám
- Việc chính: Tra cứu khách hàng đa kênh (Tên, SĐT, Địa chỉ, Mã KH), xem chi tiết khách hàng, ghi nhận lịch sử chăm sóc và phân quyền
- Nền tảng: Web desktop là chính, hỗ trợ responsive tablet/mobile
- Điểm khác biệt: Tốc độ tra cứu tức thì, sao chép thông tin 1 chạm, chống tràn SĐT, modal chi tiết chăm sóc hiện đại không mất chữ

## Giao diện
- Bộ mặt: Clean (P13): điều hướng sidebar, thanh lọc thẻ card, bảng tra cứu danh sách khách hàng & modal CSKH hiện đại
- Sắc: Neutral (P17)
- Màu nhấn: Xanh dương `#2563eb`, token `--primary` ở `src/public/styles.css`
- Phong cách: Flat (P1), đường tóc phẳng 1px, bo góc 10–12px, nền bề mặt `#ffffff` và xám nhạt `#f8fafc`
- Nền tối: có, theo `data-theme="dark"`

## Người dùng dặn
- Tự động sao chép dữ liệu (Mã KH, Tên KH, SĐT, Địa chỉ) khi nhấp chọn
- SĐT dài hoặc nhiều số tự động ngắt chip, chống tràn sang cột địa chỉ
- Loại khách hàng hiển thị gọn, không kèm ngoặc đơn
- Mặc định nhân viên phụ trách là tài khoản đang đăng nhập
- Chi tiết chăm sóc tự ngắt dòng (white-space: pre-wrap; word-break: break-word), không bị che mất chữ
- Giao diện Thêm khách hàng mới: Bắt buộc phải chọn Loại dịch vụ, sản phẩm (* required) rồi mới cho phép tạo khách hàng mới.

## Màn đã dựng
- `Tra cứu Khách hàng` (`renderCustomerSearch`): Bảng kết quả khách hàng toàn chiều rộng (full-width 100%, min-width 1080px) trực quan với 8 cột (STT, Mã KH chip sao chép 1 chạm, Tên KH, SĐT đa số dạng chip, Địa chỉ, Loại KH badge đã tinh lọc không còn ngoặc đơn `()`, NV phụ trách, Thao tác xem Chi tiết). Nhấp chọn dòng hoặc nút "Chi tiết" sẽ mở Modal CSKH.
- `Chi tiết Chăm sóc Khách hàng` (`openCareDetailModal`): Modal độc lập hiện đại chuẩn doanh nghiệp (Executive-grade), bề rộng 980px/96vw, Hero Profile Header hiển thị thông tin khách hàng & nút sửa nhanh, hỗ trợ 2 chế độ hiển thị linh hoạt (Dạng Thẻ Timeline toàn chiều rộng và Dạng Bảng đối chiếu). Khắc phục triệt để 100% tình trạng che mất chữ hoặc kéo thanh cuộn ngang bằng `white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere;`.
- `Ghi nhận Chăm sóc Khách hàng` (`openAddCareModal`, `care.js`, `catalogs.js`, `styles.css`): Modal chuẩn nghiệp vụ mô phỏng 1:1 & nâng cấp giao diện Desktop App C#:
  - Khách hàng (*): Thẻ hiển thị phòng khám hoặc dropdown chọn khách hàng toàn hệ thống.
  - Thời gian ghi nhận (*) & Checkbox "Quan tâm giao dịch này" (`_isquantam`): Tích hợp ngôi sao nổi bật đổi màu khi kích hoạt.
  - Bộ giá trị mặc định thông minh chuẩn xác theo yêu cầu:
    - `Hình thức CS` (*) (`_idhinhthucchamsoc`): Mặc định là **"Điện thoại"** (có thể chọn đổi nếu cần).
    - `Đánh giá khách hàng` (*) (`_iddanhgiakhachhang`): Mặc định là **"Tư vấn khách hàng"**.
    - `Lý do chăm sóc` (*) (`_idlydokhachhang`): Mặc định là **"Khách hàng cần chăm sóc"**.
  - `Chọn đầu việc` (Hỗ trợ / Lập trình):
    - Khi chưa tích chọn: Ô đầu việc và hàng hỗ trợ để trắng/vô hiệu hóa ("nếu không tích chọn đầu việc thì để trắng").
    - Danh mục đầu việc: Chạy Stored Procedure `dbo.tbldanhmucdauvieccodinh_SelectAll_CoSuDung`.
    - Người hỗ trợ: Chạy Stored Procedure `dbo.tblnhanvien_SelectAll_ConCongTac_KyThuat`.
    - Nút Duyệt: Thiết kế toggle badge xanh lục ngọc emerald hiện đại, có icon kiểm tra trực quan.
    - Tự động điền Điểm và Giờ dự kiến: Gọi Stored Procedure `dbo.tblnhomdauvieclaptrinh_SelectAll_ByID` (hoặc tra cứu danh mục) để tự điền Số lượng = 1, Giờ trên 1 đầu việc = `float.Parse(dukiensogiolam)` và Điểm.
    - Lưu liên kết trực tiếp vào bảng `dbo.tbldauvieccodinh` qua Stored Procedure `dbo.tbldauvieccodinh_Insert`.
  - `Nội dung ghi nhận` (*) (`_ghichu`): Khung soạn thảo nhiều dòng rộng rãi, không bị cắt chữ.
  - `Giao việc kỹ thuật` (Tasklist KTV):
    - Kỹ thuật làm: Chạy Stored Procedure `dbo.tblnhanvien_SelectAll_ConCongTac_KyThuat`.
    - Nhóm việc: Chạy Stored Procedure `dbo.tblnhomdauvieclaptrinh_SelectAll`.
    - Giá trị mặc định chuẩn: Số lượng = 1, Giờ trên 1 đầu việc = 0 (h).
  - `Thêm thông tin lịch hẹn`:
    - Thời gian hẹn: Mặc định tự động tính đúng +7 ngày cùng giờ (tương tự như màn hình mẫu: `24/11/2026 14:40` khi ghi nhận `17/11/2026 14:40`).
    - Người được giao: Mặc định là tài khoản đang đăng nhập, có thể chọn đổi nếu cần.
  - Nút bấm chân trang: Nút "Lưu" (💾) và nút "Huỷ" (🟡) đồng bộ giao diện desktop.
  - Backend chuẩn Stored Procedure `dbo.tblchamsockhachhang_Insert` với mã tự sinh `GetNextID` định dạng `yyyyMMdd0000`, có cơ chế fallback SQL an toàn.
- `Thống kê Giờ làm Kỹ thuật viên (Time KTV)` (`renderKtvTime`): Thiết kế kết hợp A + B chuẩn điều hành chuyên nghiệp:
  - 4 thẻ KPI tổng quan: KTV Hoạt động, Tổng giờ dự kiến, Tổng giờ thực tế, Hiệu suất trung bình kèm độ chênh lệch.
  - Bộ lọc chọn nhanh khoảng thời gian: "Tháng này", "Tháng trước", "Tuần này" không cần chọn ngày thủ công.
  - Chế độ Bảng Ma trận (Mặc định - Option A): Huy chương Top 1 🥇, Top 2 🥈, Top 3 🥉, chữ số căn phải `tabular-nums`, thanh tiến độ hiệu suất đa sắc (≥100% xanh lá, 80-99% xanh lam, <80% hổ phách) kèm pill chênh lệch giờ (`+X.X h` / `-X.X h`), SĐT dạng chip sao chép 1 chạm, nút "Xem việc".
  - Chế độ Thẻ Năng suất (Option B): Lưới thẻ 3 cột responsive, card cá nhân KTV với avatar, huy chương, hộp thông số kép và thanh đo năng suất.
  - Modal Chi tiết KTV (`openKtvDetailModal`): Xem tổng quan cá nhân, 4 chỉ số thống kê và nút 1 chạm điều hướng đến Bảng Việc lọc theo KTV.
- `Đăng nhập hệ thống` (`#login-view`, `index.html`, `styles.css`, `app.js`): Thiết kế **Phương án A · Chia đôi 2 cột Workspace**, giữ màu Indigo `#4f46e5` và nền Flat đường tóc sạch sẽ:
  - Cột trái (`>= 960px`): Thương hiệu `CRM+`, tiêu đề định vị không gian làm việc và 3 thẻ giới thiệu phân hệ (*Tasklist KTV*, *Tra cứu KH đa kênh*, *Thống kê Time KTV*). Thu gọn thành header thương hiệu gọn gàng trên mobile `< 960px`.
  - Cột phải: Form đăng nhập tập trung (`max-width: 390px`, ô nhập & nút cao `48px`, `16px` mobile / `14px` desktop). Mặc định ban đầu **ẩn hoàn toàn** dòng *"Nội bộ CRMPLUS"* và nút *"Ẩn tùy chọn"*; chỉ cần **nhấp 1 lần (single-click / single-tap)** vào logo `CRM+` thì khối tùy chọn nâng cao và dòng điều khiển *"Nội bộ CRMPLUS · Ẩn tùy chọn"* sẽ hiện ra kèm hiệu ứng trượt mượt `grid-rows` (`0fr ↔ 1fr`), thanh chuyển đổi chuẩn xác thực **Mặc định / Mã hóa MD5** segmented con trượt và nút **Danh sách nhân viên**; bấm lại vào logo 1 lần hoặc bấm nút *"Ẩn tùy chọn"* để đóng lại nhanh chóng; nút Sáng/Tối ở góc trên phải; xóa ô mật khẩu & đưa con trỏ vào lại khi sai thông tin; tự động reset về trạng thái ẩn khi đăng xuất.
  - Animation GPU (`transform`/`opacity`, `cubic-bezier(0.16, 1, 0.3, 1)`): Stagger vào trang, nổi nhẹ thẻ giới thiệu, trượt thumb segmented, shimmer hover nút chính, rung alert lỗi, và tự tắt qua `@media (prefers-reduced-motion: reduce)`.
  - Bổ sung thanh cuộn 4px tự ẩn theo chuẩn hệ thống (`styles.css` & `app.js`) và chống nháy theme tối lúc tải trang (`index.html`).
- `Quản lý Xóa Khách hàng & Lịch sử Chăm sóc` (`app.js`, `care.js`, `customers.js`, `styles.css`, `db.js`):
  - `Hộp thoại xác nhận kiểu Modal riêng biệt` (`showConfirmModal`):
    - Thay thế hoàn toàn `window.confirm` mặc định của trình duyệt bằng custom modal dialog hiện đại (`#confirm-modal-backdrop` & `.confirm-modal-card`).
    - Nằm nổi ở layer cao nhất (`z-index: 1300 !important`), phủ mờ backdrop mượt mà, hỗ trợ đóng nhanh bằng phím Escape, click ra ngoài hoặc nút "Hủy bỏ".
    - Phân biệt trực quan và nội dung rõ ràng giữa Xóa khách hàng và Xóa lịch sử chăm sóc.
  - `Xóa khách hàng` trong Modal Chi tiết Chăm sóc:
    - Nút "Xóa KH" màu đỏ outline (`.btn-outline-danger`) đặt tại Hero Header thông tin khách hàng, cạnh nút "Sửa KH".
    - Hộp thoại modal xác nhận cảnh báo rõ: xóa vĩnh viễn khách hàng cùng toàn bộ dữ liệu lịch sử, cuộc hẹn và công việc liên quan.
    - Gọi API `DELETE /api/customers/:idkhachhang` -> chạy Stored Procedure `dbo.tblkhachhang_Delete` (với tham số `@idkhachhang [varchar](12)`).
    - Tự động đóng modal và nạp lại ngay "Danh sách Khách hàng tìm được": lọc tức thì khách hàng đã xóa trong bộ nhớ để giao diện phản hồi mượt mà, đồng thời gọi `searchCustomers(true)` truy vấn dữ liệu mới nhất từ CSDL SQL Server với đầy đủ tiêu chí tra cứu đang active, giữ nguyên trạng thái kết quả và phân trang.
  - `Xóa Lịch sử Chăm sóc Khách hàng` bên cạnh "Nhân viên CS:":
    - Nút xóa dạng badge đỏ tinh tế (`.btn-delete-care-item` có icon thùng rác + chữ "Xóa") đặt ngay bên cạnh `Nhân viên CS: [Tên nhân viên]`.
    - Hộp thoại modal xác nhận thông báo rõ `Mã chăm sóc: #[idchamsockhachhang]` và xác nhận CHỈ xóa sự kiện lịch sử này, không ảnh hưởng đến thông tin khách hàng.
    - Gọi API `DELETE /api/care/:idchamsockhachhang` -> chạy Stored Procedure `dbo.tblchamsockhachhang_Delete` (với tham số `@idchamsockhachhang [varchar](12)`).
    - Đảm bảo SP `dbo.tblchamsockhachhang_Delete` và `dbo.tblkhachhang_Delete` được tự động kiểm tra và khởi tạo trong `db.js`, loại bỏ lỗi missing SP và không in log cảnh báo gây rối.
    - Tự động tải lại lịch sử chăm sóc (`loadCareHistory()`), cập nhật số lần chăm sóc (`... lần chăm sóc`) và render lại danh sách thẻ ngay lập tức mà không đóng modal.
  - `Trình bày Thẻ Chăm sóc Khách hàng Tinh gọn`:
    - Chỉ hiển thị dạng thẻ (Cards view), loại bỏ hoàn toàn chế độ bảng phân cột.
    - Hiển thị nổi bật `idchamsockhachhang` qua badge `Mã CS: #idchamsockhachhang`, hỗ trợ sao chép 1 chạm vào bộ nhớ tạm.
    - Ẩn hoàn toàn các tag mặc định gây rối mắt: "Điện thoại", "Tư vấn khách hàng", và "-". Chỉ hiển thị khi có phân loại/đánh giá đặc biệt hoặc trạng thái thực tế.
