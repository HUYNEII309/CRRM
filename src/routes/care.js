const express = require('express');
const { getPool, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { generateNextId } = require('../utils/idGenerator');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { q = '', idnhanvien = '', iddanhgiakhachhang = '', isquantam = '', from = '', to = '', page = '1', limit = '25' } = req.query;
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
  const offset = (pageNum - 1) * pageSize;

  try {
    const pool = await getPool();
    const request = pool.request();
    const conditions = ['1=1'];

    if (q.trim()) {
      request.input('q', sql.NVarChar(250), `%${q.trim()}%`);
      conditions.push('(kh.tenkhachhang LIKE @q OR kh.dienthoai LIKE @q OR cs.ghichu LIKE @q)');
    }
    if (idnhanvien) {
      request.input('idnhanvien', sql.VarChar(12), idnhanvien);
      conditions.push('cs.idnhanvien = @idnhanvien');
    }
    if (iddanhgiakhachhang) {
      request.input('iddanhgiakhachhang', sql.VarChar(12), iddanhgiakhachhang);
      conditions.push('cs.iddanhgiakhachhang = @iddanhgiakhachhang');
    }
    if (isquantam === '1') {
      conditions.push('cs.isquantam = 1');
    }
    if (from) {
      request.input('from', sql.Date, from);
      conditions.push('CAST(cs.ngaythang AS DATE) >= @from');
    }
    if (to) {
      request.input('to', sql.Date, to);
      conditions.push('CAST(cs.ngaythang AS DATE) <= @to');
    }

    const whereSql = conditions.join(' AND ');
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, pageSize);

    const countResult = await request.query(`
      SELECT COUNT(*) AS total
      FROM dbo.tblchamsockhachhang cs
      LEFT JOIN dbo.tblkhachhang kh ON cs.idkhachhang = kh.idkhachhang
      WHERE ${whereSql}
    `);

    const dataResult = await request.query(`
      SELECT cs.*, kh.tenkhachhang, kh.dienthoai,
             ht.tenhinhthuc, dg.tendanhgiakhachhang, ld.tenlydokhachhang,
             tt.tentrangthai, nv.hoten AS tennhanvien
      FROM dbo.tblchamsockhachhang cs
      LEFT JOIN dbo.tblkhachhang kh ON cs.idkhachhang = kh.idkhachhang
      LEFT JOIN dbo.tblhinhthucchamsoc ht ON cs.idhinhthucchamsoc = ht.idhinhthucchamsoc
      LEFT JOIN dbo.tbldanhgiakhachhang dg ON cs.iddanhgiakhachhang = dg.iddanhgiakhachhang
      LEFT JOIN dbo.tbllydokhachhang ld ON cs.idlydokhachhang = ld.idlydokhachhang
      LEFT JOIN dbo.tbltrangthai tt ON cs.idtrangthai = tt.idtrangthai
      LEFT JOIN dbo.tblnhanvien nv ON cs.idnhanvien = nv.idnhanvien
      WHERE ${whereSql}
      ORDER BY cs.ngaythang DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    return res.json({
      total: countResult.recordset[0]?.total || 0,
      page: pageNum,
      limit: pageSize,
      items: dataResult.recordset,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.idkhachhang) {
    return res.status(400).json({ error: 'Vui lòng chọn khách hàng.' });
  }

  try {
    const pool = await getPool();
    const idchamsockhachhang = await generateNextId(pool, 'tblchamsockhachhang', 'idchamsockhachhang');

    await pool
      .request()
      .input('idchamsockhachhang', sql.VarChar(12), idchamsockhachhang)
      .input('idkhachhang', sql.VarChar(12), b.idkhachhang)
      .input('ngaythang', sql.DateTime, b.ngaythang ? new Date(b.ngaythang) : new Date())
      .input('idhinhthucchamsoc', sql.VarChar(12), b.idhinhthucchamsoc || null)
      .input('iddanhgiakhachhang', sql.VarChar(12), b.iddanhgiakhachhang || null)
      .input('idlydokhachhang', sql.VarChar(12), b.idlydokhachhang || null)
      .input('idtrangthai', sql.VarChar(12), b.idtrangthai || null)
      .input('ghichu', sql.NVarChar(sql.MAX), b.ghichu || null)
      .input('idlichhen', sql.VarChar(12), b.idlichhen || null)
      .input('idnhanvien', sql.VarChar(12), b.idnhanvien || req.user.idnhanvien)
      .input('isquantam', sql.Bit, b.isquantam ? 1 : 0)
      .query(`
        INSERT INTO dbo.tblchamsockhachhang (
          idchamsockhachhang, idkhachhang, ngaythang, idhinhthucchamsoc,
          iddanhgiakhachhang, idlydokhachhang, idtrangthai, ghichu,
          idlichhen, idnhanvien, isquantam
        )
        VALUES (
          @idchamsockhachhang, @idkhachhang, @ngaythang, @idhinhthucchamsoc,
          @iddanhgiakhachhang, @idlydokhachhang, @idtrangthai, @ghichu,
          @idlichhen, @idnhanvien, @isquantam
        )
      `);

    return res.status(201).json({ idchamsockhachhang, message: 'Lưu nhật ký chăm sóc thành công.' });
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
      .query('DELETE FROM dbo.tblchamsockhachhang WHERE idchamsockhachhang = @id');
    return res.json({ ok: true, message: 'Đã xóa bản ghi chăm sóc.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
