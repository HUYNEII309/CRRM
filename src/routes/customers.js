const express = require('express');
const { getPool, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { generateNextId } = require('../utils/idGenerator');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { q = '', idnhanvien = '', idloaikhachhang = '', idtinhthanhpho = '', page = '1', limit = '25' } = req.query;
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
  const offset = (pageNum - 1) * pageSize;

  try {
    const pool = await getPool();
    const request = pool.request();
    const conditions = ['(kh.trangthaisudung = 1 OR kh.trangthaisudung IS NULL)'];

    if (q.trim()) {
      request.input('q', sql.NVarChar(250), `%${q.trim()}%`);
      conditions.push(`(
        kh.tenkhachhang LIKE @q OR
        kh.dienthoai LIKE @q OR
        kh.email LIKE @q OR
        kh.diachi LIKE @q OR
        kh.tennguoilienlac LIKE @q OR
        CAST(kh.makhachhang AS nvarchar(20)) LIKE @q OR
        kh.idkhachhang LIKE @q
      )`);
    }
    if (idnhanvien) {
      request.input('idnhanvien', sql.VarChar(12), idnhanvien);
      conditions.push('kh.idnhanvien = @idnhanvien');
    }
    if (idloaikhachhang) {
      request.input('idloaikhachhang', sql.VarChar(12), idloaikhachhang);
      conditions.push('kh.idloaikhachhang = @idloaikhachhang');
    }
    if (idtinhthanhpho) {
      request.input('idtinhthanhpho', sql.VarChar(12), idtinhthanhpho);
      conditions.push('kh.idtinhthanhpho = @idtinhthanhpho');
    }

    const whereSql = conditions.join(' AND ');
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, pageSize);

    const countResult = await request.query(`SELECT COUNT(*) AS total FROM dbo.tblkhachhang kh WHERE ${whereSql}`);
    const dataResult = await request.query(`
      SELECT kh.idkhachhang, kh.makhachhang, kh.tenkhachhang, kh.diachi, kh.dienthoai,
             kh.email, kh.ghichu, kh.idloaikhachhang, lkh.tenloaikhachhang,
             kh.tennguoilienlac, kh.dienthoainguoilienlac, kh.emailnguoilienlac,
             kh.ngaynhap, kh.idnhanvien, nv.hoten AS tennhanvien,
             kh.idtinhthanhpho, tp.ten AS tentinhthanhpho,
             kh.idquanhuyen, kh.idphuongxa, kh.dienthoaisms, kh.idhinhthuckhachhang,
             ht.ten AS tenhinhthuckhachhang,
             (SELECT MAX(ngaythang) FROM dbo.tblchamsockhachhang cs WHERE cs.idkhachhang = kh.idkhachhang) AS ngaygiaodichgannhat
      FROM dbo.tblkhachhang kh
      LEFT JOIN dbo.tblloaikhachhang lkh ON kh.idloaikhachhang = lkh.idloaikhachhang
      LEFT JOIN dbo.tblnhanvien nv ON kh.idnhanvien = nv.idnhanvien
      LEFT JOIN dbo.tbltinhthanhpho tp ON kh.idtinhthanhpho = tp.idtinhthanhpho
      LEFT JOIN dbo.tblhinhthuckhachhang ht ON kh.idhinhthuckhachhang = ht.idhinhthuckhachhang
      WHERE ${whereSql}
      ORDER BY kh.ngaynhap DESC, kh.makhachhang DESC
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

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const customerRes = await pool
      .request()
      .input('id', sql.VarChar(12), id)
      .query(`
        SELECT kh.*, lkh.tenloaikhachhang, nv.hoten AS tennhanvien,
               tp.ten AS tentinhthanhpho, qh.ten AS tenquanhuyen, px.ten AS tenphuongxa,
               ht.ten AS tenhinhthuckhachhang
        FROM dbo.tblkhachhang kh
        LEFT JOIN dbo.tblloaikhachhang lkh ON kh.idloaikhachhang = lkh.idloaikhachhang
        LEFT JOIN dbo.tblnhanvien nv ON kh.idnhanvien = nv.idnhanvien
        LEFT JOIN dbo.tbltinhthanhpho tp ON kh.idtinhthanhpho = tp.idtinhthanhpho
        LEFT JOIN dbo.tblquanhuyen qh ON kh.idquanhuyen = qh.idquanhuyen
        LEFT JOIN dbo.tblphuongxa px ON kh.idphuongxa = px.idphuongxa
        LEFT JOIN dbo.tblhinhthuckhachhang ht ON kh.idhinhthuckhachhang = ht.idhinhthuckhachhang
        WHERE kh.idkhachhang = @id
      `);

    const customer = customerRes.recordset[0];
    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });
    }

    const [careRes, packagesRes, appointmentsRes, tasksRes, receiptsRes] = await Promise.all([
      pool.request().input('id', sql.VarChar(12), id).query(`
        SELECT TOP 50 cs.*, ht.tenhinhthuc, dg.tendanhgiakhachhang, ld.tenlydokhachhang,
               tt.tentrangthai, nv.hoten AS tennhanvien
        FROM dbo.tblchamsockhachhang cs
        LEFT JOIN dbo.tblhinhthucchamsoc ht ON cs.idhinhthucchamsoc = ht.idhinhthucchamsoc
        LEFT JOIN dbo.tbldanhgiakhachhang dg ON cs.iddanhgiakhachhang = dg.iddanhgiakhachhang
        LEFT JOIN dbo.tbllydokhachhang ld ON cs.idlydokhachhang = ld.idlydokhachhang
        LEFT JOIN dbo.tbltrangthai tt ON cs.idtrangthai = tt.idtrangthai
        LEFT JOIN dbo.tblnhanvien nv ON cs.idnhanvien = nv.idnhanvien
        WHERE cs.idkhachhang = @id
        ORDER BY cs.ngaythang DESC
      `),
      pool.request().input('id', sql.VarChar(12), id).query(`
        SELECT gdv.*, lkh.tenloaikhachhang, nv.hoten AS tennhanvien
        FROM dbo.tblgoidichvu_hansudung gdv
        LEFT JOIN dbo.tblloaikhachhang lkh ON gdv.idloaikhachhang = lkh.idloaikhachhang
        LEFT JOIN dbo.tblnhanvien nv ON gdv.idnhanvien = nv.idnhanvien
        WHERE gdv.idkhachhang = @id
        ORDER BY gdv.ngayhethan DESC
      `),
      pool.request().input('id', sql.VarChar(12), id).query(`
        SELECT lh.*, nv.hoten AS tennguoiduocgiao
        FROM dbo.tbllichhen lh
        LEFT JOIN dbo.tblnhanvien nv ON lh.idnguoiduocgiao = nv.idnhanvien
        WHERE lh.idkhachhang = @id
        ORDER BY lh.ngayhen DESC
      `),
      pool.request().input('id', sql.VarChar(12), id).query(`
        SELECT t.*, tt.trangthai, nv.hoten AS tennguoithuchien
        FROM dbo.tbltasklist t
        LEFT JOIN dbo.tbltrangthaitasklist tt ON t.idtrangthaitasklist = tt.idtrangthaitasklist
        LEFT JOIN dbo.tblnhanvien nv ON t.idnguoithuchien = nv.idnhanvien
        WHERE t.idkhachhang = @id
        ORDER BY t.ngaytao DESC
      `),
      pool.request().input('id', sql.VarChar(12), id).query(`
        SELECT kt.*, lkt.tenkhoanthu, nv.hoten AS tennhanvienthu
        FROM dbo.tblkhoanthu kt
        LEFT JOIN dbo.tblloaikhoanthu lkt ON kt.idloaikhoanthu = lkt.idloaikhoanthu
        LEFT JOIN dbo.tblnhanvien nv ON kt.idnhanvienthu = nv.idnhanvien
        WHERE kt.idkhachhang = @id
        ORDER BY kt.thoigianthu DESC
      `),
    ]);

    return res.json({
      customer,
      careHistory: careRes.recordset,
      packages: packagesRes.recordset,
      appointments: appointmentsRes.recordset,
      tasks: tasksRes.recordset,
      receipts: receiptsRes.recordset,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.tenkhachhang) {
    return res.status(400).json({ error: 'Tên khách hàng không được để trống.' });
  }

  try {
    const pool = await getPool();
    const idkhachhang = await generateNextId(pool, 'tblkhachhang', 'idkhachhang');

    await pool
      .request()
      .input('idkhachhang', sql.VarChar(12), idkhachhang)
      .input('tenkhachhang', sql.NVarChar(250), b.tenkhachhang)
      .input('diachi', sql.NVarChar(sql.MAX), b.diachi || null)
      .input('dienthoai', sql.NVarChar(sql.MAX), b.dienthoai || null)
      .input('email', sql.NVarChar(250), b.email || null)
      .input('ghichu', sql.NVarChar(sql.MAX), b.ghichu || null)
      .input('idloaikhachhang', sql.VarChar(12), b.idloaikhachhang || null)
      .input('tennguoilienlac', sql.NVarChar(250), b.tennguoilienlac || null)
      .input('dienthoainguoilienlac', sql.NVarChar(sql.MAX), b.dienthoainguoilienlac || null)
      .input('emailnguoilienlac', sql.NVarChar(250), b.emailnguoilienlac || null)
      .input('idnhanvien', sql.VarChar(12), b.idnhanvien || req.user.idnhanvien)
      .input('idtinhthanhpho', sql.VarChar(12), b.idtinhthanhpho || null)
      .input('idquanhuyen', sql.VarChar(12), b.idquanhuyen || null)
      .input('idphuongxa', sql.VarChar(12), b.idphuongxa || null)
      .input('dienthoaisms', sql.NVarChar(250), b.dienthoaisms || b.dienthoai || null)
      .input('idhinhthuckhachhang', sql.VarChar(12), b.idhinhthuckhachhang || null)
      .query(`
        INSERT INTO dbo.tblkhachhang (
          idkhachhang, tenkhachhang, diachi, dienthoai, email, ghichu,
          idloaikhachhang, tennguoilienlac, dienthoainguoilienlac, emailnguoilienlac,
          ngaynhap, idnhanvien, trangthaisudung, idtinhthanhpho, idquanhuyen, idphuongxa,
          dienthoaisms, idhinhthuckhachhang
        )
        VALUES (
          @idkhachhang, @tenkhachhang, @diachi, @dienthoai, @email, @ghichu,
          @idloaikhachhang, @tennguoilienlac, @dienthoainguoilienlac, @emailnguoilienlac,
          GETDATE(), @idnhanvien, 1, @idtinhthanhpho, @idquanhuyen, @idphuongxa,
          @dienthoaisms, @idhinhthuckhachhang
        )
      `);

    return res.status(201).json({ idkhachhang, message: 'Thêm khách hàng thành công.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const b = req.body || {};
  try {
    const pool = await getPool();
    await pool
      .request()
      .input('idkhachhang', sql.VarChar(12), req.params.id)
      .input('tenkhachhang', sql.NVarChar(250), b.tenkhachhang)
      .input('diachi', sql.NVarChar(sql.MAX), b.diachi || null)
      .input('dienthoai', sql.NVarChar(sql.MAX), b.dienthoai || null)
      .input('email', sql.NVarChar(250), b.email || null)
      .input('ghichu', sql.NVarChar(sql.MAX), b.ghichu || null)
      .input('idloaikhachhang', sql.VarChar(12), b.idloaikhachhang || null)
      .input('tennguoilienlac', sql.NVarChar(250), b.tennguoilienlac || null)
      .input('dienthoainguoilienlac', sql.NVarChar(sql.MAX), b.dienthoainguoilienlac || null)
      .input('emailnguoilienlac', sql.NVarChar(250), b.emailnguoilienlac || null)
      .input('idnhanvien', sql.VarChar(12), b.idnhanvien || null)
      .input('idtinhthanhpho', sql.VarChar(12), b.idtinhthanhpho || null)
      .input('idquanhuyen', sql.VarChar(12), b.idquanhuyen || null)
      .input('idphuongxa', sql.VarChar(12), b.idphuongxa || null)
      .input('dienthoaisms', sql.NVarChar(250), b.dienthoaisms || null)
      .input('idhinhthuckhachhang', sql.VarChar(12), b.idhinhthuckhachhang || null)
      .query(`
        UPDATE dbo.tblkhachhang
        SET tenkhachhang = @tenkhachhang,
            diachi = @diachi,
            dienthoai = @dienthoai,
            email = @email,
            ghichu = @ghichu,
            idloaikhachhang = @idloaikhachhang,
            tennguoilienlac = @tennguoilienlac,
            dienthoainguoilienlac = @dienthoainguoilienlac,
            emailnguoilienlac = @emailnguoilienlac,
            idnhanvien = @idnhanvien,
            idtinhthanhpho = @idtinhthanhpho,
            idquanhuyen = @idquanhuyen,
            idphuongxa = @idphuongxa,
            dienthoaisms = @dienthoaisms,
            idhinhthuckhachhang = @idhinhthuckhachhang
        WHERE idkhachhang = @idkhachhang
      `);

    return res.json({ ok: true, message: 'Cập nhật khách hàng thành công.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool
      .request()
      .input('idkhachhang', sql.VarChar(12), req.params.id)
      .query('UPDATE dbo.tblkhachhang SET trangthaisudung = 0 WHERE idkhachhang = @idkhachhang');
    return res.json({ ok: true, message: 'Đã ngừng sử dụng khách hàng.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
