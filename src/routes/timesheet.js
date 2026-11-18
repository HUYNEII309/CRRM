const express = require('express');
const { getPool, sql } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * Tự động nhận diện định dạng chuỗi thangnam đang được lưu trong dbo.tbl_BangChamCong
 * (ví dụ: '11/2026', '5/2026', '11-2026', '2026-11', '202611', '112026')
 * để tránh tạo bản ghi trùng lặp sai định dạng khi gọi SP tblNhanVien_KhoiTao_BangChamCong.
 */
async function resolveThangNamFormat(pool, month, year, explicitThangNam = '') {
  const trimmedExplicit = String(explicitThangNam || '').trim();
  if (trimmedExplicit && trimmedExplicit.length <= 12) {
    return trimmedExplicit;
  }

  const mm = String(month).padStart(2, '0');
  const m = String(month);
  const yyyy = String(year);

  const candidates = Array.from(
    new Set([
      `${mm}/${yyyy}`,
      `${m}/${yyyy}`,
      `${mm}-${yyyy}`,
      `${m}-${yyyy}`,
      `${yyyy}-${mm}`,
      `${yyyy}/${mm}`,
      `${yyyy}${mm}`,
      `${mm}${yyyy}`,
    ])
  );

  // 1. Kiểm tra xem tháng/năm này đã tồn tại trong dbo.tbl_BangChamCong với định dạng nào chưa
  try {
    const reqCheck = pool.request();
    const placeholders = candidates.map((val, idx) => {
      reqCheck.input(`c${idx}`, sql.VarChar(12), val);
      return `@c${idx}`;
    });
    const existing = await reqCheck.query(`
      SELECT TOP 1 thangnam
      FROM dbo.tbl_BangChamCong
      WHERE thangnam IN (${placeholders.join(', ')})
    `);
    if (existing.recordset && existing.recordset.length > 0 && existing.recordset[0].thangnam) {
      return String(existing.recordset[0].thangnam).trim();
    }
  } catch (e) {
    // Bỏ qua nếu bảng chưa có dữ liệu hoặc lỗi nhỏ
  }

  // 2. Nếu chưa có bản ghi cho tháng/năm này, dò định dạng từ các bản ghi gần nhất trong bảng
  try {
    const recentRes = await pool.request().query(`
      SELECT TOP 30 thangnam
      FROM dbo.tbl_BangChamCong
      WHERE thangnam IS NOT NULL AND LTRIM(RTRIM(thangnam)) <> ''
      ORDER BY idbangchamcong DESC
    `);
    const samples = (recentRes.recordset || [])
      .map((r) => String(r.thangnam || '').trim())
      .filter(Boolean);

    if (samples.length > 0) {
      const slashSamples = samples.filter((s) => /^\d{1,2}\/\d{4}$/.test(s));
      if (slashSamples.length > 0) {
        const hasUnpaddedSingle = slashSamples.some((s) => /^[1-9]\/\d{4}$/.test(s));
        const hasPaddedSingle = slashSamples.some((s) => /^0[1-9]\/\d{4}$/.test(s));
        if (hasUnpaddedSingle && !hasPaddedSingle) return `${m}/${yyyy}`;
        return `${mm}/${yyyy}`;
      }

      const dashSamples = samples.filter((s) => /^\d{1,2}-\d{4}$/.test(s));
      if (dashSamples.length > 0) {
        const hasUnpaddedSingle = dashSamples.some((s) => /^[1-9]-\d{4}$/.test(s));
        const hasPaddedSingle = dashSamples.some((s) => /^0[1-9]-\d{4}$/.test(s));
        if (hasUnpaddedSingle && !hasPaddedSingle) return `${m}-${yyyy}`;
        return `${mm}-${yyyy}`;
      }

      if (samples.some((s) => /^\d{4}-\d{2}$/.test(s))) return `${yyyy}-${mm}`;
      if (samples.some((s) => /^\d{4}\/\d{2}$/.test(s))) return `${yyyy}/${mm}`;

      const sixDigitSamples = samples.filter((s) => /^\d{6}$/.test(s));
      if (sixDigitSamples.length > 0) {
        if (sixDigitSamples.some((s) => /^(19|20)\d{4}$/.test(s))) return `${yyyy}${mm}`;
        return `${mm}${yyyy}`;
      }
    }
  } catch (e) {
    // Fallback sang định dạng chuẩn MM/yyyy
  }

  return `${mm}/${yyyy}`;
}

/**
 * GET /api/timesheet
 * Tìm và khởi tạo bảng chấm công nhân viên theo tháng & năm
 * Stored Procedure: dbo.tblNhanVien_KhoiTao_BangChamCong (@thangnam varchar(12))
 */
router.get('/', async (req, res) => {
  const now = new Date();
  let month = parseInt(req.query.month, 10);
  let year = parseInt(req.query.year, 10);

  if (Number.isNaN(month) || month < 1 || month > 12) {
    month = now.getMonth() + 1;
  }
  if (Number.isNaN(year) || year < 2000 || year > 2100) {
    year = now.getFullYear();
  }

  const explicitThangNam = req.query.thangnam || '';
  const daysInMonth = new Date(year, month, 0).getDate();

  try {
    const pool = await getPool();
    const thangnam = await resolveThangNamFormat(pool, month, year, explicitThangNam);

    let rows = [];
    try {
      const request = pool.request();
      request.input('thangnam', sql.VarChar(12), thangnam);
      const procRes = await request.execute('dbo.tblNhanVien_KhoiTao_BangChamCong');
      rows = procRes.recordset || [];
    } catch (procErr) {
      console.warn(
        'Lỗi execute dbo.tblNhanVien_KhoiTao_BangChamCong, fallback sang SQL tương đương:',
        procErr.message
      );
      const fbReq = pool.request();
      fbReq.input('thangnam', sql.VarChar(12), thangnam);
      const fbRes = await fbReq.query(`
        INSERT INTO dbo.tbl_BangChamCong(
          thangnam, idnhanvien,
          day1,day2,day3,day4,day5,day6,day7,day8,day9,day10,
          day11,day12,day13,day14,day15,day16,day17,day18,day19,day20,
          day21,day22,day23,day24,day25,day26,day27,day28,day29,day30,day31,ghichu
        )
        SELECT DISTINCT
          @thangnam, idnhanvien,
          0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,''
        FROM dbo.tblNhanVien
        WHERE dbo.tblNhanVien.hoten != 'admin'
          AND dbo.tblNhanVien.isdanghicongtac = 0
          AND dbo.tblNhanVien.idnhanvien NOT IN (
            SELECT dbo.tbl_BangChamCong.idnhanvien
            FROM dbo.tbl_BangChamCong
            INNER JOIN dbo.tblNhanVien ON dbo.tblNhanVien.idnhanvien = dbo.tbl_BangChamCong.idnhanvien
            WHERE dbo.tbl_BangChamCong.thangnam = @thangnam
          );

        SELECT dbo.tbl_BangChamCong.*, dbo.tblNhanVien.hoten AS tennhanvien
        FROM dbo.tbl_BangChamCong
        INNER JOIN dbo.tblNhanVien ON dbo.tbl_BangChamCong.idnhanvien = dbo.tblNhanVien.idnhanvien
        WHERE dbo.tbl_BangChamCong.thangnam = @thangnam
          AND dbo.tblNhanVien.isdanghicongtac = 0;
      `);
      rows = fbRes.recordset || [];
    }

    // Bổ sung thông tin bộ phận cho nhân viên (nếu có)
    const deptMap = new Map();
    try {
      const staffRes = await pool.request().query(`
        SELECT nv.idnhanvien, bp.tenbophan
        FROM dbo.tblnhanvien nv
        LEFT JOIN dbo.tblbophan bp ON nv.idbophan = bp.id
      `);
      (staffRes.recordset || []).forEach((s) => {
        if (s.idnhanvien) {
          deptMap.set(String(s.idnhanvien).trim(), s.tenbophan || '');
        }
      });
    } catch (_) {
      // Không bắt buộc
    }

    // Tính số ngày công chuẩn theo lịch làm việc (Thứ 2 -> Thứ 6: 1 ngày, Sáng Thứ 7: 0.5 ngày, Chủ nhật: nghỉ)
    let standardWorkDays = 0;
    let workingCalendarDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow >= 1 && dow <= 5) {
        standardWorkDays += 1;
        workingCalendarDays += 1;
      } else if (dow === 6) {
        standardWorkDays += 0.5;
        workingCalendarDays += 1;
      }
    }

    const items = rows
      .map((r) => {
        const idnv = String(r.idnhanvien || '').trim();
        let computedTotal = 0;
        const dayValues = {};
        for (let d = 1; d <= 31; d++) {
          const val = Number(r[`day${d}`] || 0);
          dayValues[`day${d}`] = Number.isFinite(val) ? Math.round(val * 100) / 100 : 0;
          computedTotal += dayValues[`day${d}`];
        }
        const totalFromDb =
          r.tongngaycong !== null && r.tongngaycong !== undefined
            ? Number(r.tongngaycong)
            : computedTotal;
        const tongngaynghi =
          Math.round((Number.isFinite(totalFromDb) ? totalFromDb : computedTotal) * 100) / 100;

        return {
          idbangchamcong: r.idbangchamcong,
          idnhanvien: idnv,
          tennhanvien: (r.tennhanvien || r.hoten || '').trim(),
          tenbophan: deptMap.get(idnv) || '',
          thangnam: (r.thangnam || thangnam).trim(),
          ngaytao: r.ngaytao || null,
          ...dayValues,
          tongngaynghi,
          tongngaycong: tongngaynghi,
          ghichu: r.ghichu || '',
        };
      })
      .sort((a, b) => a.tennhanvien.localeCompare(b.tennhanvien, 'vi'));

    const totalStaff = items.length;
    const totalLeaveDays =
      Math.round(items.reduce((acc, it) => acc + it.tongngaynghi, 0) * 100) / 100;
    const staffWithLeave = items.filter((it) => it.tongngaynghi > 0).length;
    const staffFullAttendance = totalStaff - staffWithLeave;
    const avgLeaveDays =
      totalStaff > 0 ? Math.round((totalLeaveDays / totalStaff) * 10) / 10 : 0;
    const withNotes = items.filter((it) => it.ghichu && it.ghichu.trim() !== '').length;

    res.json({
      month,
      year,
      thangnam,
      daysInMonth,
      standardWorkDays,
      workingCalendarDays,
      items,
      summary: {
        totalStaff,
        totalLeaveDays,
        staffWithLeave,
        staffFullAttendance,
        avgLeaveDays,
        withNotes,
        standardWorkDays,
        workingCalendarDays,
      },
    });
  } catch (err) {
    console.error('[GET /api/timesheet] Error:', err);
    res.status(500).json({ error: `Không thể tải bảng chấm công: ${err.message}` });
  }
});

module.exports = router;
