const express = require('express');
const { getPool, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

async function runSafe(pool, spName, fallbackQuery, inputParams = {}) {
  try {
    const req = pool.request();
    for (const [k, v] of Object.entries(inputParams)) {
      req.input(k, v);
    }
    const res = await req.execute(spName);
    if (res.recordset && res.recordset.length > 0) return res.recordset;
  } catch (err) {
    console.warn(`Lỗi execute SP ${spName}, fallback sang query:`, err.message);
  }

  if (fallbackQuery) {
    try {
      const req = pool.request();
      for (const [k, v] of Object.entries(inputParams)) {
        req.input(k, v);
      }
      const res = await req.query(fallbackQuery);
      return res.recordset || [];
    } catch (fbErr) {
      console.warn(`Lỗi query fallback cho ${spName}:`, fbErr.message);
    }
  }
  return [];
}

router.get('/all', async (req, res) => {
  try {
    const pool = await getPool();
    const [
      loaiKhachHang,
      hinhThucKhachHang,
      hinhThucChamSoc,
      danhGiaKhachHang,
      lyDoKhachHang,
      trangThai,
      trangThaiTasklist,
      nhomDauViecLapTrinh,
      tinhThanhPho,
      boPhan,
      loaiKhoanThu,
      loaiKhoanChi,
      sanPhamDichVu,
      nhanVien,
      danhmucDauViecCoDinh,
      nhanVienKyThuat,
    ] = await Promise.all([
      runSafe(pool, 'dbo.tblloaikhachhang_SelectAll', 'SELECT idloaikhachhang, tenloaikhachhang FROM dbo.tblloaikhachhang ORDER BY tenloaikhachhang'),
      pool.request().query('SELECT idhinhthuckhachhang, ten FROM dbo.tblhinhthuckhachhang ORDER BY ten').then(r => r.recordset).catch(() => []),
      pool.request().query('SELECT idhinhthucchamsoc, tenhinhthuc FROM dbo.tblhinhthucchamsoc ORDER BY tenhinhthuc').then(r => r.recordset).catch(() => []),
      pool.request().query('SELECT iddanhgiakhachhang, tendanhgiakhachhang FROM dbo.tbldanhgiakhachhang ORDER BY tendanhgiakhachhang').then(r => r.recordset).catch(() => []),
      pool.request().query('SELECT idlydokhachhang, tenlydokhachhang FROM dbo.tbllydokhachhang ORDER BY tenlydokhachhang').then(r => r.recordset).catch(() => []),
      pool.request().query('SELECT idtrangthai, tentrangthai FROM dbo.tbltrangthai ORDER BY tentrangthai').then(r => r.recordset).catch(() => []),
      pool.request().query('SELECT idtrangthaitasklist, trangthai FROM dbo.tbltrangthaitasklist ORDER BY idtrangthaitasklist').then(r => r.recordset).catch(() => []),
      runSafe(pool, 'dbo.tblnhomdauvieclaptrinh_SelectAll', "SELECT idnhomdauvieclaptrinh, (tendauviec + ' [' + CAST(ISNULL(dukiensogiolam, 0) AS NVARCHAR(50)) + 'h] -> ' + ISNULL(mota, '')) AS tendauviec, dukiensogiolam, diem FROM dbo.tblnhomdauvieclaptrinh WHERE issudung = 1 OR issudung IS NULL ORDER BY madauviec ASC"),
      pool.request().query('SELECT idtinhthanhpho, ten FROM dbo.tbltinhthanhpho ORDER BY ten').then(r => r.recordset).catch(() => []),
      pool.request().query('SELECT id, tenbophan, trangthaisudung FROM dbo.tblbophan ORDER BY tenbophan').then(r => r.recordset).catch(() => []),
      pool.request().query('SELECT idloaikhoanthu, tenkhoanthu, issudung FROM dbo.tblloaikhoanthu WHERE issudung = 1 OR issudung IS NULL ORDER BY tenkhoanthu').then(r => r.recordset).catch(() => []),
      pool.request().query('SELECT idloaikhoanchi, tenkhoanchi, issudung FROM dbo.tblloaikhoanchi WHERE issudung = 1 OR issudung IS NULL ORDER BY tenkhoanchi').then(r => r.recordset).catch(() => []),
      pool.request().query('SELECT idsanpham, sanpham, idloaikhachhang, dongia, giamgia, issudung FROM dbo.tblsanphamdichvu ORDER BY sanpham').then(r => r.recordset).catch(() => []),
      pool.request().query('SELECT idnhanvien, hoten, idbophan, issudung, isdanghicongtac FROM dbo.tblnhanvien WHERE issudung = 1 ORDER BY hoten').then(r => r.recordset).catch(() => []),
      runSafe(pool, 'dbo.tbldanhmucdauvieccodinh_SelectAll_CoSuDung', "SELECT iddanhmucdauviec, madauviec, (CAST(madauviec AS NVARCHAR(50)) + '. ' + tendauviec) AS tendauviec, diem, dukiensogiolam FROM dbo.tbldanhmucdauvieccodinh WHERE issudung = 1 ORDER BY madauviec ASC"),
      runSafe(pool, 'dbo.tblnhanvien_SelectAll_ConCongTac_KyThuat', "SELECT nv.idnhanvien, nv.hoten, bp.tenbophan FROM dbo.tblnhanvien nv LEFT JOIN dbo.tblbophan bp ON nv.idbophan = bp.id WHERE (nv.issudung = 1 OR nv.issudung IS NULL) AND (nv.isdanghicongtac = 0 OR nv.isdanghicongtac IS NULL) ORDER BY nv.hoten ASC"),
    ]);

    // Nếu nhanVienKyThuat rỗng (ví dụ chưa gán bộ phận kỹ thuật), fallback về danh sách nhân viên chung
    const finalNhanVienKyThuat = (nhanVienKyThuat && nhanVienKyThuat.length > 0) ? nhanVienKyThuat : (nhanVien || []);

    return res.json({
      loaiKhachHang: loaiKhachHang || [],
      hinhThucKhachHang: hinhThucKhachHang || [],
      hinhThucChamSoc: hinhThucChamSoc || [],
      danhGiaKhachHang: danhGiaKhachHang || [],
      lyDoKhachHang: lyDoKhachHang || [],
      trangThai: trangThai || [],
      trangThaiTasklist: trangThaiTasklist || [],
      nhomDauViecLapTrinh: nhomDauViecLapTrinh || [],
      tinhThanhPho: tinhThanhPho || [],
      boPhan: boPhan || [],
      loaiKhoanThu: loaiKhoanThu || [],
      loaiKhoanChi: loaiKhoanChi || [],
      sanPhamDichVu: sanPhamDichVu || [],
      nhanVien: nhanVien || [],
      danhmucDauViecCoDinh: danhmucDauViecCoDinh || [],
      nhanVienKyThuat: finalNhanVienKyThuat,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Chạy Stored Procedure tblloaikhachhang_SelectAll để lấy danh sách Loại sản phẩm / dịch vụ
router.get('/loaikhachhang', async (req, res) => {
  try {
    const pool = await getPool();
    const data = await runSafe(
      pool,
      'dbo.tblloaikhachhang_SelectAll',
      'SELECT idloaikhachhang, tenloaikhachhang FROM dbo.tblloaikhachhang ORDER BY tenloaikhachhang'
    );
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Chạy Stored Procedure tbldanhmucdauvieccodinh_SelectAll_CoSuDung để lấy danh mục đầu việc cố định có sử dụng
router.get('/danhmucdauvieccodinh', async (req, res) => {
  try {
    const pool = await getPool();
    const data = await runSafe(
      pool,
      'dbo.tbldanhmucdauvieccodinh_SelectAll_CoSuDung',
      "SELECT iddanhmucdauviec, madauviec, (CAST(madauviec AS NVARCHAR(50)) + '. ' + tendauviec) AS tendauviec, diem, dukiensogiolam FROM dbo.tbldanhmucdauvieccodinh WHERE issudung = 1 ORDER BY madauviec ASC"
    );
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Chạy Stored Procedure tblnhanvien_SelectAll_ConCongTac_KyThuat để lấy nhân viên kỹ thuật còn công tác
router.get('/nhanvien-kythuat', async (req, res) => {
  try {
    const pool = await getPool();
    let data = await runSafe(
      pool,
      'dbo.tblnhanvien_SelectAll_ConCongTac_KyThuat',
      "SELECT nv.idnhanvien, nv.hoten, bp.tenbophan FROM dbo.tblnhanvien nv INNER JOIN dbo.tblbophan bp ON nv.idbophan = bp.id WHERE nv.issudung = 1 AND (nv.isdanghicongtac = 0 OR nv.isdanghicongtac IS NULL) AND bp.id = 2 ORDER BY nv.hoten ASC"
    );
    if (!data || data.length === 0) {
      // Fallback lấy toàn bộ nhân viên còn công tác
      const fb = await pool.request().query("SELECT idnhanvien, hoten FROM dbo.tblnhanvien WHERE (issudung = 1 OR issudung IS NULL) AND (isdanghicongtac = 0 OR isdanghicongtac IS NULL) ORDER BY hoten ASC");
      data = fb.recordset || [];
    }
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Chạy Stored Procedure tblnhomdauvieclaptrinh_SelectAll để lấy nhóm việc lập trình / kỹ thuật
router.get('/nhomdauvieclaptrinh', async (req, res) => {
  try {
    const pool = await getPool();
    const data = await runSafe(
      pool,
      'dbo.tblnhomdauvieclaptrinh_SelectAll',
      "SELECT idnhomdauvieclaptrinh, (tendauviec + ' [' + CAST(ISNULL(dukiensogiolam, 0) AS NVARCHAR(50)) + 'h] -> ' + ISNULL(mota, '')) AS tendauviec, dukiensogiolam, diem FROM dbo.tblnhomdauvieclaptrinh WHERE issudung = 1 OR issudung IS NULL ORDER BY madauviec ASC"
    );
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Chạy Stored Procedure tblnhomdauvieclaptrinh_SelectAll_ByID để lấy chi tiết 1 nhóm việc (điểm, dự kiến số giờ làm)
router.get('/nhomdauvieclaptrinh/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const id = req.params.id;
    let data = await runSafe(
      pool,
      'dbo.tblnhomdauvieclaptrinh_SelectAll_ByID',
      'SELECT * FROM dbo.tblnhomdauvieclaptrinh WHERE idnhomdauvieclaptrinh = @idnhomdauvieclaptrinh',
      { idnhomdauvieclaptrinh: id }
    );

    // Nếu không tìm thấy trong tblnhomdauvieclaptrinh, thử tìm trong tbldanhmucdauvieccodinh
    if (!data || data.length === 0) {
      data = await runSafe(
        pool,
        'dbo.tbldanhmucdauvieccodinh_SelectAll_ByID',
        'SELECT * FROM dbo.tbldanhmucdauvieccodinh WHERE iddanhmucdauviec = @iddauviec',
        { iddauviec: id }
      );
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin đầu việc.' });
    }
    return res.json(data[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/quanhuyen/:idtinhthanhpho', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('idtinhthanhpho', sql.VarChar(12), req.params.idtinhthanhpho)
      .query('SELECT idquanhuyen, ten, idtinhthanhpho FROM dbo.tblquanhuyen WHERE idtinhthanhpho = @idtinhthanhpho ORDER BY ten');
    return res.json(result.recordset);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/phuongxa/:idquanhuyen', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('idquanhuyen', sql.VarChar(12), req.params.idquanhuyen)
      .query('SELECT idphuongxa, ten, idquanhuyen, idtinhthanhpho FROM dbo.tblphuongxa WHERE idquanhuyen = @idquanhuyen ORDER BY ten');
    return res.json(result.recordset);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
