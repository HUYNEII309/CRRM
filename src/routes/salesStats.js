const express = require('express');
const { getPool, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * Tính khoảng ngày mặc định (đầu tháng đến cuối tháng hiện tại)
 */
function getDefaultDates() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);

  const fmt = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    from: fmt(first),
    to: fmt(last),
  };
}

/**
 * GET /api/sales-stats/products
 * Stored Procedure: dbo.tblkhoanthu_ThongKeSanPhamBanRa (@tungay, @denngay)
 * Thống kê sản phẩm / dịch vụ đã bán ra
 */
router.get('/products', async (req, res) => {
  const defs = getDefaultDates();
  const from = req.query.from || defs.from;
  const to = req.query.to || defs.to;

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('tungay', sql.Date, from);
    request.input('denngay', sql.Date, to);

    let rows = [];
    try {
      const result = await request.execute('dbo.tblkhoanthu_ThongKeSanPhamBanRa');
      rows = result.recordset || [];
    } catch (spErr) {
      console.warn('Lỗi execute tblkhoanthu_ThongKeSanPhamBanRa, fallback SQL:', spErr.message);
      const fallbackQuery = `
        SELECT distinct(dbo.tblloaikhachhang.idloaikhachhang), dbo.tblloaikhachhang.tenloaikhachhang,
               dbo.tblkhachhang.idkhachhang, SUM(tblkhoanthu.sotien) as sotien
        INTO #TempThongKeKH
        FROM dbo.tblkhachhang
        INNER JOIN dbo.tblkhoanthu ON dbo.tblkhachhang.idkhachhang = dbo.tblkhoanthu.idkhachhang
        INNER JOIN dbo.tblloaikhachhang ON dbo.tblkhachhang.idloaikhachhang = dbo.tblloaikhachhang.idloaikhachhang
        WHERE convert(date, dbo.tblkhoanthu.thoigianthu) >= @tungay
          AND convert(date, dbo.tblkhoanthu.thoigianthu) <= @denngay
          AND dbo.tblkhoanthu.idloaikhoanthu = 1
        GROUP BY dbo.tblloaikhachhang.idloaikhachhang, dbo.tblloaikhachhang.tenloaikhachhang, dbo.tblkhachhang.idkhachhang;

        SELECT idloaikhachhang, tenloaikhachhang, COUNT(idkhachhang) as soluong, SUM(sotien) as sotien
        FROM #TempThongKeKH
        GROUP BY idloaikhachhang, tenloaikhachhang
        ORDER BY soluong desc;

        DROP TABLE #TempThongKeKH;
      `;
      const queryRes = await request.query(fallbackQuery);
      rows = queryRes.recordset || [];
    }

    const items = rows.map((r, idx) => ({
      stt: idx + 1,
      idloaikhachhang: r.idloaikhachhang,
      tenloaikhachhang: r.tenloaikhachhang || 'Chưa phân loại',
      soluong: Number(r.soluong || 0),
      sotien: Number(r.sotien || 0),
    }));

    const totalSoluong = items.reduce((sum, i) => sum + i.soluong, 0);
    const totalSotien = items.reduce((sum, i) => sum + i.sotien, 0);

    return res.json({
      from,
      to,
      totalSoluong,
      totalSotien,
      items,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sales-stats/staff
 * Stored Procedure: dbo.tblnhanvien_SelectByDate_DoanhSoHienTai (@tungay, @denngay)
 * Doanh số hiện tại theo từng nhân viên
 */
router.get('/staff', async (req, res) => {
  const defs = getDefaultDates();
  const from = req.query.from || defs.from;
  const to = req.query.to || defs.to;

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('tungay', sql.Date, from);
    request.input('denngay', sql.Date, to);

    let rows = [];
    try {
      const result = await request.execute('dbo.tblnhanvien_SelectByDate_DoanhSoHienTai');
      rows = result.recordset || [];
    } catch (spErr) {
      console.warn('Lỗi execute tblnhanvien_SelectByDate_DoanhSoHienTai, fallback SQL:', spErr.message);
      const fallbackQuery = `
        SELECT dbo.tblnhanvien.idnhanvien, dbo.tblnhanvien.hoten, isnull(sum(dbo.tblkhoanthu.sotien), 0) as doanhso
        FROM dbo.tblnhanvien
        INNER JOIN dbo.tblkhoanthu ON dbo.tblkhoanthu.idnhanvienthu = dbo.tblnhanvien.idnhanvien
        WHERE dbo.tblnhanvien.isdanghicongtac = 0
          AND CONVERT(date, dbo.tblkhoanthu.thoigianthu) >= @tungay
          AND CONVERT(date, dbo.tblkhoanthu.thoigianthu) <= @denngay
        GROUP BY dbo.tblnhanvien.idnhanvien, dbo.tblnhanvien.hoten
        ORDER BY sum(dbo.tblkhoanthu.sotien) DESC
      `;
      const queryRes = await request.query(fallbackQuery);
      rows = queryRes.recordset || [];
    }

    const items = rows.map((r, idx) => ({
      stt: idx + 1,
      idnhanvien: r.idnhanvien,
      hoten: r.hoten || 'Chưa đặt tên',
      doanhso: Number(r.doanhso || 0),
    }));

    const totalDoanhso = items.reduce((sum, i) => sum + i.doanhso, 0);

    return res.json({
      from,
      to,
      totalDoanhso,
      items,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sales-stats/detail-by-product
 * Stored Procedure: dbo.tblkhoanthu_ThongKeChiTietSanPhamBanRa (@tungay, @denngay, @idloaikhachhang)
 * Chi tiết khách hàng đã mua theo sản phẩm / dịch vụ
 */
router.get('/detail-by-product', async (req, res) => {
  const { idloaikhachhang } = req.query;
  const defs = getDefaultDates();
  const from = req.query.from || defs.from;
  const to = req.query.to || defs.to;

  if (!idloaikhachhang) {
    return res.status(400).json({ error: 'Cần cung cấp mã loại khách hàng / sản phẩm (idloaikhachhang).' });
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('tungay', sql.Date, from);
    request.input('denngay', sql.Date, to);
    request.input('idloaikhachhang', sql.VarChar(12), idloaikhachhang);

    let rows = [];
    try {
      const result = await request.execute('dbo.tblkhoanthu_ThongKeChiTietSanPhamBanRa');
      rows = result.recordset || [];
    } catch (spErr) {
      console.warn('Lỗi execute tblkhoanthu_ThongKeChiTietSanPhamBanRa, fallback SQL:', spErr.message);
      const fallbackQuery = `
        SELECT distinct(dbo.tblkhachhang.idkhachhang), dbo.tblkhachhang.tenkhachhang,		  
               dbo.tblkhachhang.diachi, SUM(tblkhoanthu.sotien) as sotien
        FROM dbo.tblkhachhang
        INNER JOIN dbo.tblkhoanthu ON dbo.tblkhachhang.idkhachhang = dbo.tblkhoanthu.idkhachhang 
        WHERE convert(date, dbo.tblkhoanthu.thoigianthu) >= @tungay
          AND convert(date, dbo.tblkhoanthu.thoigianthu) <= @denngay
          AND dbo.tblkhoanthu.idloaikhoanthu = 1
          AND dbo.tblkhachhang.idloaikhachhang = @idloaikhachhang
        GROUP BY dbo.tblkhachhang.idkhachhang, dbo.tblkhachhang.tenkhachhang, dbo.tblkhachhang.diachi
      `;
      const queryRes = await request.query(fallbackQuery);
      rows = queryRes.recordset || [];
    }

    const items = rows.map((r, idx) => ({
      stt: idx + 1,
      idkhachhang: r.idkhachhang,
      tenkhachhang: r.tenkhachhang || 'Khách hàng',
      diachi: r.diachi || '',
      sotien: Number(r.sotien || 0),
    }));

    const totalSotien = items.reduce((sum, i) => sum + i.sotien, 0);

    return res.json({
      from,
      to,
      idloaikhachhang,
      totalSotien,
      totalCount: items.length,
      items,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sales-stats/detail-by-staff
 * Stored Procedure: dbo.tblkhoanthu_ThongKeChiTietSanPhamBanRa_TheoNhanVien (@tungay, @denngay, @idnhanvien)
 * Chi tiết khách hàng đã mua theo nhân viên
 */
router.get('/detail-by-staff', async (req, res) => {
  const { idnhanvien } = req.query;
  const defs = getDefaultDates();
  const from = req.query.from || defs.from;
  const to = req.query.to || defs.to;

  if (!idnhanvien) {
    return res.status(400).json({ error: 'Cần cung cấp mã nhân viên (idnhanvien).' });
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('tungay', sql.Date, from);
    request.input('denngay', sql.Date, to);
    request.input('idnhanvien', sql.VarChar(12), idnhanvien);

    let rows = [];
    try {
      const result = await request.execute('dbo.tblkhoanthu_ThongKeChiTietSanPhamBanRa_TheoNhanVien');
      rows = result.recordset || [];
    } catch (spErr) {
      console.warn('Lỗi execute tblkhoanthu_ThongKeChiTietSanPhamBanRa_TheoNhanVien, fallback SQL:', spErr.message);
      const fallbackQuery = `
        SELECT distinct(dbo.tblkhachhang.idkhachhang), dbo.tblkhachhang.tenkhachhang,		  
               dbo.tblkhachhang.diachi, SUM(tblkhoanthu.sotien) as sotien
        FROM dbo.tblkhachhang
        INNER JOIN dbo.tblkhoanthu ON dbo.tblkhachhang.idkhachhang = dbo.tblkhoanthu.idkhachhang 
        WHERE convert(date, dbo.tblkhoanthu.thoigianthu) >= @tungay
          AND convert(date, dbo.tblkhoanthu.thoigianthu) <= @denngay
          AND dbo.tblkhoanthu.idnhanvienthu = @idnhanvien
        GROUP BY dbo.tblkhachhang.idkhachhang, dbo.tblkhachhang.tenkhachhang, dbo.tblkhachhang.diachi
      `;
      const queryRes = await request.query(fallbackQuery);
      rows = queryRes.recordset || [];
    }

    const items = rows.map((r, idx) => ({
      stt: idx + 1,
      idkhachhang: r.idkhachhang,
      tenkhachhang: r.tenkhachhang || 'Khách hàng',
      diachi: r.diachi || '',
      sotien: Number(r.sotien || 0),
    }));

    const totalSotien = items.reduce((sum, i) => sum + i.sotien, 0);

    return res.json({
      from,
      to,
      idnhanvien,
      totalSotien,
      totalCount: items.length,
      items,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
