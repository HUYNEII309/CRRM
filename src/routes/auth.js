const express = require('express');
const crypto = require('crypto');
const { getPool, sql } = require('../config/db');
const { signToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * Hàm tạo MD5 theo đúng logic C# của hệ thống:
 * public static string CreateMD5(string input)
 * {
 *     byte[] bytes = Encoding.Unicode.GetBytes(input);
 *     byte[] array = md.ComputeHash(bytes);
 *     ... array[i].ToString("X2") ...
 * }
 */
function createMD5(input) {
  if (!input) return '';
  const bytes = Buffer.from(String(input), 'utf16le'); // Encoding.Unicode trong .NET tương đương utf16le
  return crypto.createHash('md5').update(bytes).digest('hex').toUpperCase();
}

async function logLoginAttempt(pool, { taikhoan, ip, thietbi, trangthai }) {
  try {
    await pool
      .request()
      .input('TaiKhoan', sql.NVarChar(100), taikhoan)
      .input('DiaChiIP', sql.VarChar(50), ip || '')
      .input('ThietBi', sql.NVarChar(500), thietbi || '')
      .input('TrangThai', sql.Bit, trangthai ? 1 : 0)
      .query(`
        INSERT INTO dbo.LichSuDangNhap (TaiKhoan, ThoiGian, DiaChiIP, ThietBi, TrangThai)
        VALUES (@TaiKhoan, GETDATE(), @DiaChiIP, @ThietBi, @TrangThai)
      `);
  } catch (err) {
    console.warn('[LichSuDangNhap] Không thể ghi log:', err.message);
  }
}

router.post('/login', async (req, res) => {
  const { tendangnhap, matkhau, loginType } = req.body || {};
  if (!tendangnhap || !matkhau) {
    return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
  }

  const isMd5 = loginType ? loginType === 'md5' : true;

  try {
    const pool = await getPool();
    let user = null;

    if (isMd5) {
      // 1. ĐĂNG NHẬP BẰNG MD5:
      // Chạy Stored Procedure: dbo.tblNhanVien_CheckDangNhap_26T5_19_5
      // @taikhoan, @matkhau = Util.CreateMD5(matkhau)
      const hashedPwd = createMD5(matkhau);
      const request = pool.request();
      request.input('taikhoan', sql.NVarChar(50), tendangnhap.trim());
      request.input('matkhau', sql.NVarChar(50), hashedPwd);

      let rows = [];
      try {
        const result = await request.execute('dbo.tblNhanVien_CheckDangNhap_26T5_19_5');
        rows = result.recordset || [];
      } catch (spErr) {
        console.warn('Lỗi execute dbo.tblNhanVien_CheckDangNhap_26T5_19_5, fallback SQL:', spErr.message);
        const fbRes = await request.query(`
          SELECT TOP 1 * FROM dbo.tblnhanvien
          WHERE (tendangnhap = @taikhoan AND matkhau = @matkhau) AND issudung = 1
        `);
        rows = fbRes.recordset || [];
      }

      if (rows.length > 0) {
        const rawUser = rows[0];
        let tenbophan = 'Nhân viên';
        try {
          if (rawUser.idbophan) {
            const bpRes = await pool.request()
              .input('id', sql.Int, rawUser.idbophan)
              .query('SELECT TOP 1 tenbophan FROM dbo.tblbophan WHERE id = @id');
            if (bpRes.recordset.length > 0) {
              tenbophan = bpRes.recordset[0].tenbophan;
            }
          }
        } catch (_) {}

        user = {
          idnhanvien: rawUser.idnhanvien,
          hoten: rawUser.hoten,
          dienthoai: rawUser.dienthoai,
          email: rawUser.email,
          tendangnhap: rawUser.tendangnhap,
          idbophan: rawUser.idbophan,
          tenbophan,
          issudung: rawUser.issudung,
          isdanghicongtac: rawUser.isdanghicongtac,
        };
      }
    } else {
      // 2. ĐĂNG NHẬP MẶC ĐỊNH THEO HIỆN TẠI:
      const result = await pool
        .request()
        .input('taikhoan', sql.NVarChar(50), tendangnhap.trim())
        .input('matkhau', sql.NVarChar(50), matkhau)
        .query(`
          SELECT TOP 1 nv.idnhanvien, nv.hoten, nv.dienthoai, nv.email, nv.tendangnhap,
                 nv.idbophan, bp.tenbophan, nv.issudung, nv.isdanghicongtac
          FROM dbo.tblnhanvien nv
          LEFT JOIN dbo.tblbophan bp ON nv.idbophan = bp.id
          WHERE nv.tendangnhap = @taikhoan AND nv.matkhau = @matkhau AND nv.issudung = 1
        `);
      user = result.recordset[0];
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ua = String(req.headers['user-agent'] || '').slice(0, 500);

    if (!user) {
      await logLoginAttempt(pool, { taikhoan: tendangnhap, ip, thietbi: ua, trangthai: false });
      return res.status(401).json({
        error: isMd5
          ? 'Đăng nhập MD5 không thành công: Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản đã khóa.'
          : 'Sai tên đăng nhập, mật khẩu hoặc tài khoản đã bị khóa.'
      });
    }

    await logLoginAttempt(pool, { taikhoan: tendangnhap, ip, thietbi: ua, trangthai: true });

    const permResult = await pool
      .request()
      .input('idnhanvien', sql.VarChar(12), user.idnhanvien)
      .query(`
        SELECT pq.MAMN, mn.TENMN, pq.isxem, pq.issua, pq.isthemmoi, pq.isxoa, pq.isprint, pq.issearch
        FROM dbo.tblphanquyen pq
        LEFT JOIN dbo.tblmenu mn ON pq.MAMN = mn.MAMN
        WHERE pq.idnhanvien = @idnhanvien
      `);

    const token = signToken(user);
    return res.json({
      token,
      user,
      loginType: isMd5 ? 'md5' : 'default',
      permissions: permResult.recordset,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/active-staff
 * Chạy Stored Procedure: dbo.tblnhanvien_SelectAll_ConCongTac
 * Lấy danh sách nhân viên còn công tác kèm tài khoản, mật khẩu, bộ phận
 */
router.get('/active-staff', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    let rows = [];
    try {
      const result = await request.execute('dbo.tblnhanvien_SelectAll_ConCongTac');
      rows = result.recordset || [];
    } catch (spErr) {
      console.warn('Lỗi execute dbo.tblnhanvien_SelectAll_ConCongTac, fallback SQL:', spErr.message);
      const fallbackQuery = `
        SELECT dbo.tblnhanvien.*, dbo.tblbophan.tenbophan
        FROM dbo.tblnhanvien
        INNER JOIN dbo.tblbophan ON dbo.tblnhanvien.idbophan = dbo.tblbophan.id
        WHERE dbo.tblnhanvien.issudung = 1 AND dbo.tblbophan.trangthaisudung = 1 
          AND dbo.tblnhanvien.isdanghicongtac = 0
        ORDER BY dbo.tblnhanvien.hoten, dbo.tblbophan.tenbophan ASC
      `;
      const queryRes = await request.query(fallbackQuery);
      rows = queryRes.recordset || [];
    }

    const items = rows.map((r, idx) => ({
      stt: idx + 1,
      idnhanvien: r.idnhanvien,
      hoten: r.hoten || '',
      dienthoai: r.dienthoai || '',
      tendangnhap: r.tendangnhap || '',
      matkhau: r.matkhau || '',
      tenbophan: r.tenbophan || 'Chưa phân bộ phận',
    }));

    return res.json({ items });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('idnhanvien', sql.VarChar(12), req.user.idnhanvien)
      .query(`
        SELECT nv.idnhanvien, nv.hoten, nv.dienthoai, nv.email, nv.tendangnhap,
               nv.idbophan, bp.tenbophan, nv.issudung, nv.isdanghicongtac
        FROM dbo.tblnhanvien nv
        LEFT JOIN dbo.tblbophan bp ON nv.idbophan = bp.id
        WHERE nv.idnhanvien = @idnhanvien
      `);

    const user = result.recordset[0];
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên.' });
    }

    const permResult = await pool
      .request()
      .input('idnhanvien', sql.VarChar(12), user.idnhanvien)
      .query(`
        SELECT pq.MAMN, mn.TENMN, pq.isxem, pq.issua, pq.isthemmoi, pq.isxoa, pq.isprint, pq.issearch
        FROM dbo.tblphanquyen pq
        LEFT JOIN dbo.tblmenu mn ON pq.MAMN = mn.MAMN
        WHERE pq.idnhanvien = @idnhanvien
      `);

    return res.json({ user, permissions: permResult.recordset });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Kiểm tra mật khẩu cũ của nhân viên (hỗ trợ cả dạng thường lẫn mã hóa MD5 Encoding.Unicode)
 */
function verifyStoredPassword(dbPassword, inputPassword) {
  const stored = String(dbPassword ?? '');
  const entered = String(inputPassword ?? '');
  if (!entered || !stored) return { matched: false, mode: null };

  const storedTrimUpper = stored.trim().toUpperCase();
  const enteredTrimUpper = entered.trim().toUpperCase();
  const enteredMd5 = createMD5(entered);

  // 1. Mật khẩu nhập dạng thường -> hash MD5 trùng với chuỗi MD5 trong DB
  if (enteredMd5 === storedTrimUpper) {
    return { matched: true, mode: 'md5' };
  }
  // 2. Mật khẩu nhập dạng chuỗi MD5 trực tiếp (32 ký tự hex) trùng với DB
  if (/^[0-9A-F]{32}$/.test(enteredTrimUpper) && enteredTrimUpper === storedTrimUpper) {
    return { matched: true, mode: 'md5_raw' };
  }
  // 3. Mật khẩu lưu dạng thường trong DB trùng trực tiếp với mật khẩu nhập
  if (entered === stored || entered.trim() === stored.trim()) {
    return { matched: true, mode: 'plain' };
  }

  return { matched: false, mode: null };
}

/**
 * POST /api/auth/verify-password
 * Kiểm tra mật khẩu cũ (dạng thường hoặc MD5) trước khi cho phép nhập mật khẩu mới
 */
router.post('/verify-password', authMiddleware, async (req, res) => {
  const { oldPassword } = req.body || {};
  if (!oldPassword) {
    return res.status(400).json({ ok: false, error: 'Vui lòng nhập mật khẩu cũ.' });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('idnhanvien', sql.VarChar(12), req.user.idnhanvien)
      .query(`
        SELECT TOP 1 idnhanvien, tendangnhap, matkhau
        FROM dbo.tblnhanvien
        WHERE idnhanvien = @idnhanvien
      `);

    const row = result.recordset[0];
    if (!row) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy tài khoản nhân viên.' });
    }

    const check = verifyStoredPassword(row.matkhau, oldPassword);
    if (!check.matched) {
      return res.status(400).json({
        ok: false,
        error: 'Mật khẩu cũ không đúng. Vui lòng kiểm tra lại (hỗ trợ dạng thường hoặc MD5).',
      });
    }

    return res.json({
      ok: true,
      mode: check.mode,
      taikhoan: row.tendangnhap || req.user.tendangnhap || '',
      message:
        check.mode === 'plain'
          ? 'Xác thực mật khẩu cũ thành công (dạng thường).'
          : 'Xác thực mật khẩu cũ thành công (chuẩn MD5).',
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/auth/change-password
 * Đổi mật khẩu qua Stored Procedure: dbo.tblNhanVien_DoiMatKhau
 * Tham số: @idnhanvien, @taikhoan, @matkhau = Util.CreateMD5(matkhau)
 */
router.post('/change-password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới.' });
  }
  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Mật khẩu mới và xác nhận mật khẩu không trùng khớp.' });
  }

  try {
    const pool = await getPool();
    const userRes = await pool
      .request()
      .input('idnhanvien', sql.VarChar(12), req.user.idnhanvien)
      .query(`
        SELECT TOP 1 idnhanvien, tendangnhap, matkhau
        FROM dbo.tblnhanvien
        WHERE idnhanvien = @idnhanvien
      `);

    const row = userRes.recordset[0];
    if (!row) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản nhân viên.' });
    }

    const check = verifyStoredPassword(row.matkhau, oldPassword);
    if (!check.matched) {
      return res.status(400).json({ error: 'Mật khẩu cũ không đúng.' });
    }

    const taikhoan = (row.tendangnhap || req.user.tendangnhap || '').trim();
    const hashedNewPassword = createMD5(newPassword);

    try {
      const spReq = pool.request();
      spReq.input('idnhanvien', sql.VarChar(12), req.user.idnhanvien);
      spReq.input('taikhoan', sql.NVarChar(50), taikhoan);
      spReq.input('matkhau', sql.NVarChar(50), hashedNewPassword);
      await spReq.execute('dbo.tblNhanVien_DoiMatKhau');
    } catch (spErr) {
      console.warn('Lỗi execute dbo.tblNhanVien_DoiMatKhau, fallback SQL:', spErr.message);
      await pool
        .request()
        .input('idnhanvien', sql.VarChar(12), req.user.idnhanvien)
        .input('taikhoan', sql.NVarChar(50), taikhoan)
        .input('matkhau', sql.NVarChar(50), hashedNewPassword)
        .query(`
          UPDATE dbo.tblnhanvien
          SET tendangnhap = @taikhoan, matkhau = @matkhau
          WHERE idnhanvien = @idnhanvien
        `);
    }

    return res.json({
      ok: true,
      message: 'Đổi mật khẩu thành công! Mật khẩu mới đã được mã hóa MD5 và lưu vào hệ thống.',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
