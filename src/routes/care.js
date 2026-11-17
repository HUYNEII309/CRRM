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

  const idkhachhang = String(b.idkhachhang).trim();
  const ngaythang = b.ngaythang ? new Date(b.ngaythang) : new Date();
  const idhinhthucchamsoc = b.idhinhthucchamsoc ? String(b.idhinhthucchamsoc).trim() : null;
  const iddanhgiakhachhang = b.iddanhgiakhachhang ? String(b.iddanhgiakhachhang).trim() : null;
  const idlydokhachhang = b.idlydokhachhang ? String(b.idlydokhachhang).trim() : null;
  const idtrangthai = b.idtrangthai ? String(b.idtrangthai).trim() : null;
  const ghichu = (b.ghichu && String(b.ghichu).trim().length > 0) ? String(b.ghichu).trim() : null;
  const idnhanvien = b.idnhanvien ? String(b.idnhanvien).trim() : (req.user && req.user.idnhanvien ? String(req.user.idnhanvien).trim() : null);
  const isquantam = (b.isquantam === true || b.isquantam === 'true' || b.isquantam === 1 || b.isquantam === '1' || b.isquantam === 'on') ? 1 : 0;

  try {
    const pool = await getPool();
    const idchamsockhachhang = await generateNextId(pool, 'tblchamsockhachhang', 'idchamsockhachhang');

    const reqSp = pool.request();
    reqSp.input('idchamsockhachhang', sql.VarChar(12), idchamsockhachhang);
    reqSp.input('idkhachhang', sql.VarChar(12), idkhachhang);
    reqSp.input('ngaythang', sql.DateTime, ngaythang);
    reqSp.input('idhinhthucchamsoc', sql.VarChar(12), idhinhthucchamsoc);
    reqSp.input('iddanhgiakhachhang', sql.VarChar(12), iddanhgiakhachhang);
    reqSp.input('idlydokhachhang', sql.VarChar(12), idlydokhachhang);
    reqSp.input('idtrangthai', sql.VarChar(12), idtrangthai);
    reqSp.input('ghichu', sql.NVarChar(sql.MAX), ghichu);
    reqSp.input('idnhanvien', sql.VarChar(12), idnhanvien);
    reqSp.input('isquantam', sql.Bit, isquantam);

    try {
      await reqSp.execute('dbo.tblchamsockhachhang_Insert');
    } catch (spErr) {
      console.warn('Lỗi execute tblchamsockhachhang_Insert, fallback sang direct INSERT query:', spErr.message);
      await pool.request()
        .input('idchamsockhachhang', sql.VarChar(12), idchamsockhachhang)
        .input('idkhachhang', sql.VarChar(12), idkhachhang)
        .input('ngaythang', sql.DateTime, ngaythang)
        .input('idhinhthucchamsoc', sql.VarChar(12), idhinhthucchamsoc)
        .input('iddanhgiakhachhang', sql.VarChar(12), iddanhgiakhachhang)
        .input('idlydokhachhang', sql.VarChar(12), idlydokhachhang)
        .input('idtrangthai', sql.VarChar(12), idtrangthai)
        .input('ghichu', sql.NVarChar(sql.MAX), ghichu)
        .input('idnhanvien', sql.VarChar(12), idnhanvien)
        .input('isquantam', sql.Bit, isquantam)
        .query(`
          INSERT INTO dbo.tblchamsockhachhang (
            idchamsockhachhang, idkhachhang, ngaythang, idhinhthucchamsoc,
            iddanhgiakhachhang, idlydokhachhang, idtrangthai, ghichu,
            idnhanvien, isquantam
          )
          VALUES (
            @idchamsockhachhang, @idkhachhang, @ngaythang, @idhinhthucchamsoc,
            @iddanhgiakhachhang, @idlydokhachhang, @idtrangthai, @ghichu,
            @idnhanvien, @isquantam
          )
        `);
    }

    // Lưu đầu việc cố định hỗ trợ nếu người dùng có tích chọn
    if (b.dauViecCoDinh && b.dauViecCoDinh.iddanhmucdauviec) {
      try {
        const iddauviec = await generateNextId(pool, 'tbldauvieccodinh', 'iddauviec');
        const d = b.dauViecCoDinh;
        const diemVal = Number(d.diem) || 0;
        const gioVal = Number(d.dukiensogiolam) || 0;
        const isDuyetVal = (d.isduyet === true || d.isduyet === 'true' || d.isduyet === 1 || d.isduyet === '1') ? 1 : 0;
        const idnvLam = d.idnhanvienlam || null;
        const idnvDuyet = isDuyetVal ? (req.user?.idnhanvien || idnhanvien) : null;
        const ngayGioDuyet = isDuyetVal ? new Date() : null;

        const reqDv = pool.request();
        reqDv.input('iddauviec', sql.VarChar(12), iddauviec);
        reqDv.input('iddanhmucdauviec', sql.VarChar(12), d.iddanhmucdauviec);
        reqDv.input('diem', sql.Float, diemVal);
        reqDv.input('dukiensogiolam', sql.Float, gioVal);
        reqDv.input('ngaygiohoanthanh', sql.DateTime, ngaythang);
        reqDv.input('idnhanvienlam', sql.VarChar(12), idnvLam);
        reqDv.input('idnhanvienduyet', sql.VarChar(12), idnvDuyet);
        reqDv.input('ngaygioduyet', sql.DateTime, ngayGioDuyet);
        reqDv.input('ghichu', sql.NVarChar(sql.MAX), ghichu);
        reqDv.input('idkhachhang', sql.VarChar(12), idkhachhang);
        reqDv.input('idchamsockhachhang', sql.VarChar(12), idchamsockhachhang);

        try {
          await reqDv.execute('dbo.tbldauvieccodinh_Insert');
          if (isDuyetVal) {
            await pool.request()
              .input('iddauviec', sql.VarChar(12), iddauviec)
              .query('UPDATE dbo.tbldauvieccodinh SET isduyet = 1 WHERE iddauviec = @iddauviec');
          }
        } catch (spDvErr) {
          console.warn('Lỗi execute tbldauvieccodinh_Insert, fallback sang direct INSERT query:', spDvErr.message);
          await pool.request()
            .input('iddauviec', sql.VarChar(12), iddauviec)
            .input('iddanhmucdauviec', sql.VarChar(12), d.iddanhmucdauviec)
            .input('diem', sql.Float, diemVal)
            .input('dukiensogiolam', sql.Float, gioVal)
            .input('ngaygiohoanthanh', sql.DateTime, ngaythang)
            .input('idnhanvienlam', sql.VarChar(12), idnvLam)
            .input('idnhanvienduyet', sql.VarChar(12), idnvDuyet)
            .input('ngaygioduyet', sql.DateTime, ngayGioDuyet)
            .input('ghichu', sql.NVarChar(sql.MAX), ghichu)
            .input('isduyet', sql.Bit, isDuyetVal)
            .input('idkhachhang', sql.VarChar(12), idkhachhang)
            .input('idchamsockhachhang', sql.VarChar(12), idchamsockhachhang)
            .query(`
              INSERT INTO dbo.tbldauvieccodinh (
                iddauviec, iddanhmucdauviec, diem, dukiensogiolam,
                ngaygiohoanthanh, idnhanvienlam, idnhanvienduyet, ngaygioduyet,
                ghichu, isduyet, idkhachhang, idchamsockhachhang
              )
              VALUES (
                @iddauviec, @iddanhmucdauviec, @diem, @dukiensogiolam,
                @ngaygiohoanthanh, @idnhanvienlam, @idnhanvienduyet, @ngaygioduyet,
                @ghichu, @isduyet, @idkhachhang, @idchamsockhachhang
              )
            `);
        }
      } catch (errDv) {
        console.warn('Không thể lưu đầu việc cố định tbldauvieccodinh:', errDv.message);
      }
    }

    return res.status(201).json({ idchamsockhachhang, message: 'Thêm thông tin chăm sóc khách hàng thành công.' });
  } catch (err) {
    return res.status(500).json({ error: 'Không thêm được thông tin chăm sóc khách hàng: ' + err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const idchamsockhachhang = String(req.params.id || '').trim();
  if (!idchamsockhachhang) {
    return res.status(400).json({ error: 'Mã chăm sóc khách hàng không hợp lệ.' });
  }

  try {
    const pool = await getPool();

    // 1. Thử execute Stored Procedure tblchamsockhachhang_Delete với input @idchamsockhachhang
    try {
      await pool.request()
        .input('idchamsockhachhang', sql.VarChar(12), idchamsockhachhang)
        .execute('dbo.tblchamsockhachhang_Delete');
      return res.json({ ok: true, message: 'Đã xóa lịch sử chăm sóc khách hàng thành công.' });
    } catch (spErr) {
      // 2. Thử tạo SP nếu chưa có rồi gọi lại
      try {
        await pool.request().query(`
          IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tblchamsockhachhang_Delete]') AND type in (N'P', N'PC'))
          BEGIN
            EXEC('CREATE PROCEDURE [dbo].[tblchamsockhachhang_Delete]
              @idchamsockhachhang varchar(12)
            AS
            BEGIN
              SET NOCOUNT ON;
              DELETE FROM dbo.tbltasklist WHERE idchamsockhachhang = @idchamsockhachhang;
              DELETE FROM dbo.tbldauvieccodinh WHERE idchamsockhachhang = @idchamsockhachhang;
              DELETE FROM dbo.tblImage WHERE idchamsockhachhang = @idchamsockhachhang;
              DELETE FROM dbo.tblchamsockhachhang WHERE idchamsockhachhang = @idchamsockhachhang;
            END');
          END
        `);
        await pool.request()
          .input('idchamsockhachhang', sql.VarChar(12), idchamsockhachhang)
          .execute('dbo.tblchamsockhachhang_Delete');
        return res.json({ ok: true, message: 'Đã xóa lịch sử chăm sóc khách hàng thành công.' });
      } catch (createErr) {
        // 3. Thử SP có sẵn trong DB dbo.tblchamsockhachhang_Delete___
        try {
          await pool.request()
            .input('idchamsockhachhang', sql.VarChar(12), idchamsockhachhang)
            .execute('dbo.tblchamsockhachhang_Delete___');
          return res.json({ ok: true, message: 'Đã xóa lịch sử chăm sóc khách hàng thành công.' });
        } catch (_) {}

        // 4. Xóa các bảng liên kết trước để tránh FK Constraint rồi xóa tblchamsockhachhang
        await pool.request()
          .input('idchamsockhachhang', sql.VarChar(12), idchamsockhachhang)
          .query(`
            DELETE FROM dbo.tbltasklist WHERE idchamsockhachhang = @idchamsockhachhang;
            DELETE FROM dbo.tbldauvieccodinh WHERE idchamsockhachhang = @idchamsockhachhang;
            DELETE FROM dbo.tblImage WHERE idchamsockhachhang = @idchamsockhachhang;
            DELETE FROM dbo.tblchamsockhachhang WHERE idchamsockhachhang = @idchamsockhachhang;
          `);
        return res.json({ ok: true, message: 'Đã xóa lịch sử chăm sóc khách hàng thành công.' });
      }
    }
  } catch (err) {
    return res.status(500).json({ error: 'Không thể xóa chăm sóc khách hàng: ' + err.message });
  }
});

module.exports = router;
