const express = require('express');
const { getPool, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { generateNextId } = require('../utils/idGenerator');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { q = '', idnhanvien = '', trangthaixuly = '', from = '', to = '' } = req.query;
  try {
    const pool = await getPool();
    const request = pool.request();
    const conditions = ['1=1'];

    if (q.trim()) {
      request.input('q', sql.NVarChar(250), `%${q.trim()}%`);
      conditions.push('(kh.tenkhachhang LIKE @q OR lh.noidunghen LIKE @q OR lh.dienthoaihen LIKE @q)');
    }
    if (idnhanvien) {
      request.input('idnhanvien', sql.VarChar(12), idnhanvien);
      conditions.push('(lh.idnhanvien = @idnhanvien OR lh.idnguoiduocgiao = @idnhanvien)');
    }
    if (trangthaixuly === '0') {
      conditions.push('(lh.trangthaixuly = 0 OR lh.trangthaixuly IS NULL)');
    } else if (trangthaixuly === '1') {
      conditions.push('lh.trangthaixuly = 1');
    }
    if (from) {
      request.input('from', sql.Date, from);
      conditions.push('lh.ngayhen >= @from');
    }
    if (to) {
      request.input('to', sql.Date, to);
      conditions.push('lh.ngayhen <= @to');
    }

    const result = await request.query(`
      SELECT TOP 100 lh.*, kh.tenkhachhang, kh.dienthoai,
             nv1.hoten AS tennguoitao, nv2.hoten AS tennguoiduocgiao
      FROM dbo.tbllichhen lh
      LEFT JOIN dbo.tblkhachhang kh ON lh.idkhachhang = kh.idkhachhang
      LEFT JOIN dbo.tblnhanvien nv1 ON lh.idnhanvien = nv1.idnhanvien
      LEFT JOIN dbo.tblnhanvien nv2 ON lh.idnguoiduocgiao = nv2.idnhanvien
      WHERE ${conditions.join(' AND ')}
      ORDER BY lh.ngayhen DESC, lh.giohen ASC
    `);

    return res.json(result.recordset);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.ngayhen || !b.noidunghen) {
    return res.status(400).json({ error: 'Vui lòng nhập ngày hẹn và nội dung hẹn.' });
  }
  try {
    const pool = await getPool();
    const idlichhen = await generateNextId(pool, 'tbllichhen', 'idlichhen');

    await pool
      .request()
      .input('idlichhen', sql.VarChar(12), idlichhen)
      .input('ngayhen', sql.Date, b.ngayhen)
      .input('giohen', sql.NVarChar(50), b.giohen || null)
      .input('noidunghen', sql.NVarChar(2000), b.noidunghen)
      .input('idkhachhang', sql.VarChar(12), b.idkhachhang || null)
      .input('idnhanvien', sql.VarChar(12), req.user.idnhanvien)
      .input('idnguoiduocgiao', sql.VarChar(12), b.idnguoiduocgiao || req.user.idnhanvien)
      .input('dienthoaihen', sql.VarChar(50), b.dienthoaihen || null)
      .input('trangthaixuly', sql.Bit, b.trangthaixuly ? 1 : 0)
      .query(`
        INSERT INTO dbo.tbllichhen (
          idlichhen, ngayhen, giohen, noidunghen, idkhachhang,
          idnhanvien, trangthaixuly, idnguoiduocgiao, dienthoaihen
        )
        VALUES (
          @idlichhen, @ngayhen, @giohen, @noidunghen, @idkhachhang,
          @idnhanvien, @trangthaixuly, @idnguoiduocgiao, @dienthoaihen
        )
      `);

    return res.status(201).json({ idlichhen, message: 'Tạo lịch hẹn thành công.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  const { trangthaixuly } = req.body || {};
  try {
    const pool = await getPool();
    await pool
      .request()
      .input('id', sql.VarChar(12), req.params.id)
      .input('trangthaixuly', sql.Bit, trangthaixuly ? 1 : 0)
      .query('UPDATE dbo.tbllichhen SET trangthaixuly = @trangthaixuly WHERE idlichhen = @id');
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool
      .request()
      .input('id', sql.VarChar(12), req.params.id)
      .query('DELETE FROM dbo.tbllichhen WHERE idlichhen = @id');
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
