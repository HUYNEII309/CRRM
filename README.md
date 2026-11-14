<div align="center">

# ⚡ CRMPLUS - Modern Enterprise CRM System
**Hệ thống Quản trị & Chăm sóc Khách hàng, Quản lý Công việc & Hiệu suất Kỹ thuật viên**

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Microsoft SQL Server](https://img.shields.io/badge/SQL%20Server-2016%2B-CC292B?style=for-the-badge&logo=microsoft-sql-server&logoColor=white)](https://www.microsoft.com/sql-server/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/)
[![CSS3](https://img.shields.io/badge/CSS3-Design%20System-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://www.w3.org/Style/CSS/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<br/>

> 🎯 **CRMPLUS** là giải pháp CRM thế hệ mới được xây dựng trên nền tảng **Node.js + Express** và kết nối trực tiếp cơ sở dữ liệu **Microsoft SQL Server (`CRMPLUSDB`)**. Ứng dụng sở hữu giao diện **Modern SaaS Dashboard** cao cấp, hỗ trợ Light & Dark Mode, tối ưu trải nghiệm trên mọi kích thước màn hình từ Desktop đến Mobile.

</div>

---

## 🌟 Tính Năng Nổi Bật (Key Features)

### 🎨 1. Giao diện Modern SaaS Dashboard Cao Cấp
- **Thiết kế tối giản & sang trọng**: Áp dụng phong cách Glassmorphism (kính mờ), bo tròn mềm mại, hệ thống thẻ card trực quan cùng shadow đa tầng.
- **Light & Dark Mode**: Hỗ trợ chuyển đổi giao diện Sáng / Tối tức thì với bảng màu thích ứng tự động, chống lóa mắt và bảo vệ thị lực.
- **Hiệu ứng chuyển động mượt mà (Micro-interactions)**:
  - Nền đăng nhập chuyển động đa tầng: **Orbital Dash Rings** (vòng quỹ đạo xoay tròn), **Center Halo Spotlight** và **Luminous Mesh Orbs** (4 luồng ánh sáng cực quang Indigo, Sky, Violet, Rose).
  - Thẻ đăng nhập trượt mở nhẹ nhàng (`cubic-bezier`), logo tương tác 3D nổi bật.
- **Mobile First & Responsive**: Tự động chuyển đổi thanh điều hướng thành **Drawer trượt** trên điện thoại/máy tính bảng, bảng dữ liệu cuộn ngang độc lập không làm vỡ khung nhìn.

---

### 🔐 2. Đăng Nhập & Bảo Mật Linh Hoạt
- **Mã hóa MD5 chuẩn hệ thống**: Hỗ trợ đăng nhập với mật khẩu mã hóa MD5 thông qua Stored Procedure `dbo.tblNhanVien_CheckDangNhap_26T5_19_5` (kết hợp `Util.CreateMD5`).
- **Tùy chọn đăng nhập mặc định**: Chuyển đổi linh hoạt giữa xác thực mật khẩu thông thường và mã hóa MD5 bằng Segmented Pill Switch.
- **Cửa sổ Danh sách nhân viên (Còn công tác)**:
  - Tích hợp Stored Procedure `dbo.tblnhanvien_SelectAll_ConCongTac`.
  - Bộ lọc tìm kiếm nhanh theo họ tên, số điện thoại, tài khoản.
  - **1-Click Copy Mật khẩu**: Nhấp trực tiếp vào chuỗi mật khẩu/mã hash để sao chép vào bộ nhớ tạm với hiệu ứng phản hồi trực quan.
  - **Tự động điền (Auto-fill)**: Nhấp đúp vào bất kỳ dòng nhân viên nào để tự điền tài khoản & mật khẩu vào form đăng nhập.
- **Cơ chế ẩn an toàn**: Tùy chọn chuyển loại mật khẩu và nút danh sách nhân viên được ẩn tinh tế, chỉ hiển thị khi nhấp vào Logo `CRM+`.

---

### 💼 3. 4 Phân Hệ Nghiệp Vụ Cốt Lõi

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CRMPLUS WORKFLOW                              │
├─────────────────┬──────────────────┬─────────────────┬─────────────────┤
│   CÔNG VIỆC     │  TIME KTV        │ TRA CỨU KH      │  SP BÁN RA      │
│   (Tasklist)    │  (Hiệu suất giờ) │ (Customer 360°) │  (Báo cáo DT)   │
└─────────────────┴──────────────────┴─────────────────┴─────────────────┘
```

#### 📋 A. Quản lý Công việc Kỹ thuật viên (Tasklist)
- Mặc định mở ngay sau khi đăng nhập.
- Lọc theo khoảng ngày linh hoạt (tự động điền ngày đầu tháng đến cuối tháng).
- Phân loại trạng thái nghiệp vụ: *Tiếp nhận mới, Đang xử lý, Hoàn thành, Tạm hoãn...*
- Lọc theo nhân viên phụ trách thực hiện công việc.
- Cập nhật tiến độ, nội dung yêu cầu, ngày tạo và người giao việc chi tiết.

#### ⏱ B. Thống kê Time KTV (Giờ làm Kỹ thuật viên)
- Đo lường và đối soát **Thời gian quy định** so với **Thời gian thực tế**.
- Đánh giá hiệu suất hoàn thành công việc của từng kỹ thuật viên trong tháng.
- Sắp xếp tăng/giảm theo số giờ thực tế, lọc nhanh theo tên kỹ thuật viên.

#### 🔍 C. Tra cứu Khách hàng & Lịch sử Chăm sóc (Customer 360°)
- Tra cứu thông minh đa tiêu chí: **Tên khách hàng**, **Số điện thoại**, **Địa chỉ**, **Mã khách hàng** (chạy song song 4 Stored Procedure chuyên sâu).
- Danh sách kết quả rõ ràng: Mã KH, họ tên, số điện thoại, địa chỉ, loại khách hàng và nhân viên quản lý.
- **Xem nhanh Lịch sử CSKH**: Nhấp chọn bất kỳ khách hàng nào để mở bảng chi tiết lịch sử chăm sóc bên dưới (ngày giờ, hình thức CS, nhân viên CS, nội dung / ghi chú).

#### 📊 D. Thống kê Sản phẩm Bán ra
- **Doanh số theo Nhân viên**: Hiển thị bảng xếp hạng bán lẻ, tổng tiền, số lượng khách hàng và thanh tiến độ trực quan (% đóng góp doanh số).
- **Doanh số theo Sản phẩm / Gói dịch vụ**: Thống kê danh mục hàng hóa bán chạy nhất kèm huy hiệu Top 1, Top 2, Top 3.
- **Bảng chi tiết Khách hàng mua hàng**: Nhấp vào sản phẩm hoặc nhân viên để xem danh sách khách hàng đã mua, địa chỉ và số tiền tương ứng, kèm tổng tiền cuối bảng.

---

### 🗄 4. Kết Nối SQL Server Linh Hoạt
- Sử dụng thư viện `mssql` (`tedious`) với connection pooling tối ưu hiệu năng truy vấn.
- Hỗ trợ cả **Default Port (1433)** lẫn **Named Instance** (ví dụ: `SQLEXPRESS`, `MSSQLSERVER`).
- Hỗ trợ tùy chọn mã hóa kết nối `encrypt` và tin cậy chứng chỉ `trustServerCertificate`.
- **Cấu hình trực quan**: Cho phép cấu hình qua file `.env` hoặc hộp thoại cấu hình giao diện kèm tính năng **Kiểm tra kết nối trực tiếp** trước khi lưu.

---

## 🛠 Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ / Thư viện | Vai trò |
| :--- | :--- | :--- |
| **Runtime** | [Node.js](https://nodejs.org/) (v18+) | Môi trường thực thi JavaScript phía Backend |
| **Framework** | [Express.js](https://expressjs.com/) (v4.21) | Xây dựng RESTful API và phục vụ tài nguyên tĩnh |
| **Database** | [Microsoft SQL Server](https://www.microsoft.com/sql-server/) | Lưu trữ và xử lý dữ liệu với Stored Procedures |
| **DB Driver** | [mssql](https://www.npmjs.com/package/mssql) | Kết nối, pooling và thực thi câu lệnh SQL |
| **Security** | [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) | Xác thực và phân quyền bằng JWT Token |
| **Security** | Node.js Crypto (MD5) | Mã hóa mật khẩu MD5 UTF-16LE tương thích C# .NET |
| **Frontend** | Vanilla JavaScript (ES6+) | Xử lý logic SPA, API fetch, theme toggle, DOM rendering |
| **Styling** | Modern CSS3 Custom Properties | Design System SaaS, Grid/Flexbox, Keyframe Animations |
| **Typography** | [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) | Font chữ công nghệ sắc nét, dễ đọc |

---

## 📁 Cấu Trúc Thư Mục Dự Án (Project Structure)

```bash
CRMS/
├── .env                       # File cấu hình môi trường (SQL Server, JWT, Port)
├── .env.example               # Mẫu cấu hình môi trường
├── package.json               # Cấu hình dự án và dependencies
├── README.md                  # Tài liệu hướng dẫn dự án
└── src/
    ├── server.js              # File khởi chạy ứng dụng Express chính
    ├── config/
    │   └── db.js              # Cấu hình kết nối & Connection Pool SQL Server
    ├── middleware/
    │   └── auth.js            # Middleware xác thực JWT token
    ├── routes/
    │   ├── auth.js            # API Đăng nhập (MD5/Mặc định), Lấy danh sách NV
    │   ├── tasks.js           # API Quản lý Tasklist Kỹ thuật viên
    │   ├── ktvTime.js         # API Thống kê Giờ làm KTV
    │   ├── customerSearch.js  # API Tra cứu Khách hàng & Lịch sử CSKH
    │   ├── salesStats.js      # API Thống kê Sản phẩm Bán ra & Doanh số
    │   ├── customers.js       # API Danh sách khách hàng chung
    │   ├── care.js            # API Chăm sóc khách hàng
    │   ├── appointments.js    # API Lịch hẹn
    │   ├── products.js        # API Sản phẩm & Gói dịch vụ
    │   ├── finance.js         # API Tài chính (Thu / Chi)
    │   ├── staff.js           # API Quản lý Nhân sự
    │   ├── catalogs.js        # API Danh mục dùng chung
    │   ├── dashboard.js       # API Thống kê tổng quan
    │   └── settings.js        # API Cấu hình kết nối Database
    ├── utils/
    │   └── idGenerator.js     # Hàm sinh ID nghiệp vụ
    └── public/
        ├── index.html         # Giao diện chính Single Page Application (SPA)
        ├── app.js             # Logic Frontend, Router, State & API Client
        └── styles.css         # Design System SaaS, Themes & Animations
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng (Getting Started)

### 1. Yêu cầu hệ thống (Prerequisites)
- [Node.js](https://nodejs.org/) phiên bản **18.0.0** trở lên.
- [Microsoft SQL Server](https://www.microsoft.com/sql-server/) (2016, 2019, 2022 hoặc Express) đã được restore database `CRMPLUSDB`.

### 2. Cài đặt các gói phụ thuộc
Mở terminal tại thư mục dự án và chạy:
```bash
npm install
```

### 3. Cấu hình kết nối SQL Server
Tạo file `.env` bằng cách sao chép từ `.env.example`:
```bash
cp .env.example .env
```
Mở file `.env` và cập nhật thông số kết nối cơ sở dữ liệu của bạn:
```env
# Cổng ứng dụng web
PORT=3000

# Khóa bí mật ký JWT Token
JWT_SECRET=CRMPLUS_SUPER_SECRET_KEY_2026

# Thông số SQL Server
DB_HOST=localhost
DB_PORT=1433
DB_INSTANCE=
DB_NAME=CRMPLUSDB
DB_USER=sa
DB_PASSWORD=YourPassword123@
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

> **Ghi chú về `DB_INSTANCE`:**
> - Nếu bạn sử dụng SQL Server mặc định qua cổng: Điền `DB_PORT=1433` và để trống `DB_INSTANCE=`.
> - Nếu bạn sử dụng Named Instance (ví dụ `SQLEXPRESS`): Điền `DB_INSTANCE=SQLEXPRESS` và để trống `DB_PORT=`.

### 4. Khởi chạy ứng dụng
```bash
# Khởi chạy chế độ Production
npm start

# Hoặc khởi chạy chế độ Development (tự động reload khi sửa code)
npm run dev
```

Sau khi khởi chạy thành công, mở trình duyệt và truy cập:
```
http://localhost:3000
```

---

## ⚙️ Biến Môi Trường (Environment Variables)

| Tên biến | Bắt buộc | Giá trị mặc định | Giải thích chi tiết |
| :--- | :---: | :---: | :--- |
| `PORT` | Không | `3000` | Cổng HTTP lắng nghe của ứng dụng Express |
| `JWT_SECRET` | Có | `your_secret_key` | Khóa bí mật dùng để tạo và xác minh JSON Web Token |
| `DB_HOST` | Có | `localhost` | Địa chỉ IP hoặc hostname của máy chủ SQL Server |
| `DB_PORT` | Tùy chọn | `1433` | Cổng TCP kết nối SQL Server (để trống nếu dùng Instance) |
| `DB_INSTANCE` | Tùy chọn | *(trống)* | Tên Named Instance của SQL Server (ví dụ: `SQLEXPRESS`) |
| `DB_NAME` | Có | `CRMPLUSDB` | Tên cơ sở dữ liệu CRM trên máy chủ SQL |
| `DB_USER` | Có | `sa` | Tài khoản đăng nhập SQL Server có quyền truy cập DB |
| `DB_PASSWORD` | Có | *(trống)* | Mật khẩu tài khoản đăng nhập SQL Server |
| `DB_ENCRYPT` | Không | `false` | Bật mã hóa SSL/TLS (cần thiết khi kết nối Azure SQL) |
| `DB_TRUST_SERVER_CERTIFICATE` | Không | `true` | Bỏ qua chứng chỉ tự ký (khuyên bật cho mạng LAN / Local) |

---

## 🎯 Hướng Dẫn Sử Dụng Nhanh

1. **Đăng nhập hệ thống**:
   - Mặc định hệ thống sử dụng cơ chế **Mã hóa MD5** theo Stored Procedure của CRMPLUS.
   - Nhấp vào **Logo `CRM+`** để mở tùy chọn nâng cao nếu muốn chuyển sang mật khẩu mặc định hoặc mở danh sách nhân viên.
   - Nhấp vào **"Danh sách nhân viên"** để xem các tài khoản đang còn công tác, nhấp vào chuỗi mật khẩu để sao chép hoặc nhấp đúp để tự điền.
2. **Chuyển đổi giao diện Sáng / Tối**:
   - Nhấp vào icon Mặt trời / Mặt trăng ở góc trên bên phải màn hình đăng nhập hoặc trên thanh Topbar sau khi đăng nhập.
3. **Thao tác 4 phân hệ chính**:
   - Sử dụng thanh menu bên trái để chuyển đổi tức thì giữa **Công việc**, **Time KTV**, **Tra cứu Khách hàng** và **Thống kê SP Bán ra**.

---

## 📄 Bản Quyền (License)

Dự án được phân phối dưới giấy phép **MIT License**. Bạn có toàn quyền sử dụng, tùy chỉnh và triển khai cho mục đích thương mại hoặc nội bộ doanh nghiệp.

<div align="center">
  <sub>Được phát triển với niềm đam mê dành cho hệ sinh thái quản trị doanh nghiệp hiện đại.</sub>
</div>
