const express = require('express');
const { getPool, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * Tính khoảng ngày mặc định từ ngày đầu tháng đến ngày cuối tháng hiện tại
 */
function getDefaultMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);

  const fmt = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    from: fmt(first),
    to: fmt(last),
  };
}

/**
 * GET /api/ktv-time
 * Thực thi Stored Procedure: dbo.tblnhanvien_Select_TongHopDiem_TungNguoi(@tuNgay, @denNgay)
 * Trả về danh sách: hoten, tongdiem (giờ thực tế), tongdukiensogiolam (giờ dự kiến)
 */
router.get('/', async (req, res) => {
  const defaults = getDefaultMonthRange();
  const from = req.query.from || defaults.from;
  const to = req.query.to || defaults.to;
  const q = (req.query.q || '').trim().toLowerCase();
  const sort = req.query.sort || 'thucte_desc';

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('tuNgay', sql.Date, from);
    request.input('denNgay', sql.Date, to);

    let rows = [];
    try {
      // 1. Gọi trực tiếp Stored Procedure theo đúng C# code của hệ thống CRMPLUS:
      // SqlHelper.ExecuteData(CommandType.StoredProcedure, "tblnhanvien_Select_TongHopDiem_TungNguoi", ...)
      const procRes = await request.execute('dbo.tblnhanvien_Select_TongHopDiem_TungNguoi');
      rows = procRes.recordset || [];
    } catch (procErr) {
      console.warn('Lỗi execute Stored Procedure, fallback sang query tương đương:', procErr.message);
      // Fallback query trực tiếp cùng logic của Stored Procedure
      const fallbackQuery = `
        Delete from dbo.tblThongKeDiem;
        INSERT INTO dbo.tblThongKeDiem(hoten,diem,dukiensogiolam)
        select tblnhanvien.hoten, sum(tbldauvieccodinh.diem) as tongdiem,sum(tbldauvieccodinh.dukiensogiolam) as tongdukiensogiolam
        from dbo.tbldauvieccodinh
        inner join dbo.tblnhanvien on tblnhanvien.idnhanvien = tbldauvieccodinh.idnhanvienlam
        where convert(date,tbldauvieccodinh.ngaygioduyet) >= @tuNgay and convert(date,tbldauvieccodinh.ngaygioduyet)<= @denNgay
        group by tblnhanvien.hoten
        UNION
        select tblnhanvien.hoten, sum(tbldauviecphatsinh.diem) as tongdiem ,sum(tbldauviecphatsinh.dukiensogiolam) as tongdukiensogiolam
        from dbo.tbldauviecphatsinh
        inner join dbo.tblnhanvien on tblnhanvien.idnhanvien = tbldauviecphatsinh.idnhanvienlam
        where convert(date,tbldauviecphatsinh.ngaygioduyet) >= @tuNgay and convert(date,tbldauviecphatsinh.ngaygioduyet)<= @denNgay
        group by tblnhanvien.hoten;

        SELECT hoten, sum(diem) as tongdiem, SUM(dukiensogiolam) as tongdukiensogiolam
        FROM dbo.tblThongKeDiem
        GROUP BY hoten
        ORDER BY tongdiem desc;
      `;
      const queryRes = await request.query(fallbackQuery);
      rows = queryRes.recordset || [];
    }

    // 2. Lấy thông tin bổ sung của nhân viên (Mã NV, SĐT, Bộ phận, Email) để hiển thị đẹp mắt
    let staffMap = new Map();
    try {
      const staffRes = await pool.request().query(`
        SELECT nv.idnhanvien, nv.hoten, nv.tendangnhap, nv.dienthoai, nv.email, bp.tenbophan
        FROM dbo.tblnhanvien nv
        LEFT JOIN dbo.tblbophan bp ON nv.idbophan = bp.id
      `);
      (staffRes.recordset || []).forEach((s) => {
        if (s.hoten) staffMap.set(s.hoten.trim().toLowerCase(), s);
      });
    } catch (e) {
      console.warn('Không thể load bổ trợ tblnhanvien:', e.message);
    }

    let items = rows.map((r) => {
      const nameKey = (r.hoten || '').trim().toLowerCase();
      const staffInfo = staffMap.get(nameKey) || {};
      const tongthucte = Math.round(Number(r.tongdiem || 0) * 10) / 10;
      const tongdukien = Math.round(Number(r.dukiensogiolam ?? r.tongdukiensogiolam ?? 0) * 10) / 10;
      const chenhlech = Math.round((tongthucte - tongdukien) * 10) / 10;
      const hieusuat = tongdukien > 0 ? Math.round((tongthucte / tongdukien) * 1000) / 10 : (tongthucte > 0 ? 100 : 0);

      return {
        hoten: r.hoten || 'Chưa đặt tên',
        idnhanvien: staffInfo.idnhanvien || '',
        tendangnhap: staffInfo.tendangnhap || '',
        dienthoai: staffInfo.dienthoai || '',
        email: staffInfo.email || '',
        tenbophan: staffInfo.tenbophan || 'Kỹ thuật',
        tongthucte, // Điểm = Giờ làm thực tế
        tongdukien, // Dự kiến số giờ làm
        chenhlech,
        hieusuat,
      };
    });

    // Lọc theo từ khóa nếu có
    if (q) {
      items = items.filter((i) => 
        (i.hoten || '').toLowerCase().includes(q) ||
        (i.dienthoai || '').includes(q) ||
        (i.tendangnhap || '').toLowerCase().includes(q)
      );
    }

    // Sắp xếp thời gian
    if (sort === 'thucte_asc') {
      items.sort((a, b) => a.tongthucte - b.tongthucte);
    } else if (sort === 'dukien_desc') {
      items.sort((a, b) => b.tongdukien - a.tongdukien);
    } else if (sort === 'dukien_asc') {
      items.sort((a, b) => a.tongdukien - b.tongdukien);
    } else if (sort === 'hieusuat_desc') {
      items.sort((a, b) => b.hieusuat - a.hieusuat || b.tongthucte - a.tongthucte);
    } else if (sort === 'name') {
      items.sort((a, b) => (a.hoten || '').localeCompare(b.hoten || ''));
    } else {
      // Mặc định: Giờ thực tế từ cao xuống thấp (theo đúng Stored Procedure ORDER BY tongdiem desc)
      items.sort((a, b) => b.tongthucte - a.tongthucte || b.tongdukien - a.tongdukien);
    }

    // Đánh số theo thứ tự STT: 1, 2, 3...
    items = items.map((item, idx) => ({
      stt: idx + 1,
      ...item,
    }));

    const totalDukien = Math.round(items.reduce((sum, i) => sum + i.tongdukien, 0) * 10) / 10;
    const totalThucte = Math.round(items.reduce((sum, i) => sum + i.tongthucte, 0) * 10) / 10;
    const avgHieusuat = totalDukien > 0 ? Math.round((totalThucte / totalDukien) * 1000) / 10 : 0;

    return res.json({
      from,
      to,
      sort,
      summary: {
        totalKtvs: items.length,
        totalDukien,
        totalThucte,
        avgHieusuat,
      },
      items,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
