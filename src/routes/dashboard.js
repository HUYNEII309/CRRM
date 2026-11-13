const express = require('express');
const { getPool, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const scope = req.query.scope === 'all' ? 'all' : 'mine';
  const idnhanvien = req.query.idnhanvien || req.user.idnhanvien;

  try {
    const pool = await getPool();
    const request = pool.request().input('idnhanvien', sql.VarChar(12), idnhanvien);

    const filterStaffThu = scope === 'all' ? '1=1' : 'idnhanvienthu = @idnhanvien';
    const filterStaffCS = scope === 'all' ? '1=1' : 'cs.idnhanvien = @idnhanvien';
    const filterStaffLH = scope === 'all' ? '1=1' : '(lh.idnhanvien = @idnhanvien OR lh.idnguoiduocgiao = @idnhanvien)';
    const filterStaffGDV = scope === 'all' ? '1=1' : 'gdv.idnhanvien = @idnhanvien';
    const filterStaffKH = scope === 'all' ? '1=1' : 'kh.idnhanvien = @idnhanvien';

    const [
      doanhSoRes,
      giaoDichRes,
      tongKhachRes,
      taskOpenRes,
      lichHenRes,
      khachQuanTamRes,
      sapHetHanRes,
      hopDong6ThangRes,
      thongBaoRes,
    ] = await Promise.all([
      request.query(`
        SELECT ISNULL(SUM(sotien), 0) AS doanhSoThang
        FROM dbo.tblkhoanthu
        WHERE ${filterStaffThu}
          AND MONTH(thoigianthu) = MONTH(GETDATE())
          AND YEAR(thoigianthu) = YEAR(GETDATE())
      `),
      pool.request().input('idnhanvien', sql.VarChar(12), idnhanvien).query(`
        SELECT COUNT(*) AS giaoDichHomNay
        FROM dbo.tblchamsockhachhang cs
        WHERE ${filterStaffCS}
          AND CAST(cs.ngaythang AS DATE) = CAST(GETDATE() AS DATE)
      `),
      pool.request().input('idnhanvien', sql.VarChar(12), idnhanvien).query(`
        SELECT COUNT(*) AS tongKhachHang
        FROM dbo.tblkhachhang kh
        WHERE (kh.trangthaisudung = 1 OR kh.trangthaisudung IS NULL)
          AND ${filterStaffKH}
      `),
      pool.request().input('idnhanvien', sql.VarChar(12), idnhanvien).query(`
        SELECT COUNT(*) AS taskDangMo
        FROM dbo.tbltasklist t
        WHERE (t.idnguoithuchien = @idnhanvien OR '${scope}' = 'all')
          AND ISNULL(t.idtrangthaitasklist, '') NOT IN ('201711010003', 'HOANTHANH')
      `),
      pool.request().input('idnhanvien', sql.VarChar(12), idnhanvien).query(`
        SELECT lh.idlichhen, lh.ngayhen, lh.giohen, lh.noidunghen, lh.dienthoaihen,
               kh.idkhachhang, kh.tenkhachhang, nv.hoten AS tennhanvien
        FROM dbo.tbllichhen lh
        LEFT JOIN dbo.tblkhachhang kh ON lh.idkhachhang = kh.idkhachhang
        LEFT JOIN dbo.tblnhanvien nv ON lh.idnguoiduocgiao = nv.idnhanvien
        WHERE ${filterStaffLH}
          AND lh.ngayhen = CAST(GETDATE() AS DATE)
          AND (lh.trangthaixuly = 0 OR lh.trangthaixuly IS NULL)
        ORDER BY lh.giohen ASC
      `),
      pool.request().input('idnhanvien', sql.VarChar(12), idnhanvien).query(`
        SELECT cs.idchamsockhachhang, cs.ngaythang, cs.ghichu,
               kh.idkhachhang, kh.tenkhachhang, kh.dienthoai
        FROM dbo.tblchamsockhachhang cs
        LEFT JOIN dbo.tblkhachhang kh ON cs.idkhachhang = kh.idkhachhang
        WHERE ${filterStaffCS}
          AND cs.isquantam = 1
          AND CAST(cs.ngaythang AS DATE) = CAST(GETDATE() AS DATE)
        ORDER BY cs.ngaythang DESC
      `),
      pool.request().input('idnhanvien', sql.VarChar(12), idnhanvien).query(`
        SELECT TOP 20 gdv.idgoidichvu, gdv.idkhachhang, kh.tenkhachhang, kh.dienthoai,
               lkh.tenloaikhachhang, gdv.ngayhethan, gdv.phidongtieptheo,
               DATEDIFF(day, CAST(GETDATE() AS DATE), CAST(gdv.ngayhethan AS DATE)) AS songayconlai
        FROM dbo.tblgoidichvu_hansudung gdv
        LEFT JOIN dbo.tblkhachhang kh ON gdv.idkhachhang = kh.idkhachhang
        LEFT JOIN dbo.tblloaikhachhang lkh ON gdv.idloaikhachhang = lkh.idloaikhachhang
        WHERE gdv.issudung = 1
          AND gdv.ngayhethan >= CAST(GETDATE() AS DATE)
          AND gdv.ngayhethan <= DATEADD(day, 30, CAST(GETDATE() AS DATE))
          AND ${filterStaffGDV}
        ORDER BY gdv.ngayhethan ASC
      `),
      pool.request().input('idnhanvien', sql.VarChar(12), idnhanvien).query(`
        SELECT TOP 20 kh.idkhachhang, kh.makhachhang, kh.tenkhachhang, kh.diachi, kh.dienthoai,
               (SELECT MAX(ngaythang) FROM dbo.tblchamsockhachhang WHERE idkhachhang = kh.idkhachhang AND iddanhgiakhachhang = '201711010001') AS ngayky
        FROM dbo.tblkhachhang kh
        WHERE ${filterStaffKH}
          AND EXISTS (
            SELECT 1 FROM dbo.tblchamsockhachhang cs_hd
            WHERE cs_hd.idkhachhang = kh.idkhachhang
              AND cs_hd.iddanhgiakhachhang = '201711010001'
            HAVING DATEDIFF(month, MAX(cs_hd.ngaythang), GETDATE()) >= 6
          )
          AND NOT EXISTS (
            SELECT 1 FROM dbo.tblchamsockhachhang cs_moi
            WHERE cs_moi.idkhachhang = kh.idkhachhang
              AND DATEDIFF(month, cs_moi.ngaythang, GETDATE()) < 6
          )
        ORDER BY ngayky ASC
      `),
      pool.request().query(`
        SELECT TOP 10 idthongbao, ngaygio, noidung
        FROM dbo.tbl_thongbao
        WHERE iskichhoat = 1
        ORDER BY ngaygio DESC
      `),
    ]);

    return res.json({
      kpis: {
        doanhSoThang: doanhSoRes.recordset[0]?.doanhSoThang || 0,
        giaoDichHomNay: giaoDichRes.recordset[0]?.giaoDichHomNay || 0,
        tongKhachHang: tongKhachRes.recordset[0]?.tongKhachHang || 0,
        taskDangMo: taskOpenRes.recordset[0]?.taskDangMo || 0,
        lichHenHomNayCount: lichHenRes.recordset.length,
        dichVuSapHetHanCount: sapHetHanRes.recordset.length,
      },
      lichHenHomNay: lichHenRes.recordset,
      khachQuanTamHomNay: khachQuanTamRes.recordset,
      dichVuSapHetHan: sapHetHanRes.recordset,
      hopDongQua6Thang: hopDong6ThangRes.recordset,
      thongBao: thongBaoRes.recordset,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
