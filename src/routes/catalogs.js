const express = require('express');
const { getPool, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

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
    ] = await Promise.all([
      pool.request().query('SELECT idloaikhachhang, tenloaikhachhang FROM dbo.tblloaikhachhang ORDER BY tenloaikhachhang'),
      pool.request().query('SELECT idhinhthuckhachhang, ten FROM dbo.tblhinhthuckhachhang ORDER BY ten'),
      pool.request().query('SELECT idhinhthucchamsoc, tenhinhthuc FROM dbo.tblhinhthucchamsoc ORDER BY tenhinhthuc'),
      pool.request().query('SELECT iddanhgiakhachhang, tendanhgiakhachhang FROM dbo.tbldanhgiakhachhang ORDER BY tendanhgiakhachhang'),
      pool.request().query('SELECT idlydokhachhang, tenlydokhachhang FROM dbo.tbllydokhachhang ORDER BY tenlydokhachhang'),
      pool.request().query('SELECT idtrangthai, tentrangthai FROM dbo.tbltrangthai ORDER BY tentrangthai'),
      pool.request().query('SELECT idtrangthaitasklist, trangthai FROM dbo.tbltrangthaitasklist ORDER BY idtrangthaitasklist'),
      pool.request().query('SELECT idnhomdauvieclaptrinh, tendauviec, diem, dukiensogiolam FROM dbo.tblnhomdauvieclaptrinh WHERE issudung = 1 OR issudung IS NULL ORDER BY tendauviec'),
      pool.request().query('SELECT idtinhthanhpho, ten FROM dbo.tbltinhthanhpho ORDER BY ten'),
      pool.request().query('SELECT id, tenbophan, trangthaisudung FROM dbo.tblbophan ORDER BY tenbophan'),
      pool.request().query('SELECT idloaikhoanthu, tenkhoanthu, issudung FROM dbo.tblloaikhoanthu WHERE issudung = 1 OR issudung IS NULL ORDER BY tenkhoanthu'),
      pool.request().query('SELECT idloaikhoanchi, tenkhoanchi, issudung FROM dbo.tblloaikhoanchi WHERE issudung = 1 OR issudung IS NULL ORDER BY tenkhoanchi'),
      pool.request().query('SELECT idsanpham, sanpham, idloaikhachhang, dongia, giamgia, issudung FROM dbo.tblsanphamdichvu ORDER BY sanpham'),
      pool.request().query('SELECT idnhanvien, hoten, idbophan, issudung, isdanghicongtac FROM dbo.tblnhanvien WHERE issudung = 1 ORDER BY hoten'),
    ]);

    return res.json({
      loaiKhachHang: loaiKhachHang.recordset,
      hinhThucKhachHang: hinhThucKhachHang.recordset,
      hinhThucChamSoc: hinhThucChamSoc.recordset,
      danhGiaKhachHang: danhGiaKhachHang.recordset,
      lyDoKhachHang: lyDoKhachHang.recordset,
      trangThai: trangThai.recordset,
      trangThaiTasklist: trangThaiTasklist.recordset,
      nhomDauViecLapTrinh: nhomDauViecLapTrinh.recordset,
      tinhThanhPho: tinhThanhPho.recordset,
      boPhan: boPhan.recordset,
      loaiKhoanThu: loaiKhoanThu.recordset,
      loaiKhoanChi: loaiKhoanChi.recordset,
      sanPhamDichVu: sanPhamDichVu.recordset,
      nhanVien: nhanVien.recordset,
    });
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
