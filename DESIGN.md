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

## Màn đã dựng
- `Tra cứu Khách hàng` (`renderCustomerSearch`): Bảng kết quả khách hàng toàn chiều rộng (full-width 100%, min-width 1080px) trực quan với 8 cột (STT, Mã KH chip sao chép 1 chạm, Tên KH, SĐT đa số dạng chip, Địa chỉ, Loại KH badge đã tinh lọc không còn ngoặc đơn `()`, NV phụ trách, Thao tác xem Chi tiết). Nhấp chọn dòng hoặc nút "Chi tiết" sẽ mở Modal CSKH.
- `Chi tiết Chăm sóc Khách hàng` (`openCareDetailModal`): Modal độc lập hiện đại chuẩn doanh nghiệp (Executive-grade), bề rộng 980px/96vw, Hero Profile Header hiển thị thông tin khách hàng & nút sửa nhanh, hỗ trợ 2 chế độ hiển thị linh hoạt (Dạng Thẻ Timeline toàn chiều rộng và Dạng Bảng đối chiếu). Khắc phục triệt để 100% tình trạng che mất chữ hoặc kéo thanh cuộn ngang bằng `white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere;`.
- `Thống kê Giờ làm Kỹ thuật viên (Time KTV)` (`renderKtvTime`): Thiết kế kết hợp A + B chuẩn điều hành chuyên nghiệp:
  - 4 thẻ KPI tổng quan: KTV Hoạt động, Tổng giờ dự kiến, Tổng giờ thực tế, Hiệu suất trung bình kèm độ chênh lệch.
  - Bộ lọc chọn nhanh khoảng thời gian: "Tháng này", "Tháng trước", "Tuần này" không cần chọn ngày thủ công.
  - Chế độ Bảng Ma trận (Mặc định - Option A): Huy chương Top 1 🥇, Top 2 🥈, Top 3 🥉, chữ số căn phải `tabular-nums`, thanh tiến độ hiệu suất đa sắc (≥100% xanh lá, 80-99% xanh lam, <80% hổ phách) kèm pill chênh lệch giờ (`+X.X h` / `-X.X h`), SĐT dạng chip sao chép 1 chạm, nút "Xem việc".
  - Chế độ Thẻ Năng suất (Option B): Lưới thẻ 3 cột responsive, card cá nhân KTV với avatar, huy chương, hộp thông số kép và thanh đo năng suất.
  - Modal Chi tiết KTV (`openKtvDetailModal`): Xem tổng quan cá nhân, 4 chỉ số thống kê và nút 1 chạm điều hướng đến Bảng Việc lọc theo KTV.
