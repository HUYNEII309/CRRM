# CRMPLUS - Node.js CRM App (Tương thích SQL Server CRMPLUSDB)

Ứng dụng CRM chạy trên Node.js + Express + SQL Server (`mssql`), được thiết kế tương thích trực tiếp với cấu trúc database `CRMPLUSDB` trong file `crm.sql`.

## 1. Cấu hình kết nối SQL Server

### Cách 1: Chỉnh sửa file `.env`
Sao chép `.env.example` thành `.env` (đã tạo sẵn) và cập nhật thông tin SQL Server của bạn:

```env
PORT=3000
JWT_SECRET=your_secret_key

DB_HOST=localhost
DB_PORT=1433
# Nếu dùng Named Instance (vd: SQLEXPRESS), điền DB_INSTANCE và để trống DB_PORT
DB_INSTANCE=
DB_NAME=CRMPLUSDB
DB_USER=sa
DB_PASSWORD=YourStrong@Password
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

### Cách 2: Cấu hình trực tiếp trên giao diện Web
1. Chạy app (`npm start`).
2. Mở trình duyệt tại `http://localhost:3000`.
3. Nhấn nút **"Cấu hình kết nối SQL Server"** ngay tại màn hình đăng nhập (hoặc **"Cấu hình SQL"** trên thanh trên cùng sau khi đăng nhập).
4. Nhập thông tin Server / Port / Instance / Database / User / Password → nhấn **Kiểm tra kết nối** → **Lưu vào .env & Áp dụng**.

## 2. Chạy ứng dụng

```bash
npm install
npm start
```

Mở trình duyệt: `http://localhost:3000`

## 3. Các module đã tích hợp theo cấu trúc `CRMPLUSDB`
- **Đăng nhập & Phân quyền**: `tblnhanvien` (`tendangnhap`, `matkhau`, `issudung = 1`), `tblbophan`, `tblphanquyen`, `tblmenu`, ghi log vào `LichSuDangNhap`.
- **Dashboard tổng quan**: Doanh số tháng (`tblkhoanthu`), giao dịch CSKH hôm nay (`tblchamsockhachhang`), lịch hẹn hôm nay (`tbllichhen`), khách quan tâm (`isquantam = 1`), gói dịch vụ sắp hết hạn 30 ngày (`tblgoidichvu_hansudung`), hợp đồng quá 6 tháng chưa CSKH, thông báo (`tbl_thongbao`).
- **Khách hàng**: `tblkhachhang` + `tblloaikhachhang`, `tblhinhthuckhachhang`, `tbltinhthanhpho`, `tblquanhuyen`, `tblphuongxa` + Hồ sơ 360°.
- **Chăm sóc KH**: `tblchamsockhachhang` + `tblhinhthucchamsoc`, `tbldanhgiakhachhang`, `tbllydokhachhang`, `tbltrangthai`.
- **Lịch hẹn**: `tbllichhen`.
- **Sản phẩm & Gói dịch vụ**: `tblsanphamdichvu`, `tblgoidichvu_hansudung`.
- **Công việc (Tasklist)**: `tbltasklist`, `tbltrangthaitasklist`, `tblnhomdauvieclaptrinh`.
- **Tài chính Thu / Chi**: `tblkhoanthu`, `tblloaikhoanthu`, `tblkhoanchi`, `tblloaikhoanchi`.
- **Nhân sự & Lịch sử đăng nhập**: `tblnhanvien`, `LichSuDangNhap`.
