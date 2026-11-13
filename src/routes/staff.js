const express = require('express');
const { getPool, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { generateNextId } = require('../utils/idGenerator');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT nv.idnhanvien, nv.hoten, nv.dienthoai, nv.email, nv.ghichu,
             nv.tendangnhap, nv.idbophan, bp.tenbophan, nv.issudung, nv.isdanghicongtac
      FROM dbo.tblnhanvien nv
      LEFT JOIN dbo.tblbophan bp ON nv.idbophan = bp.id
      ORDER BY nv.issudung DESC, nv.hoten ASC
    `);
    return res.json(result.recordset);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.hoten || !b.tendangnhap || !b.matkhau) {
    return res.status(400).json({ error: 'Vui lòng nhập họ tên, tên đăng nhập và mật khẩu.' });
  }
  try {
    const pool = await getPool();
    const dup = await pool
      .request()
      .input('tendangnhap', sql.NVarChar(50), b.tendangnhap.trim())
      .query('SELECT idnhanvien FROM dbo.tblnhanvien WHERE tendangnhap = @tendangnhap');
    if (dup.recordset.length > 0) {
      return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại.' });
    }

    const idnhanvien = await generateNextId(pool, 'tblnhanvien', 'idnhanvien');
    await pool
      .request()
      .input('idnhanvien', sql.VarChar(12), idnhanvien)
      .input('hoten', sql.NVarChar(50), b.hoten)
      .input('dienthoai', sql.NVarChar(50), b.dienthoai || null)
      .input('email', sql.NVarChar(50), b.email || null)
      .input('ghichu', sql.NVarChar(250), b.ghichu || null)
      .input('tendangnhap', sql.NVarChar(50), b.tendangnhap.trim())
      .input('matkhau', sql.NVarChar(50), b.matkhau)
      .input('idbophan', sql.Int, b.idbophan ? Number(b.idbophan) : null)
      .input('issudung', sql.TinyInt, 1)
      .input('isdanghicongtac', sql.Bit, 0)
      .query(`
        INSERT INTO dbo.tblnhanvien (
          idnhanvien, hoten, dienthoai, email, ghichu,
          tendangnhap, matkhau, idbophan, issudung, isdanghicongtac
        )
        VALUES (
          @idnhanvien, @hoten, @dienthoai, @email, @ghichu,
          @tendangnhap, @matkhau, @idbophan, @issudung, @isdanghicongtac
        )
      `);

    return res.status(201).json({ idnhanvien, message: 'Thêm nhân viên thành công.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/login-history', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 100 Id, TaiKhoan, ThoiGian, DiaChiIP, ThietBi, TrangThai
      FROM dbo.LichSuDangNhap
      ORDER BY ThoiGian DESC
    `);
    return res.json(result.recordset);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
