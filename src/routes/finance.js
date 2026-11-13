const express = require('express');
const { getPool, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/summary', async (req, res) => {
  const { from = '', to = '' } = req.query;
  try {
    const pool = await getPool();
    const request = pool.request();
    let dateFilterThu = 'MONTH(thoigianthu) = MONTH(GETDATE()) AND YEAR(thoigianthu) = YEAR(GETDATE())';
    let dateFilterChi = 'MONTH(thoigianchi) = MONTH(GETDATE()) AND YEAR(thoigianchi) = YEAR(GETDATE())';

    if (from && to) {
      request.input('from', sql.Date, from);
      request.input('to', sql.Date, to);
      dateFilterThu = 'CAST(thoigianthu AS DATE) >= @from AND CAST(thoigianthu AS DATE) <= @to';
      dateFilterChi = 'CAST(thoigianchi AS DATE) >= @from AND CAST(thoigianchi AS DATE) <= @to';
    }

    const [thuRes, chiRes, byStaffRes] = await Promise.all([
      request.query(`SELECT ISNULL(SUM(sotien), 0) AS tongThu FROM dbo.tblkhoanthu WHERE ${dateFilterThu}`),
      pool.request().input('from', sql.Date, from || null).input('to', sql.Date, to || null)
        .query(`SELECT ISNULL(SUM(sotien), 0) AS tongChi FROM dbo.tblkhoanchi WHERE ${dateFilterChi}`),
      pool.request().input('from', sql.Date, from || null).input('to', sql.Date, to || null).query(`
        SELECT nv.idnhanvien, nv.hoten, ISNULL(SUM(kt.sotien), 0) AS doanhThu, COUNT(kt.idkhoanthu) AS soPhieu
        FROM dbo.tblkhoanthu kt
        LEFT JOIN dbo.tblnhanvien nv ON kt.idnhanvienthu = nv.idnhanvien
        WHERE ${dateFilterThu}
        GROUP BY nv.idnhanvien, nv.hoten
        ORDER BY doanhThu DESC
      `),
    ]);

    const tongThu = thuRes.recordset[0]?.tongThu || 0;
    const tongChi = chiRes.recordset[0]?.tongChi || 0;

    return res.json({
      tongThu,
      tongChi,
      chenhLech: tongThu - tongChi,
      doanhThuTheoNhanVien: byStaffRes.recordset,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/receipts', async (req, res) => {
  const { q = '' } = req.query;
  try {
    const pool = await getPool();
    const request = pool.request();
    let where = '1=1';
    if (q.trim()) {
      request.input('q', sql.NVarChar(250), `%${q.trim()}%`);
      where = '(kt.noidung LIKE @q OR kt.nguoinop LIKE @q OR kh.tenkhachhang LIKE @q)';
    }

    const result = await request.query(`
      SELECT TOP 150 kt.*, lkt.tenkhoanthu, nv.hoten AS tennhanvienthu, kh.tenkhachhang
      FROM dbo.tblkhoanthu kt
      LEFT JOIN dbo.tblloaikhoanthu lkt ON kt.idloaikhoanthu = lkt.idloaikhoanthu
      LEFT JOIN dbo.tblnhanvien nv ON kt.idnhanvienthu = nv.idnhanvien
      LEFT JOIN dbo.tblkhachhang kh ON kt.idkhachhang = kh.idkhachhang
      WHERE ${where}
      ORDER BY kt.thoigianthu DESC, kt.idkhoanthu DESC
    `);
    return res.json(result.recordset);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/receipts', async (req, res) => {
  const b = req.body || {};
  if (!b.sotien) {
    return res.status(400).json({ error: 'Số tiền thu không được để trống.' });
  }
  try {
    const pool = await getPool();
    await pool
      .request()
      .input('idloaikhoanthu', sql.BigInt, b.idloaikhoanthu ? Number(b.idloaikhoanthu) : null)
      .input('thoigianthu', sql.DateTime, b.thoigianthu ? new Date(b.thoigianthu) : new Date())
      .input('noidung', sql.NVarChar(2000), b.noidung || null)
      .input('nguoinop', sql.NVarChar(200), b.nguoinop || null)
      .input('diachinguoinop', sql.NVarChar(200), b.diachinguoinop || null)
      .input('sodienthoai', sql.VarChar(50), b.sodienthoai || null)
      .input('sotien', sql.Decimal(18, 0), Number(b.sotien))
      .input('idnhanvienthu', sql.VarChar(12), b.idnhanvienthu || req.user.idnhanvien)
      .input('thutienno', sql.Bit, b.thutienno ? 1 : 0)
      .input('hinhthucthutien', sql.TinyInt, b.hinhthucthutien ? Number(b.hinhthucthutien) : 1)
      .input('idkhachhang', sql.VarChar(12), b.idkhachhang || null)
      .input('personadd', sql.VarChar(12), req.user.idnhanvien)
      .query(`
        INSERT INTO dbo.tblkhoanthu (
          idloaikhoanthu, thoigianthu, noidung, nguoinop, diachinguoinop,
          sodienthoai, sotien, idnhanvienthu, thutienno, hinhthucthutien,
          idkhachhang, dateadd, personadd
        )
        VALUES (
          @idloaikhoanthu, @thoigianthu, @noidung, @nguoinop, @diachinguoinop,
          @sodienthoai, @sotien, @idnhanvienthu, @thutienno, @hinhthucthutien,
          @idkhachhang, GETDATE(), @personadd
        )
      `);
    return res.status(201).json({ ok: true, message: 'Tạo phiếu thu thành công.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/expenses', async (req, res) => {
  const { q = '' } = req.query;
  try {
    const pool = await getPool();
    const request = pool.request();
    let where = '1=1';
    if (q.trim()) {
      request.input('q', sql.NVarChar(250), `%${q.trim()}%`);
      where = '(kc.noidung LIKE @q OR kc.nguoinhan LIKE @q)';
    }

    const result = await request.query(`
      SELECT TOP 150 kc.*, lkc.tenkhoanchi, nv.hoten AS tennhanvienchi
      FROM dbo.tblkhoanchi kc
      LEFT JOIN dbo.tblloaikhoanchi lkc ON kc.idloaikhoanchi = lkc.idloaikhoanchi
      LEFT JOIN dbo.tblnhanvien nv ON kc.idnhanvienchi = nv.idnhanvien
      WHERE ${where}
      ORDER BY kc.thoigianchi DESC, kc.idkhoanchi DESC
    `);
    return res.json(result.recordset);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/expenses', async (req, res) => {
  const b = req.body || {};
  if (!b.sotien) {
    return res.status(400).json({ error: 'Số tiền chi không được để trống.' });
  }
  try {
    const pool = await getPool();
    await pool
      .request()
      .input('idloaikhoanchi', sql.BigInt, b.idloaikhoanchi ? Number(b.idloaikhoanchi) : null)
      .input('thoigianchi', sql.DateTime, b.thoigianchi ? new Date(b.thoigianchi) : new Date())
      .input('noidung', sql.NVarChar(2000), b.noidung || null)
      .input('nguoinhan', sql.NVarChar(200), b.nguoinhan || null)
      .input('diachinguoinhan', sql.NVarChar(200), b.diachinguoinhan || null)
      .input('sodienthoai', sql.VarChar(50), b.sodienthoai || null)
      .input('sotien', sql.Decimal(18, 0), Number(b.sotien))
      .input('idnhanvienchi', sql.VarChar(12), b.idnhanvienchi || req.user.idnhanvien)
      .query(`
        INSERT INTO dbo.tblkhoanchi (
          idloaikhoanchi, thoigianchi, noidung, nguoinhan,
          diachinguoinhan, sodienthoai, sotien, idnhanvienchi
        )
        VALUES (
          @idloaikhoanchi, @thoigianchi, @noidung, @nguoinhan,
          @diachinguoinhan, @sodienthoai, @sotien, @idnhanvienchi
        )
      `);
    return res.status(201).json({ ok: true, message: 'Tạo phiếu chi thành công.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
