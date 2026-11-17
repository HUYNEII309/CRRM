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

function normalizeStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().normalize();
}

function normalizePhone(val) {
  if (!val) return '';
  let p = normalizeStr(val);
  p = p.replace(/\s+/g, '');
  if (p.startsWith('+84')) {
    p = '0' + p.slice(3);
  }
  p = p.replace(/\+84/g, '0');
  return p;
}

function getTodayYyyyMmDd() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

async function getEndCustomerId(pool, todayStr) {
  try {
    const req = pool.request();
    req.input('idkhachhang', sql.VarChar(12), todayStr);
    const result = await req.execute('dbo.tblkhachhang_SelectEnd');
    if (result.recordset && result.recordset.length > 0) {
      return String(result.recordset[0].idkhachhang || '').trim();
    }
  } catch (err) {
    console.error('Error executing tblkhachhang_SelectEnd:', err.message);
    try {
      const qRes = await pool
        .request()
        .input('prefix', sql.VarChar(12), todayStr)
        .query('SELECT TOP 1 idkhachhang FROM dbo.tblkhachhang WHERE idkhachhang LIKE @prefix + \'%\' ORDER BY idkhachhang DESC');
      if (qRes.recordset && qRes.recordset.length > 0) {
        return String(qRes.recordset[0].idkhachhang || '').trim();
      }
    } catch (_) {}
  }
  return '';
}

function getNextCustomerId(endId, todayStr) {
  let seq = 0;
  try {
    if (endId && endId.length >= 8) {
      const s = endId.substring(8);
      const num = parseInt(s, 10);
      if (!Number.isNaN(num)) {
        seq = num + 1;
      }
    }
  } catch (_) {
    seq = 0;
  }
  return `${todayStr}${String(seq).padStart(4, '0')}`;
}

router.post('/', async (req, res) => {
  const b = req.body || {};
  const tenkhachhang = normalizeStr(b.tenkhachhang);
  if (!tenkhachhang) {
    return res.status(400).json({ error: 'Tên khách hàng không được để trống.' });
  }

  const idloaikhachhang = normalizeStr(b.idloaikhachhang);
  if (!idloaikhachhang) {
    return res.status(400).json({ error: 'Vui lòng chọn loại dịch vụ, sản phẩm cho khách hàng mới.' });
  }

  const diachi = normalizeStr(b.diachi) || null;
  const dienthoai = normalizePhone(b.dienthoai) || null;
  const email = normalizeStr(b.email) || null;
  const ghichu = normalizeStr(b.ghichu) || null;
  const tennguoilienlac = normalizeStr(b.tennguoilienlac) || null;
  const dienthoainguoilienlac = normalizeStr(b.dienthoainguoilienlac) || null;
  const emailnguoilienlac = normalizeStr(b.emailnguoilienlac) || null;
  const idnhanvien = normalizeStr(b.idnhanvien) || (req.user && req.user.idnhanvien) || null;

  try {
    const pool = await getPool();
    const todayStr = getTodayYyyyMmDd();
    const endId = await getEndCustomerId(pool, todayStr);
    const idkhachhang = getNextCustomerId(endId, todayStr);

    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const reqSp = pool.request();
    reqSp.input('idkhachhang', sql.VarChar(12), idkhachhang);
    reqSp.input('tenkhachhang', sql.NVarChar(250), tenkhachhang);
    reqSp.input('diachi', sql.NVarChar(sql.MAX), diachi);
    reqSp.input('dienthoai', sql.NVarChar(sql.MAX), dienthoai);
    reqSp.input('email', sql.NVarChar(250), email);
    reqSp.input('ghichu', sql.NVarChar(sql.MAX), ghichu);
    reqSp.input('idloaikhachhang', sql.VarChar(12), idloaikhachhang);
    reqSp.input('tennguoilienlac', sql.NVarChar(250), tennguoilienlac);
    reqSp.input('dienthoainguoilienlac', sql.NVarChar(sql.MAX), dienthoainguoilienlac);
    reqSp.input('emailnguoilienlac', sql.NVarChar(250), emailnguoilienlac);
    reqSp.input('ngaynhap', sql.DateTime, todayDate);
    reqSp.input('idnhanvien', sql.VarChar(12), idnhanvien);

    try {
      await reqSp.execute('dbo.tblkhachhang_Insert');
    } catch (spErr) {
      console.error('Error executing tblkhachhang_Insert:', spErr.message);
      // Fallback query phòng trường hợp môi trường chưa nạp đủ SP
      await pool.request()
        .input('idkhachhang', sql.VarChar(12), idkhachhang)
        .input('tenkhachhang', sql.NVarChar(250), tenkhachhang)
        .input('diachi', sql.NVarChar(sql.MAX), diachi)
        .input('dienthoai', sql.NVarChar(sql.MAX), dienthoai)
        .input('email', sql.NVarChar(250), email)
        .input('ghichu', sql.NVarChar(sql.MAX), ghichu)
        .input('idloaikhachhang', sql.VarChar(12), idloaikhachhang)
        .input('tennguoilienlac', sql.NVarChar(250), tennguoilienlac)
        .input('dienthoainguoilienlac', sql.NVarChar(sql.MAX), dienthoainguoilienlac)
        .input('emailnguoilienlac', sql.NVarChar(250), emailnguoilienlac)
        .input('ngaynhap', sql.DateTime, todayDate)
        .input('idnhanvien', sql.VarChar(12), idnhanvien)
        .query(`
          INSERT INTO dbo.tblkhachhang (
            idkhachhang, tenkhachhang, diachi, dienthoai, email, ghichu,
            idloaikhachhang, tennguoilienlac, dienthoainguoilienlac, emailnguoilienlac,
            ngaynhap, idnhanvien, trangthaisudung
          ) VALUES (
            @idkhachhang, @tenkhachhang, @diachi, @dienthoai, @email, @ghichu,
            @idloaikhachhang, @tennguoilienlac, @dienthoainguoilienlac, @emailnguoilienlac,
            @ngaynhap, @idnhanvien, 1
          )
        `);
    }

    return res.status(201).json({ idkhachhang, message: 'Thêm khách hàng thành công.' });
  } catch (err) {
    return res.status(500).json({ error: 'Không thêm khách hàng: ' + err.message });
  }
});

router.put('/:id', async (req, res) => {
  const b = req.body || {};
  try {
    const pool = await getPool();
    const tenkhachhang = normalizeStr(b.tenkhachhang);
    if (!tenkhachhang) {
      return res.status(400).json({ error: 'Tên khách hàng không được để trống.' });
    }
    const idloaikhachhang = normalizeStr(b.idloaikhachhang);
    if (!idloaikhachhang) {
      return res.status(400).json({ error: 'Vui lòng chọn loại dịch vụ, sản phẩm cho khách hàng.' });
    }
    const diachi = normalizeStr(b.diachi) || null;
    const dienthoai = normalizePhone(b.dienthoai) || null;
    const email = normalizeStr(b.email) || null;
    const ghichu = normalizeStr(b.ghichu) || null;
    const tennguoilienlac = normalizeStr(b.tennguoilienlac) || null;
    const dienthoainguoilienlac = normalizeStr(b.dienthoainguoilienlac) || null;
    const emailnguoilienlac = normalizeStr(b.emailnguoilienlac) || null;
    const idnhanvien = normalizeStr(b.idnhanvien) || null;

    await pool
      .request()
      .input('idkhachhang', sql.VarChar(12), req.params.id)
      .input('tenkhachhang', sql.NVarChar(250), tenkhachhang)
      .input('diachi', sql.NVarChar(sql.MAX), diachi)
      .input('dienthoai', sql.NVarChar(sql.MAX), dienthoai)
      .input('email', sql.NVarChar(250), email)
      .input('ghichu', sql.NVarChar(sql.MAX), ghichu)
      .input('idloaikhachhang', sql.VarChar(12), idloaikhachhang)
      .input('tennguoilienlac', sql.NVarChar(250), tennguoilienlac)
      .input('dienthoainguoilienlac', sql.NVarChar(sql.MAX), dienthoainguoilienlac)
      .input('emailnguoilienlac', sql.NVarChar(250), emailnguoilienlac)
      .input('idnhanvien', sql.VarChar(12), idnhanvien)
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
            idnhanvien = @idnhanvien
        WHERE idkhachhang = @idkhachhang
      `);

    return res.json({ ok: true, message: 'Cập nhật khách hàng thành công.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const idkhachhang = String(req.params.id || '').trim();
  if (!idkhachhang) {
    return res.status(400).json({ error: 'Mã khách hàng không hợp lệ.' });
  }

  try {
    const pool = await getPool();

    // 1. Thử execute Stored Procedure tblkhachhang_Delete với input @idkhachhang
    try {
      await pool.request()
        .input('idkhachhang', sql.VarChar(12), idkhachhang)
        .execute('dbo.tblkhachhang_Delete');
      return res.json({ ok: true, message: 'Đã xóa khách hàng thành công.' });
    } catch (spErr) {
      // 2. Thử tạo SP nếu chưa có rồi gọi lại
      try {
        await pool.request().query(`
          IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tblkhachhang_Delete]') AND type in (N'P', N'PC'))
          BEGIN
            EXEC('CREATE PROCEDURE [dbo].[tblkhachhang_Delete]
              @idkhachhang varchar(12)
            AS
            BEGIN
              SET NOCOUNT ON;
              DELETE FROM dbo.tbllichhen WHERE idkhachhang = @idkhachhang;
              DELETE FROM dbo.tbltasklist WHERE idkhachhang = @idkhachhang;
              DELETE FROM dbo.tbldauvieccodinh WHERE idkhachhang = @idkhachhang;
              DELETE FROM dbo.tblImage WHERE idchamsockhachhang IN (SELECT idchamsockhachhang FROM dbo.tblchamsockhachhang WHERE idkhachhang = @idkhachhang);
              DELETE FROM dbo.tblchamsockhachhang WHERE idkhachhang = @idkhachhang;
              DELETE FROM dbo.tblkhachhang WHERE idkhachhang = @idkhachhang;
            END');
          END
        `);
        await pool.request()
          .input('idkhachhang', sql.VarChar(12), idkhachhang)
          .execute('dbo.tblkhachhang_Delete');
        return res.json({ ok: true, message: 'Đã xóa khách hàng thành công.' });
      } catch (createErr) {
        // 3. Thử SP có sẵn trong DB dbo.tblkhachhang_Delete_tamngat_11_4_2023
        try {
          await pool.request()
            .input('idkhachhang', sql.VarChar(12), idkhachhang)
            .execute('dbo.tblkhachhang_Delete_tamngat_11_4_2023');
          return res.json({ ok: true, message: 'Đã xóa khách hàng thành công.' });
        } catch (_) {}

        // 4. Xóa các dữ liệu liên kết trước (tránh FK Constraint) rồi xóa tblkhachhang
        await pool.request()
          .input('idkhachhang', sql.VarChar(12), idkhachhang)
          .query(`
            DELETE FROM dbo.tbllichhen WHERE idkhachhang = @idkhachhang;
            DELETE FROM dbo.tbltasklist WHERE idkhachhang = @idkhachhang;
            DELETE FROM dbo.tbldauvieccodinh WHERE idkhachhang = @idkhachhang;
            DELETE FROM dbo.tblImage WHERE idchamsockhachhang IN (SELECT idchamsockhachhang FROM dbo.tblchamsockhachhang WHERE idkhachhang = @idkhachhang);
            DELETE FROM dbo.tblchamsockhachhang WHERE idkhachhang = @idkhachhang;
            DELETE FROM dbo.tblkhachhang WHERE idkhachhang = @idkhachhang;
          `);

        return res.json({ ok: true, message: 'Đã xóa khách hàng thành công.' });
      }
    }
  } catch (err) {
    // Nếu vẫn vướng khóa ngoại không cho DELETE, fallback sang UPDATE trangthaisudung = 0
    try {
      const pool = await getPool();
      await pool.request()
        .input('idkhachhang', sql.VarChar(12), idkhachhang)
        .query('UPDATE dbo.tblkhachhang SET trangthaisudung = 0 WHERE idkhachhang = @idkhachhang');
      return res.json({ ok: true, message: 'Đã xóa (ngừng sử dụng) khách hàng thành công.' });
    } catch (fbErr) {
      return res.status(500).json({ error: 'Không thể xóa khách hàng: ' + err.message });
    }
  }
});

module.exports = router;
