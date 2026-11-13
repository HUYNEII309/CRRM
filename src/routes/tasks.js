const express = require('express');
const { getPool, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { generateNextId } = require('../utils/idGenerator');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { q = '', idnguoithuchien = '', idtrangthaitasklist = '', from = '', to = '' } = req.query;
  try {
    const pool = await getPool();
    const request = pool.request();
    const conditions = ['1=1'];

    if (q.trim()) {
      request.input('q', sql.NVarChar(250), `%${q.trim()}%`);
      conditions.push('(t.noidung LIKE @q OR kh.tenkhachhang LIKE @q OR t.ghichu LIKE @q)');
    }
    if (idnguoithuchien && idnguoithuchien !== 'all') {
      request.input('idnguoithuchien', sql.NVarChar(50), idnguoithuchien);
      conditions.push('(t.idnguoithuchien = @idnguoithuchien OR nv2.hoten LIKE N\'%\' + @idnguoithuchien + \'%\')');
    }
    if (from) {
      request.input('from', sql.Date, from);
      conditions.push('CAST(t.ngaytao AS DATE) >= @from');
    }
    if (to) {
      request.input('to', sql.Date, to);
      conditions.push('CAST(t.ngaytao AS DATE) <= @to');
    }

    if (idtrangthaitasklist && idtrangthaitasklist !== 'all') {
      request.input('idtrangthaitasklist', sql.VarChar(50), idtrangthaitasklist);
      if (idtrangthaitasklist === 'tiepnhanmoi' || idtrangthaitasklist === '30720200000') {
        conditions.push(`(t.idtrangthaitasklist = '30720200000' OR tt.trangthai LIKE N'%Tiếp nhận%')`);
      } else if (idtrangthaitasklist === 'dangthuchien' || idtrangthaitasklist === '30720200001') {
        conditions.push(`(t.idtrangthaitasklist = '30720200001' OR tt.trangthai LIKE N'%Đang thực hiện%')`);
      } else if (idtrangthaitasklist === 'dahoanthanh' || idtrangthaitasklist === '30720200002') {
        conditions.push(`(t.idtrangthaitasklist = '30720200002' OR tt.trangthai LIKE N'%hoàn thành%' OR t.idtrangthaitasklist = 'HOANTHANH')`);
      } else {
        conditions.push(`(t.idtrangthaitasklist = @idtrangthaitasklist OR tt.trangthai = @idtrangthaitasklist)`);
      }
    }

    const result = await request.query(`
      SELECT TOP 300 t.*, kh.tenkhachhang, kh.makhachhang, kh.diachi,
             nv1.hoten AS tennguoitao, nv2.hoten AS tennguoithuchien,
             tt.trangthai AS tentrangthai, nhom.tendauviec AS tennhomdauviec
      FROM dbo.tbltasklist t
      LEFT JOIN dbo.tblkhachhang kh ON t.idkhachhang = kh.idkhachhang
      LEFT JOIN dbo.tblnhanvien nv1 ON t.idnguoitao = nv1.idnhanvien
      LEFT JOIN dbo.tblnhanvien nv2 ON t.idnguoithuchien = nv2.idnhanvien
      LEFT JOIN dbo.tbltrangthaitasklist tt ON t.idtrangthaitasklist = tt.idtrangthaitasklist
      LEFT JOIN dbo.tblnhomdauvieclaptrinh nhom ON t.idnhomdauvieclaptrinh = nhom.idnhomdauvieclaptrinh
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.ngaytao DESC, t.idtasklist DESC
    `);

    return res.json(result.recordset);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.noidung) {
    return res.status(400).json({ error: 'Nội dung công việc không được để trống.' });
  }
  try {
    const pool = await getPool();
    const idtasklist = await generateNextId(pool, 'tbltasklist', 'idtasklist');

    await pool
      .request()
      .input('idtasklist', sql.VarChar(12), idtasklist)
      .input('noidung', sql.NVarChar(sql.MAX), b.noidung)
      .input('ngaybatdau', sql.DateTime, b.ngaybatdau ? new Date(b.ngaybatdau) : new Date())
      .input('ngayketthuc', sql.DateTime, b.ngayketthuc ? new Date(b.ngayketthuc) : null)
      .input('idnguoitao', sql.VarChar(12), req.user.idnhanvien)
      .input('idnguoithuchien', sql.VarChar(12), b.idnguoithuchien || req.user.idnhanvien)
      .input('idtrangthaitasklist', sql.VarChar(12), b.idtrangthaitasklist || null)
      .input('mucuutien', sql.NVarChar(50), b.mucuutien || 'Bình thường')
      .input('ghichu', sql.NVarChar(sql.MAX), b.ghichu || null)
      .input('idkhachhang', sql.VarChar(12), b.idkhachhang || null)
      .input('soluong', sql.Int, Number(b.soluong || 1))
      .input('idnhomdauvieclaptrinh', sql.VarChar(12), b.idnhomdauvieclaptrinh || null)
      .input('dukiensogiolam', sql.Float, Number(b.dukiensogiolam || 1))
      .query(`
        INSERT INTO dbo.tbltasklist (
          idtasklist, noidung, ngaytao, ngaybatdau, ngayketthuc,
          idnguoitao, idnguoithuchien, idtrangthaitasklist, mucuutien,
          ghichu, idkhachhang, soluong, idnhomdauvieclaptrinh, dukiensogiolam
        )
        VALUES (
          @idtasklist, @noidung, GETDATE(), @ngaybatdau, @ngayketthuc,
          @idnguoitao, @idnguoithuchien, @idtrangthaitasklist, @mucuutien,
          @ghichu, @idkhachhang, @soluong, @idnhomdauvieclaptrinh, @dukiensogiolam
        )
      `);

    return res.status(201).json({ idtasklist, message: 'Tạo công việc thành công.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  const { idtrangthaitasklist } = req.body || {};
  try {
    const pool = await getPool();
    await pool
      .request()
      .input('id', sql.VarChar(12), req.params.id)
      .input('idtrangthaitasklist', sql.VarChar(12), idtrangthaitasklist)
      .query('UPDATE dbo.tbltasklist SET idtrangthaitasklist = @idtrangthaitasklist WHERE idtasklist = @id');
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
      .query('DELETE FROM dbo.tbltasklist WHERE idtasklist = @id');
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
