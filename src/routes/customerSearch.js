const express = require('express');
const { getPool, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/customer-search
 * Tra cứu khách hàng theo 4 Stored Procedure chuyên biệt:
 * 1. Tên khách hàng: dbo.tblkhachhang_SelectByTenKhachHang (@tenkhachhang)
 * 2. Điện thoại: dbo.tblkhachhang_SelectAllDienThoai (@dienthoai)
 * 3. Địa chỉ: dbo.tblkhachhang_SelectByDiaChiKhachHang (@diachi)
 * 4. Mã KH: dbo.tblkhachhang_SelectBySelectByMaKH (@makhachhang)
 */
router.get('/', async (req, res) => {
  const tenkhachhang = (req.query.tenkhachhang || '').trim();
  const dienthoai = (req.query.dienthoai || '').trim();
  const diachi = (req.query.diachi || '').trim();
  const makhachhang = (req.query.makhachhang || '').trim();

  try {
    const pool = await getPool();
    let rows = [];
    let spExecuted = '';

    // 1. Ưu tiên tìm theo Mã KH nếu có nhập
    if (makhachhang) {
      spExecuted = 'tblkhachhang_SelectBySelectByMaKH';
      const request = pool.request();
      request.input('makhachhang', sql.NVarChar(50), makhachhang);
      try {
        const result = await request.execute('dbo.tblkhachhang_SelectBySelectByMaKH');
        rows = result.recordset || [];
      } catch (spErr) {
        console.warn(`Lỗi execute ${spExecuted}, fallback sang SQL:`, spErr.message);
        const fallbackRes = await request.query(`
          SELECT kh.*, lkh.tenloaikhachhang, nv.hoten AS tennhanvien
          FROM dbo.tblkhachhang kh
          LEFT JOIN dbo.tblloaikhachhang lkh ON kh.idloaikhachhang = lkh.idloaikhachhang
          LEFT JOIN dbo.tblnhanvien nv ON kh.idnhanvien = nv.idnhanvien
          WHERE kh.makhachhang = @makhachhang OR CAST(kh.makhachhang AS NVARCHAR(50)) LIKE '%' + @makhachhang + '%'
          ORDER BY kh.ngaynhap DESC
        `);
        rows = fallbackRes.recordset || [];
      }
    }
    // 2. Tìm theo Điện thoại nếu có nhập
    else if (dienthoai) {
      spExecuted = 'tblkhachhang_SelectAllDienThoai';
      const request = pool.request();
      request.input('dienthoai', sql.NVarChar(50), dienthoai);
      try {
        const result = await request.execute('dbo.tblkhachhang_SelectAllDienThoai');
        rows = result.recordset || [];
      } catch (spErr) {
        console.warn(`Lỗi execute ${spExecuted}, fallback sang SQL:`, spErr.message);
        const fallbackRes = await request.query(`
          SELECT kh.*, lkh.tenloaikhachhang, nv.hoten AS tennhanvien
          FROM dbo.tblkhachhang kh
          LEFT JOIN dbo.tblloaikhachhang lkh ON kh.idloaikhachhang = lkh.idloaikhachhang
          LEFT JOIN dbo.tblnhanvien nv ON kh.idnhanvien = nv.idnhanvien
          WHERE kh.dienthoai LIKE '%' + @dienthoai + '%' OR kh.dienthoaisms LIKE '%' + @dienthoai + '%'
          ORDER BY kh.ngaynhap DESC
        `);
        rows = fallbackRes.recordset || [];
      }
    }
    // 3. Tìm theo Tên khách hàng nếu có nhập
    else if (tenkhachhang) {
      spExecuted = 'tblkhachhang_SelectByTenKhachHang';
      const request = pool.request();
      request.input('tenkhachhang', sql.NVarChar(150), tenkhachhang);
      try {
        const result = await request.execute('dbo.tblkhachhang_SelectByTenKhachHang');
        rows = result.recordset || [];
      } catch (spErr) {
        console.warn(`Lỗi execute ${spExecuted}, fallback sang SQL:`, spErr.message);
        const fallbackRes = await request.query(`
          SELECT kh.*, lkh.tenloaikhachhang, nv.hoten AS tennhanvien
          FROM dbo.tblkhachhang kh
          LEFT JOIN dbo.tblloaikhachhang lkh ON kh.idloaikhachhang = lkh.idloaikhachhang
          LEFT JOIN dbo.tblnhanvien nv ON kh.idnhanvien = nv.idnhanvien
          WHERE kh.tenkhachhang LIKE N'%' + @tenkhachhang + N'%'
          ORDER BY kh.ngaynhap DESC
        `);
        rows = fallbackRes.recordset || [];
      }
    }
    // 4. Tìm theo Địa chỉ nếu có nhập
    else if (diachi) {
      spExecuted = 'tblkhachhang_SelectByDiaChiKhachHang';
      const request = pool.request();
      request.input('diachi', sql.NVarChar(250), diachi);
      try {
        const result = await request.execute('dbo.tblkhachhang_SelectByDiaChiKhachHang');
        rows = result.recordset || [];
      } catch (spErr) {
        console.warn(`Lỗi execute ${spExecuted}, fallback sang SQL:`, spErr.message);
        const fallbackRes = await request.query(`
          SELECT kh.*, lkh.tenloaikhachhang, nv.hoten AS tennhanvien
          FROM dbo.tblkhachhang kh
          LEFT JOIN dbo.tblloaikhachhang lkh ON kh.idloaikhachhang = lkh.idloaikhachhang
          LEFT JOIN dbo.tblnhanvien nv ON kh.idnhanvien = nv.idnhanvien
          WHERE kh.diachi LIKE N'%' + @diachi + N'%'
          ORDER BY kh.ngaynhap DESC
        `);
        rows = fallbackRes.recordset || [];
      }
    }
    // 5. Nếu không nhập tiêu chí nào, tải 50 khách hàng mới nhất
    else {
      const fallbackRes = await pool.request().query(`
        SELECT TOP 50 kh.*, lkh.tenloaikhachhang, nv.hoten AS tennhanvien
        FROM dbo.tblkhachhang kh
        LEFT JOIN dbo.tblloaikhachhang lkh ON kh.idloaikhachhang = lkh.idloaikhachhang
        LEFT JOIN dbo.tblnhanvien nv ON kh.idnhanvien = nv.idnhanvien
        ORDER BY kh.ngaynhap DESC, kh.makhachhang DESC
      `);
      rows = fallbackRes.recordset || [];
    }

    // Nếu người dùng nhập kết hợp nhiều tiêu chí, lọc kết quả thêm trong bộ nhớ
    if (tenkhachhang && spExecuted !== 'tblkhachhang_SelectByTenKhachHang') {
      const q = tenkhachhang.toLowerCase();
      rows = rows.filter((r) => (r.tenkhachhang || '').toLowerCase().includes(q));
    }
    if (dienthoai && spExecuted !== 'tblkhachhang_SelectAllDienThoai') {
      rows = rows.filter((r) => (r.dienthoai || '').includes(dienthoai) || (r.dienthoaisms || '').includes(dienthoai));
    }
    if (diachi && spExecuted !== 'tblkhachhang_SelectByDiaChiKhachHang') {
      const q = diachi.toLowerCase();
      rows = rows.filter((r) => (r.diachi || '').toLowerCase().includes(q));
    }
    if (makhachhang && spExecuted !== 'tblkhachhang_SelectBySelectByMaKH') {
      rows = rows.filter((r) => String(r.makhachhang || '').includes(makhachhang));
    }

    // Map STT
    const items = rows.map((r, idx) => ({
      stt: idx + 1,
      idkhachhang: r.idkhachhang,
      makhachhang: r.makhachhang,
      tenkhachhang: r.tenkhachhang || '',
      diachi: r.diachi || '',
      dienthoai: r.dienthoai || '',
      email: r.email || '',
      tennguoilienlac: r.tennguoilienlac || '',
      dienthoainguoilienlac: r.dienthoainguoilienlac || '',
      tenloaikhachhang: r.tenloaikhachhang || '',
      tennhanvien: r.tennhanvien || '',
      ngaynhap: r.ngaynhap,
      ghichu: r.ghichu || '',
    }));

    return res.json({
      spExecuted,
      total: items.length,
      items,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/customer-search/care
 * Khi tích/chọn khách hàng, gọi Stored Procedure:
 * dbo.tblchamsockhachhang_SelectAll_ByIdKhachHang (@idkhachhang)
 * Trả về chi tiết lịch sử chăm sóc khách hàng của khách hàng đó.
 */
router.get('/care', async (req, res) => {
  const idkhachhang = (req.query.idkhachhang || '').trim();

  if (!idkhachhang) {
    return res.status(400).json({ error: 'Cần cung cấp mã ID khách hàng (idkhachhang).' });
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('idkhachhang', sql.VarChar(12), idkhachhang);

    let rows = [];
    try {
      // 1. Thực thi Stored Procedure theo đúng yêu cầu:
      // dbo.tblchamsockhachhang_SelectAll_ByIdKhachHang (@idkhachhang)
      const spResult = await request.execute('dbo.tblchamsockhachhang_SelectAll_ByIdKhachHang');
      rows = spResult.recordset || [];
    } catch (spErr) {
      console.warn('Lỗi execute tblchamsockhachhang_SelectAll_ByIdKhachHang, fallback SQL:', spErr.message);
      // Fallback query trực tiếp
      const fallbackResult = await request.query(`
        SELECT cs.*, kh.tenkhachhang, kh.dienthoai,
               ht.tenhinhthuc, dg.tendanhgiakhachhang, ld.tenlydokhachhang,
               tt.tentrangthai, nv.hoten AS tennhanvien
        FROM dbo.tblchamsockhachhang cs
        LEFT JOIN dbo.tblkhachhang kh ON cs.idkhachhang = kh.idkhachhang
        LEFT JOIN dbo.tblhinhthucchamsoc ht ON cs.idhinhthucchamsoc = ht.idhinhthucchamsoc
        LEFT JOIN dbo.tbldanhgiakhachhang dg ON cs.iddanhgiakhachhang = dg.iddanhgiakhachhang
        LEFT JOIN dbo.tbllydokhachhang ld ON cs.idlydokhachhang = ld.idlydokhachhang
        LEFT JOIN dbo.tbltrangthaikhachhang tt ON cs.idtrangthai = tt.idtrangthai
        LEFT JOIN dbo.tblnhanvien nv ON cs.idnhanvien = nv.idnhanvien
        WHERE cs.idkhachhang = @idkhachhang
        ORDER BY cs.ngaythang DESC
      `);
      rows = fallbackResult.recordset || [];
    }

    // Lấy thông tin bổ sung danh mục (Hình thức, Đánh giá, Lý do, Nhân viên) nếu SP chỉ trả raw id
    let hinhThucMap = new Map();
    let danhGiaMap = new Map();
    let lyDoMap = new Map();
    let trangThaiMap = new Map();
    let staffMap = new Map();

    const needsEnrichment = rows.some((r) => !r.tenhinhthuc || !r.tendanhgiakhachhang || !r.tennhanvien);
    if (needsEnrichment && rows.length > 0) {
      try {
        const [htRes, dgRes, ldRes, ttRes, nvRes] = await Promise.all([
          pool.request().query('SELECT idhinhthucchamsoc, tenhinhthuc FROM dbo.tblhinhthucchamsoc'),
          pool.request().query('SELECT iddanhgiakhachhang, tendanhgiakhachhang FROM dbo.tbldanhgiakhachhang'),
          pool.request().query('SELECT idlydokhachhang, tenlydokhachhang FROM dbo.tbllydokhachhang'),
          pool.request().query('SELECT idtrangthai, tentrangthai FROM dbo.tbltrangthaikhachhang'),
          pool.request().query('SELECT idnhanvien, hoten FROM dbo.tblnhanvien'),
        ]);
        (htRes.recordset || []).forEach((x) => hinhThucMap.set(x.idhinhthucchamsoc, x.tenhinhthuc));
        (dgRes.recordset || []).forEach((x) => danhGiaMap.set(x.iddanhgiakhachhang, x.tendanhgiakhachhang));
        (ldRes.recordset || []).forEach((x) => lyDoMap.set(x.idlydokhachhang, x.tenlydokhachhang));
        (ttRes.recordset || []).forEach((x) => trangThaiMap.set(x.idtrangthai, x.tentrangthai));
        (nvRes.recordset || []).forEach((x) => staffMap.set(x.idnhanvien, x.hoten));
      } catch (catErr) {
        console.warn('Không thể load danh mục bổ trợ:', catErr.message);
      }
    }

    const items = rows.map((r, idx) => ({
      stt: idx + 1,
      idchamsoc: r.idchamsoc,
      idkhachhang: r.idkhachhang,
      ngaythang: r.ngaythang,
      tenhinhthuc: r.tenhinhthuc || hinhThucMap.get(r.idhinhthucchamsoc) || 'Chăm sóc',
      tendanhgiakhachhang: r.tendanhgiakhachhang || danhGiaMap.get(r.iddanhgiakhachhang) || '-',
      tenlydokhachhang: r.tenlydokhachhang || lyDoMap.get(r.idlydokhachhang) || '-',
      tentrangthai: r.tentrangthai || trangThaiMap.get(r.idtrangthai) || '-',
      tennhanvien: r.tennhanvien || r.hoten || staffMap.get(r.idnhanvien) || '-',
      isquantam: Boolean(r.isquantam),
      ghichu: r.ghichu || '',
      noidungchamsoc: r.noidungchamsoc || r.ghichu || '',
    }));

    return res.json({
      idkhachhang,
      total: items.length,
      items,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
