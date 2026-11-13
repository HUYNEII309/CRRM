const express = require('express');
const { getPool, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { generateNextId } = require('../utils/idGenerator');

const router = express.Router();
router.use(authMiddleware);

router.get('/catalog', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT sp.*, lkh.tenloaikhachhang
      FROM dbo.tblsanphamdichvu sp
      LEFT JOIN dbo.tblloaikhachhang lkh ON sp.idloaikhachhang = lkh.idloaikhachhang
      ORDER BY sp.sanpham
    `);
    return res.json(result.recordset);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/catalog', async (req, res) => {
  const b = req.body || {};
  if (!b.sanpham) {
    return res.status(400).json({ error: 'Tên sản phẩm/dịch vụ không được để trống.' });
  }
  try {
    const pool = await getPool();
    const idsanpham = await generateNextId(pool, 'tblsanphamdichvu', 'idsanpham');
    await pool
      .request()
      .input('idsanpham', sql.VarChar(12), idsanpham)
      .input('sanpham', sql.NVarChar(1000), b.sanpham)
      .input('idloaikhachhang', sql.VarChar(12), b.idloaikhachhang || null)
      .input('issudung', sql.TinyInt, b.issudung !== undefined ? Number(b.issudung) : 1)
      .input('dongia', sql.Decimal(18, 0), Number(b.dongia || 0))
      .input('giamgia', sql.Decimal(18, 0), Number(b.giamgia || 0))
      .query(`
        INSERT INTO dbo.tblsanphamdichvu (idsanpham, sanpham, idloaikhachhang, issudung, dongia, giamgia)
        VALUES (@idsanpham, @sanpham, @idloaikhachhang, @issudung, @dongia, @giamgia)
      `);
    return res.status(201).json({ idsanpham, message: 'Thêm sản phẩm dịch vụ thành công.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/packages', async (req, res) => {
  const { q = '', status = '' } = req.query;
  try {
    const pool = await getPool();
    const request = pool.request();
    const conditions = ['1=1'];

    if (q.trim()) {
      request.input('q', sql.NVarChar(250), `%${q.trim()}%`);
      conditions.push('(kh.tenkhachhang LIKE @q OR kh.dienthoai LIKE @q OR gdv.ghichu LIKE @q)');
    }
    if (status === 'expiring') {
      conditions.push('gdv.issudung = 1 AND gdv.ngayhethan >= CAST(GETDATE() AS DATE) AND gdv.ngayhethan <= DATEADD(day, 30, CAST(GETDATE() AS DATE))');
    } else if (status === 'expired') {
      conditions.push('gdv.issudung = 1 AND gdv.ngayhethan < CAST(GETDATE() AS DATE)');
    }

    const result = await request.query(`
      SELECT TOP 150 gdv.*, kh.tenkhachhang, kh.dienthoai,
             lkh.tenloaikhachhang, nv.hoten AS tennhanvien,
             DATEDIFF(day, CAST(GETDATE() AS DATE), CAST(gdv.ngayhethan AS DATE)) AS songayconlai
      FROM dbo.tblgoidichvu_hansudung gdv
      LEFT JOIN dbo.tblkhachhang kh ON gdv.idkhachhang = kh.idkhachhang
      LEFT JOIN dbo.tblloaikhachhang lkh ON gdv.idloaikhachhang = lkh.idloaikhachhang
      LEFT JOIN dbo.tblnhanvien nv ON gdv.idnhanvien = nv.idnhanvien
      WHERE ${conditions.join(' AND ')}
      ORDER BY gdv.ngayhethan ASC
    `);
    return res.json(result.recordset);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/packages', async (req, res) => {
  const b = req.body || {};
  if (!b.idkhachhang) {
    return res.status(400).json({ error: 'Vui lòng chọn khách hàng.' });
  }
  try {
    const pool = await getPool();
    const idgoidichvu = await generateNextId(pool, 'tblgoidichvu_hansudung', 'idgoidichvu');
    await pool
      .request()
      .input('idgoidichvu', sql.VarChar(12), idgoidichvu)
      .input('idkhachhang', sql.VarChar(12), b.idkhachhang)
      .input('idnhanvien', sql.VarChar(12), b.idnhanvien || req.user.idnhanvien)
      .input('idloaikhachhang', sql.VarChar(12), b.idloaikhachhang || null)
      .input('ngaybatdau', sql.DateTime, b.ngaybatdau ? new Date(b.ngaybatdau) : new Date())
      .input('ngayhethan', sql.DateTime, b.ngayhethan ? new Date(b.ngayhethan) : new Date())
      .input('tongsotiendathu', sql.Decimal(18, 0), Number(b.tongsotiendathu || 0))
      .input('sonamgiahan', sql.Int, Number(b.sonamgiahan || 1))
      .input('ghichu', sql.NVarChar(500), b.ghichu || null)
      .input('phidongtieptheo', sql.Decimal(18, 0), Number(b.phidongtieptheo || 0))
      .input('issudung', sql.Bit, b.issudung === false ? 0 : 1)
      .query(`
        INSERT INTO dbo.tblgoidichvu_hansudung (
          idgoidichvu, idkhachhang, idnhanvien, idloaikhachhang,
          ngaybatdau, ngayhethan, tongsotiendathu, sonamgiahan,
          ghichu, phidongtieptheo, issudung
        )
        VALUES (
          @idgoidichvu, @idkhachhang, @idnhanvien, @idloaikhachhang,
          @ngaybatdau, @ngayhethan, @tongsotiendathu, @sonamgiahan,
          @ghichu, @phidongtieptheo, @issudung
        )
      `);
    return res.status(201).json({ idgoidichvu, message: 'Đăng ký gói dịch vụ thành công.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
