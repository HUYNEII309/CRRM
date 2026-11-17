const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ==================== THEME MANAGEMENT (LIGHT / DARK SAAS) ====================
function initTheme() {
  const saved = localStorage.getItem("crm_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  const toggleTheme = () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("crm_theme", next);
  };
  $("#btn-theme-toggle")?.addEventListener("click", toggleTheme);
  $("#btn-theme-toggle-login")?.addEventListener("click", toggleTheme);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTheme);
} else {
  initTheme();
}

// Auto-hide scrollbar helper (I18: gắn .is-scrolling khi đang cuộn)
(function initScrollbarAutohide() {
  const timers = new WeakMap();
  document.addEventListener(
    "scroll",
    (e) => {
      const target = e.target === document ? document.documentElement : e.target;
      if (!target?.classList) return;
      target.classList.add("is-scrolling");
      clearTimeout(timers.get(target));
      timers.set(
        target,
        setTimeout(() => target.classList.remove("is-scrolling"), 700),
      );
    },
    { capture: true, passive: true },
  );
})();

const state = {
  token: localStorage.getItem("crm_token") || "",
  user: null,
  catalogs: {},
  currentPage: "tasks",
  dashboardScope: "mine",
  customerPage: 1,
};

let openCareDetailModal = null;

function esc(val) {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMoney(n) {
  return Number(n || 0).toLocaleString("vi-VN") + "\u00A0đ";
}

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("vi-VN");
}

function fmtDateOnly(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getTodayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getCurrentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);

  const formatLocal = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    firstDayStr: formatLocal(firstDay),
    lastDayStr: formatLocal(lastDay),
  };
}

function fmtDateTime(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("vi-VN");
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 3200);
}

async function api(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !url.includes("/auth/login")) {
    logout();
    throw new Error(data.error || "Phiên đăng nhập hết hạn.");
  }
  if (!res.ok) throw new Error(data.error || "Lỗi máy chủ");
  return data;
}

function openModal(title, html, isWide = false, extraClass = "") {
  $("#modal-title").textContent = title;
  $("#modal-body").innerHTML = html;
  const card = $(".modal-card");
  if (card) {
    card.classList.toggle("modal-wide", !!isWide);
    if (extraClass) card.classList.add(extraClass);
  }
  $("#modal-backdrop").classList.remove("hidden");
}

function closeModal() {
  $("#modal-backdrop").classList.add("hidden");
  $("#modal-body").innerHTML = "";
  const card = $(".modal-card");
  if (card) {
    card.className = "modal-card";
  }
}

/**
 * Hiển thị Hộp thoại xác nhận kiểu Modal hiện đại (thay thế window.confirm mặc định)
 */
function showConfirmModal({
  title = "Xác nhận xóa",
  message = "Bạn có chắc chắn muốn thực hiện thao tác này?",
  confirmText = "Xác nhận xóa",
  cancelText = "Hủy bỏ",
  iconSvg = null,
  isDanger = true,
}) {
  return new Promise((resolve) => {
    const backdrop = $("#confirm-modal-backdrop");
    const titleEl = $("#confirm-modal-title");
    const msgEl = $("#confirm-modal-message");
    const btnOk = $("#confirm-modal-btn-ok");
    const btnCancel = $("#confirm-modal-btn-cancel");
    const iconEl = $("#confirm-modal-icon");

    if (!backdrop || !btnOk || !btnCancel) {
      resolve(window.confirm(message.replace(/<[^>]*>?/gm, '')));
      return;
    }

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.innerHTML = message;
    if (btnOk) {
      btnOk.textContent = confirmText;
      btnOk.className = isDanger ? "btn btn-danger" : "btn btn-primary";
    }
    if (btnCancel) btnCancel.textContent = cancelText;

    if (iconEl && iconSvg) {
      iconEl.innerHTML = iconSvg;
    } else if (iconEl) {
      iconEl.innerHTML = `
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      `;
    }

    const cleanup = () => {
      backdrop.classList.add("hidden");
      btnOk.removeEventListener("click", onOk);
      btnCancel.removeEventListener("click", onCancel);
      backdrop.removeEventListener("click", onBackdrop);
      window.removeEventListener("keydown", onKeyDown);
    };

    const onOk = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const onBackdrop = (e) => {
      if (e.target === backdrop) {
        cleanup();
        resolve(false);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        cleanup();
        resolve(false);
      }
    };

    btnOk.addEventListener("click", onOk);
    btnCancel.addEventListener("click", onCancel);
    backdrop.addEventListener("click", onBackdrop);
    window.addEventListener("keydown", onKeyDown);

    backdrop.classList.remove("hidden");
    btnCancel.focus();
  });
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand("copy");
    document.body.removeChild(ta);
    return Promise.resolve();
  } catch (err) {
    document.body.removeChild(ta);
    return Promise.reject(err);
  }
}

$("#modal-close").addEventListener("click", closeModal);
$("#modal-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "modal-backdrop") closeModal();
});

async function checkDbStatus() {
  try {
    const res = await fetch("/api/settings/db");
    const data = await res.json();
    const badge = $("#db-badge");
    const topBadge = $("#topbar-db-status");
    if (data.connected) {
      if (badge) {
        badge.className = "status-pill status-ok";
        badge.textContent = `SQL Server: Đã kết nối (${data.config.database} @ ${data.config.host})`;
      }
      if (topBadge) {
        topBadge.className = "status-pill status-ok";
        topBadge.textContent = `SQL: ${data.config.database}`;
      }
    } else {
      if (badge) {
        badge.className = "status-pill status-err";
        badge.textContent = `Chưa kết nối SQL Server: ${data.error || "Kiểm tra cấu hình"}`;
      }
      if (topBadge) {
        topBadge.className = "status-pill status-err";
        topBadge.textContent = "SQL: Mất kết nối";
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function openDbConfigModal() {
  const data = await fetch("/api/settings/db").then((r) => r.json());
  const c = data.config || {};
  openModal(
    "Cấu hình kết nối SQL Server (CRMPLUSDB)",
    `
    <form id="db-config-form" class="form-stack">
      <div class="form-grid">
        <div class="form-group">
          <label>Server / Host / IP</label>
          <input name="host" value="${esc(c.host || "localhost")}" placeholder="vd: localhost hoặc 192.168.1.10" required />
        </div>
        <div class="form-group">
          <label>Port (mặc định 1433)</label>
          <input name="port" value="${esc(c.port || "1433")}" placeholder="1433" />
        </div>
        <div class="form-group">
          <label>Named Instance (nếu có, vd: SQLEXPRESS)</label>
          <input name="instance" value="${esc(c.instance || "")}" placeholder="Để trống nếu dùng Port" />
        </div>
        <div class="form-group">
          <label>Database Name (để trống nếu dùng Default DB)</label>
          <input name="database" value="${esc(c.database || "")}" placeholder="vd: CRMPLUSDB" />
        </div>
        <div class="form-group">
          <label>SQL Username</label>
          <input name="user" value="${esc(c.user || "sa")}" required />
        </div>
        <div class="form-group">
          <label>SQL Password ${c.hasPassword ? "(để trống nếu giữ nguyên)" : ""}</label>
          <input name="password" type="password" placeholder="Nhập mật khẩu SQL..." />
        </div>
      </div>
      <div class="form-grid">
        <label class="checkbox-row">
          <input type="checkbox" name="encrypt" ${c.encrypt ? "checked" : ""} />
          Encrypt Connection (Bật nếu dùng Azure SQL)
        </label>
        <label class="checkbox-row">
          <input type="checkbox" name="trustServerCertificate" ${c.trustServerCertificate !== false ? "checked" : ""} />
          TrustServerCertificate (Khuyên bật cho LAN/Local)
        </label>
      </div>
      <div id="db-test-msg" class="alert hidden"></div>
      <div class="toolbar" style="justify-content:flex-end;margin-bottom:0">
        <button type="button" id="btn-test-db" class="btn btn-outline">Kiểm tra kết nối</button>
        <button type="submit" class="btn btn-primary">Lưu vào .env & Áp dụng</button>
      </div>
    </form>
  `,
  );

  const getPayload = () => {
    const fd = new FormData($("#db-config-form"));
    return {
      host: fd.get("host"),
      port: fd.get("port"),
      instance: fd.get("instance"),
      database: fd.get("database"),
      user: fd.get("user"),
      password: fd.get("password"),
      encrypt: fd.get("encrypt") === "on",
      trustServerCertificate: fd.get("trustServerCertificate") === "on",
    };
  };

  $("#btn-test-db").addEventListener("click", async () => {
    const msg = $("#db-test-msg");
    msg.className = "alert";
    msg.textContent = "Đang kiểm tra kết nối...";
    msg.classList.remove("hidden");
    try {
      const res = await fetch("/api/settings/db/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getPayload()),
      }).then((r) => r.json());
      if (res.ok) {
        msg.className = "alert alert-success";
        msg.textContent = `${res.message} (${res.info.dbName} @ ${res.info.serverName})`;
      } else {
        msg.className = "alert alert-error";
        msg.textContent = res.error;
      }
    } catch (err) {
      msg.className = "alert alert-error";
      msg.textContent = err.message;
    }
  });

  $("#db-config-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#db-test-msg");
    msg.className = "alert";
    msg.textContent = "Đang lưu và kết nối lại...";
    msg.classList.remove("hidden");
    try {
      const res = await fetch("/api/settings/db/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getPayload()),
      }).then((r) => r.json());
      if (res.ok) {
        toast(res.message);
        closeModal();
        checkDbStatus();
      } else {
        msg.className = "alert alert-error";
        msg.textContent = res.error;
      }
    } catch (err) {
      msg.className = "alert alert-error";
      msg.textContent = err.message;
    }
  });
}

$("#open-db-config-login")?.addEventListener("click", openDbConfigModal);
$("#open-db-config-top")?.addEventListener("click", openDbConfigModal);

// Toggle password visibility (giữ tiêu điểm bàn phím, cập nhật aria-label)
const btnTogglePwd = $("#btn-toggle-pwd");
if (btnTogglePwd) {
  btnTogglePwd.addEventListener("click", () => {
    const pwdInput = $("#login-password");
    const isPwd = pwdInput.type === "password";
    pwdInput.type = isPwd ? "text" : "password";
    btnTogglePwd.setAttribute("aria-label", isPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    btnTogglePwd.innerHTML = isPwd
      ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>`
      : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`;
  });
}

// Trượt con trỏ segmented giữa Mặc định & Mã hóa MD5
$$('input[name="login_type"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const seg = $("#login-type-switch");
    if (seg) seg.dataset.active = radio.value;
    $$(".auth-md5-opt").forEach((opt) => {
      const inp = opt.querySelector("input");
      opt.classList.toggle("is-active", !!inp?.checked);
    });
  });
});

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errBox = $("#login-error");
  const errText = $("#login-error-text");
  const submitBtn = $("#btn-login-submit");
  const spinnerEl = submitBtn?.querySelector(".auth-btn-spinner");
  const btnTextEl = submitBtn?.querySelector(".btn-text");
  if (!submitBtn || submitBtn.dataset.loading === "1") return;

  const loginType = $('input[name="login_type"]:checked')?.value || "md5";

  errBox.classList.add("hidden");
  submitBtn.dataset.loading = "1";
  submitBtn.setAttribute("aria-disabled", "true");
  submitBtn.setAttribute("aria-busy", "true");
  if (spinnerEl) spinnerEl.classList.remove("hidden");
  if (btnTextEl) btnTextEl.textContent = "Đang xác thực…";

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        tendangnhap: $("#login-username").value.trim(),
        matkhau: $("#login-password").value,
        loginType,
      }),
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("crm_token", data.token);
    await enterApp();
  } catch (err) {
    if (errText) {
      errText.textContent = err.message;
    } else {
      errBox.textContent = err.message;
    }
    errBox.classList.remove("hidden");
    errBox.style.animation = "none";
    void errBox.offsetWidth;
    errBox.style.animation = "";
    const pwdInput = $("#login-password");
    if (pwdInput) {
      pwdInput.value = "";
      pwdInput.focus();
    }
  } finally {
    delete submitBtn.dataset.loading;
    submitBtn.removeAttribute("aria-disabled");
    submitBtn.removeAttribute("aria-busy");
    if (spinnerEl) spinnerEl.classList.add("hidden");
    if (btnTextEl) btnTextEl.textContent = "Đăng nhập";
  }
});

// ==================== MODAL DANH SÁCH NHÂN VIÊN (LOGIN SCREEN) ====================
async function openStaffListModal() {
  openModal(
    "Danh sách nhân viên (Còn công tác)",
    `
    <div style="padding:2px 0">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap">
        <div class="sales-quick-search" style="flex:1;min-width:240px">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
          </svg>
          <input type="text" id="staff-modal-search" placeholder="Tìm theo họ tên, SĐT, tên đăng nhập..." />
        </div>
        <span class="badge badge-blue" id="staff-modal-count">Đang nạp...</span>
      </div>

      <div id="staff-modal-body-table">
        <div style="padding:32px;text-align:center;color:var(--muted)">Đang truy vấn danh sách nhân viên từ Stored Procedure...</div>
      </div>
    </div>
  `,
    true,
    "modal-staff-list",
  );

  try {
    const data = await api("/api/auth/active-staff");
    const items = data.items || [];

    const renderTable = (list) => {
      const countEl = $("#staff-modal-count");
      if (countEl)
        countEl.textContent = `${list.length}/${items.length} nhân viên`;

      const container = $("#staff-modal-body-table");
      if (!container) return;

      container.innerHTML = `
        <div class="staff-modal-table-wrap">
          <table class="staff-modal-table">
            <thead>
              <tr>
                <th style="width:45px;text-align:center">STT</th>
                <th>Họ tên</th>
                <th style="width:125px;white-space:nowrap">Điện thoại</th>
                <th style="width:145px;white-space:nowrap">Tên đăng nhập</th>
                <th style="width:150px;text-align:center;white-space:nowrap">Mật khẩu</th>
              </tr>
            </thead>
            <tbody>
              ${
                list.length
                  ? list
                      .map(
                        (nv, idx) => `
                <tr class="staff-row-selectable" data-user="${esc(nv.tendangnhap)}" data-pwd="${esc(nv.matkhau)}" title="Nhấp đúp để tự điền vào khung đăng nhập">
                  <td style="text-align:center;color:#94a3b8;font-weight:700">${nv.stt || idx + 1}</td>
                  <td>
                    <strong style="color:var(--text);font-size:13.5px;display:block">${esc(nv.hoten)}</strong>
                  </td>
                  <td>
                    <span style="color:var(--text-secondary);font-size:12.5px;white-space:nowrap">${esc(nv.dienthoai || "-")}</span>
                  </td>
                  <td>
                    <code style="background:var(--info-bg);color:var(--info-text);border:1px solid var(--info-border);padding:3px 8px;border-radius:5px;font-size:12.5px;font-weight:700;white-space:nowrap">
                      ${esc(nv.tendangnhap)}
                    </code>
                  </td>
                  <td style="text-align:center;white-space:nowrap">
                    <span class="pwd-copy-btn" data-pwd="${esc(nv.matkhau)}" data-name="${esc(nv.hoten)}" title="Bấm vào để sao chép mật khẩu">
                      <span>${esc(nv.matkhau || "---")}</span>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                    </span>
                  </td>
                </tr>
              `,
                      )
                      .join("")
                  : `
                <tr>
                  <td colspan="5" style="text-align:center;padding:28px;color:var(--muted)">
                    Không tìm thấy nhân viên nào phù hợp.
                  </td>
                </tr>
              `
              }
            </tbody>
          </table>
        </div>
      `;

      // Bắt sự kiện ấn vào mật khẩu để sao chép
      $$(".pwd-copy-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const pwd = btn.dataset.pwd || "";
          const name = btn.dataset.name || "nhân viên";
          try {
            await copyToClipboard(pwd);
            toast(`Đã sao chép mật khẩu của ${name}!`);
            btn.classList.add("copied");
            setTimeout(() => {
              btn.classList.remove("copied");
            }, 1200);
          } catch (err) {
            toast("Không thể sao chép: " + err.message);
          }
        });
      });

      // Nhấp đúp vào dòng để tự điền form đăng nhập
      $$(".staff-row-selectable").forEach((row) => {
        row.addEventListener("dblclick", () => {
          const u = row.dataset.user;
          const p = row.dataset.pwd;
          if ($("#login-username")) $("#login-username").value = u;
          if ($("#login-password")) $("#login-password").value = p;
          closeModal();
          toast(`Đã điền tài khoản: ${u}`);
          $("#login-password")?.focus();
        });
      });
    };

    renderTable(items);

    $("#staff-modal-search")?.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        renderTable(items);
        return;
      }
      const filtered = items.filter(
        (nv) =>
          (nv.hoten && nv.hoten.toLowerCase().includes(q)) ||
          (nv.dienthoai && nv.dienthoai.toLowerCase().includes(q)) ||
          (nv.tendangnhap && nv.tendangnhap.toLowerCase().includes(q)) ||
          (nv.tenbophan && nv.tenbophan.toLowerCase().includes(q)),
      );
      renderTable(filtered);
    });
  } catch (err) {
    const container = $("#staff-modal-body-table");
    if (container) {
      container.innerHTML = `<div class="modern-alert error">Lỗi tải danh sách nhân viên: ${esc(err.message)}</div>`;
    }
  }
}

$("#btn-login-staff-list")?.addEventListener("click", openStaffListModal);

// Hiển thị / Ẩn hàng gợi ý "Nội bộ CRMPLUS · Tùy chọn MD5 / Nhân viên"
function setLoginAdvRevealed(revealed) {
  const hintRow = $("#login-hint-row");
  if (hintRow) {
    hintRow.classList.toggle("hidden", !revealed);
    hintRow.classList.toggle("revealed", revealed);
  }
  setLoginAdvOpen(revealed);
}

// Toggle trượt mượt khối tùy chọn nâng cao (loại mật khẩu & danh sách nhân viên)
function setLoginAdvOpen(open) {
  const drawer = $("#login-adv-drawer");
  const hintBtn = $("#btn-toggle-login-adv");
  if (!drawer) return;
  drawer.classList.toggle("open", open);
  drawer.toggleAttribute("inert", !open);
  if (hintBtn) {
    hintBtn.setAttribute("aria-expanded", String(open));
    const lbl = hintBtn.querySelector("span");
    if (lbl) lbl.textContent = open ? "Ẩn tùy chọn" : "Tùy chọn MD5 / Nhân viên";
  }
}

// Nút "Tùy chọn MD5 / Nhân viên" khi đã hiện thì bấm 1 click để thu gọn/mở rộng drawer
$("#btn-toggle-login-adv")?.addEventListener("click", () => {
  const drawer = $("#login-adv-drawer");
  if (!drawer) return;
  const nextOpen = !drawer.classList.contains("open");
  setLoginAdvOpen(nextOpen);
});

// Xử lý tích đúp (double-click / double-tap) vào logo CRM+ để bật/tắt toàn bộ tùy chọn nâng cao
function toggleLoginAdvFromLogo() {
  const hintRow = $("#login-hint-row");
  const isHidden = !hintRow || hintRow.classList.contains("hidden");
  if (isHidden) {
    setLoginAdvRevealed(true);
    toast("Đã hiển thị tùy chọn MD5 & danh sách nhân viên");
  } else {
    setLoginAdvRevealed(false);
    toast("Đã ẩn tùy chọn nâng cao");
  }
}

function bindLogoDoubleTrigger(el) {
  if (!el) return;
  // Desktop & mobile native double click
  el.addEventListener("dblclick", (e) => {
    e.preventDefault();
    toggleLoginAdvFromLogo();
  });

  // Touch double-tap hỗ trợ nhanh trên mobile
  let lastTouch = 0;
  el.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouch < 350 && now - lastTouch > 40) {
      e.preventDefault();
      toggleLoginAdvFromLogo();
      lastTouch = 0;
    } else {
      lastTouch = now;
    }
  });
}

bindLogoDoubleTrigger($("#login-logo-btn"));
bindLogoDoubleTrigger($("#login-logo-btn-mobile"));

function logout() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("crm_token");
  $("#app-view").classList.add("hidden");
  $("#login-view").classList.remove("hidden");
  setLoginAdvRevealed(false);
  $("#login-error")?.classList.add("hidden");
  if ($("#login-password")) $("#login-password").value = "";
  checkDbStatus();
  $("#login-username")?.focus();
}

$("#logout-btn").addEventListener("click", logout);

async function enterApp() {
  try {
    if (!state.user) {
      const me = await api("/api/auth/me");
      state.user = me.user;
    }
    state.catalogs = await api("/api/catalogs/all");
    $("#user-name").textContent = state.user.hoten || state.user.tendangnhap;
    if ($("#topbar-user-avatar"))
      $("#topbar-user-avatar").textContent = (state.user.hoten || "NV")
        .slice(0, 2)
        .toUpperCase();
    if ($("#topbar-user-name"))
      $("#topbar-user-name").textContent =
        state.user.hoten || state.user.tendangnhap;
    $("#user-dept").textContent = state.user.tenbophan || "Nhân viên";
    $("#user-avatar").textContent = (state.user.hoten || "NV")
      .slice(0, 2)
      .toUpperCase();
    $("#login-view").classList.add("hidden");
    $("#app-view").classList.remove("hidden");
    checkDbStatus();
    updateSidebarStateUI();
    navigate(state.currentPage);
  } catch (err) {
    logout();
  }
}

const PAGE_TITLES = {
  tasks: "Công việc (Tasklist)",
  "ktv-time": "Thống kê Time KTV",
  "customer-search": "Tra cứu Khách hàng",
  "sales-stats": "Thống kê SP Bán ra",
  dashboard: "Tổng quan",
  customers: "Quản lý Khách hàng",
  care: "Chăm sóc Khách hàng",
  appointments: "Lịch hẹn",
  products: "Sản phẩm & Gói dịch vụ",
  finance: "Tài chính (Thu / Chi)",
  staff: "Nhân sự & Hệ thống",
};

function navigate(page) {
  state.currentPage = page;
  $$(".nav-item").forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.page === page),
  );
  $("#page-title").textContent = PAGE_TITLES[page] || "CRMPLUS";

  const contentEl = $("#page-content");
  if (contentEl) {
    contentEl.style.animation = "none";
    void contentEl.offsetHeight; // trigger reflow for smooth animation
    contentEl.style.animation = "";
  }

  if (page === "tasks") {
    renderTasks();
  } else if (page === "ktv-time") {
    renderKtvTime();
  } else if (page === "customer-search") {
    renderCustomerSearch();
  } else if (page === "sales-stats") {
    renderSalesStats();
  } else if (page === "dashboard") {
    renderDashboard();
  } else if (page === "customers") {
    renderCustomers();
  } else if (page === "care") {
    renderCare();
  } else if (page === "appointments") {
    renderAppointments();
  } else if (page === "products") {
    renderProducts();
  } else if (page === "finance") {
    renderFinance();
  } else if (page === "staff") {
    renderStaff();
  } else {
    renderTasks();
  }
}

// Ẩn / hiện danh sách chức năng (Sidebar toggle)
const updateSidebarStateUI = () => {
  const shell = $("#app-view");
  if (!shell) return;
  const isHidden = shell.classList.contains("sidebar-hidden");
  const toggleBtn = $("#btn-toggle-sidebar");
  if (toggleBtn) {
    toggleBtn.classList.toggle("active", !isHidden);
    toggleBtn.setAttribute(
      "title",
      isHidden ? "Mở danh sách chức năng" : "Thu gọn danh sách chức năng",
    );
  }
};

const toggleSidebar = () => {
  const shell = $("#app-view");
  if (!shell) return;
  shell.classList.toggle("sidebar-hidden");
  updateSidebarStateUI();
};

$("#btn-toggle-sidebar")?.addEventListener("click", toggleSidebar);
$("#btn-sidebar-collapse")?.addEventListener("click", toggleSidebar);
$("#sidebar-backdrop")?.addEventListener("click", () => {
  $("#app-view")?.classList.add("sidebar-hidden");
  updateSidebarStateUI();
});

// Trên mobile/tablet (< 992px) đóng sidebar mặc định; trên PC/Desktop (>= 992px) mở sẵn danh sách chức năng
if (window.innerWidth < 992) {
  $("#app-view")?.classList.add("sidebar-hidden");
} else {
  $("#app-view")?.classList.remove("sidebar-hidden");
}
updateSidebarStateUI();

$$("#nav-menu .nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    navigate(btn.dataset.page);
    // Trên thiết bị di động / màn hình hẹp (< 992px), tự động đóng sidebar sau khi chọn chức năng
    if (window.innerWidth < 992) {
      $("#app-view")?.classList.add("sidebar-hidden");
      updateSidebarStateUI();
    }
  });
});

function optList(items, valKey, labelKey, selected = "") {
  return (items || [])
    .map(
      (i) =>
        `<option value="${esc(i[valKey])}" ${String(i[valKey]) === String(selected) ? "selected" : ""}>${esc(i[labelKey])}</option>`,
    )
    .join("");
}

// ==================== DASHBOARD ====================
async function renderDashboard() {
  const el = $("#page-content");
  el.innerHTML = '<div class="card">Đang tải dữ liệu tổng quan...</div>';
  try {
    const data = await api(`/api/dashboard?scope=${state.dashboardScope}`);
    const k = data.kpis;
    el.innerHTML = `
      <div class="toolbar" style="justify-content:space-between">
        <div class="tabs" style="margin-bottom:0;border:none">
          <button class="tab-btn ${state.dashboardScope === "mine" ? "active" : ""}" data-scope="mine">Của tôi</button>
          <button class="tab-btn ${state.dashboardScope === "all" ? "active" : ""}" data-scope="all">Toàn công ty</button>
        </div>
        <button class="btn btn-outline btn-sm" id="refresh-dash">Làm mới</button>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">Doanh số tháng này</div><div class="kpi-value" style="color:var(--primary)">${fmtMoney(k.doanhSoThang)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Giao dịch CSKH hôm nay</div><div class="kpi-value">${k.giaoDichHomNay}</div></div>
        <div class="kpi-card"><div class="kpi-label">Lịch hẹn hôm nay</div><div class="kpi-value">${k.lichHenHomNayCount}</div></div>
        <div class="kpi-card"><div class="kpi-label">Dịch vụ sắp hết hạn (30 ngày)</div><div class="kpi-value" style="color:var(--warning)">${k.dichVuSapHetHanCount}</div></div>
        <div class="kpi-card"><div class="kpi-label">Task đang mở</div><div class="kpi-value">${k.taskDangMo}</div></div>
        <div class="kpi-card"><div class="kpi-label">Tổng khách hàng</div><div class="kpi-value">${k.tongKhachHang}</div></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>Lịch hẹn hôm nay</h3></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Giờ</th><th>Khách hàng</th><th>Nội dung</th></tr></thead>
              <tbody>
                ${
                  data.lichHenHomNay.length
                    ? data.lichHenHomNay
                        .map(
                          (x) => `
                  <tr><td><span class="badge badge-blue">${esc(x.giohen || "--:--")}</span></td><td>${esc(x.tenkhachhang || "Khách lẻ")}</td><td>${esc(x.noidunghen)}</td></tr>
                `,
                        )
                        .join("")
                    : '<tr><td colspan="3" class="muted">Không có lịch hẹn nào hôm nay.</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Khách quan tâm hôm nay</h3></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Khách hàng</th><th>Điện thoại</th><th>Ghi chú</th></tr></thead>
              <tbody>
                ${
                  data.khachQuanTamHomNay.length
                    ? data.khachQuanTamHomNay
                        .map(
                          (x) => `
                  <tr><td>${esc(x.tenkhachhang)}</td><td>${esc(x.dienthoai)}</td><td>${esc(x.ghichu)}</td></tr>
                `,
                        )
                        .join("")
                    : '<tr><td colspan="3" class="muted">Chưa có khách quan tâm hôm nay.</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Gói dịch vụ sắp hết hạn (30 ngày)</h3></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Khách hàng</th><th>Gói</th><th>Hết hạn</th><th>Còn lại</th></tr></thead>
              <tbody>
                ${
                  data.dichVuSapHetHan.length
                    ? data.dichVuSapHetHan
                        .map(
                          (x) => `
                  <tr><td>${esc(x.tenkhachhang)}</td><td>${esc(x.tenloaikhachhang)}</td><td>${fmtDate(x.ngayhethan)}</td><td><span class="badge badge-amber">${x.songayconlai} ngày</span></td></tr>
                `,
                        )
                        .join("")
                    : '<tr><td colspan="4" class="muted">Không có gói sắp hết hạn.</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Hợp đồng quá 6 tháng chưa chăm sóc lại</h3></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Mã KH</th><th>Khách hàng</th><th>Ngày ký</th></tr></thead>
              <tbody>
                ${
                  data.hopDongQua6Thang.length
                    ? data.hopDongQua6Thang
                        .map(
                          (x) => `
                  <tr><td>${esc(x.makhachhang)}</td><td>${esc(x.tenkhachhang)}</td><td>${fmtDate(x.ngayky)}</td></tr>
                `,
                        )
                        .join("")
                    : '<tr><td colspan="3" class="muted">Không có hợp đồng quá 6 tháng chưa CSKH.</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      ${
        data.thongBao.length
          ? `
        <div class="card">
          <div class="card-header"><h3>Thông báo hệ thống</h3></div>
          ${data.thongBao.map((tb) => `<div style="padding:6px 0;border-bottom:1px solid var(--border)"><strong>${fmtDateTime(tb.ngaygio)}</strong>: ${esc(tb.noidung)}</div>`).join("")}
        </div>
      `
          : ""
      }
    `;

    $$("[data-scope]").forEach((b) =>
      b.addEventListener("click", () => {
        state.dashboardScope = b.dataset.scope;
        renderDashboard();
      }),
    );
    $("#refresh-dash").addEventListener("click", renderDashboard);
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
  }
}

// ==================== CUSTOMERS ====================
async function renderCustomers(filters = {}) {
  const el = $("#page-content");
  const q = filters.q ?? "";
  const idnhanvien = filters.idnhanvien ?? "";
  const idloaikhachhang = filters.idloaikhachhang ?? "";

  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Danh sách Khách hàng</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-customer">+ Thêm khách hàng</button>
      </div>
      <div class="toolbar">
        <input id="cust-q" value="${esc(q)}" placeholder="Tìm tên, SĐT, email, mã KH..." />
        <select id="cust-staff"><option value="">-- Tất cả nhân viên --</option>${optList(state.catalogs.nhanVien, "idnhanvien", "hoten", idnhanvien)}</select>
        <select id="cust-type"><option value="">-- Tất cả loại KH --</option>${optList(state.catalogs.loaiKhachHang, "idloaikhachhang", "tenloaikhachhang", idloaikhachhang)}</select>
        <button class="btn btn-outline btn-sm" id="cust-search">Tìm kiếm</button>
      </div>
      <div id="cust-table-wrap">Đang tải...</div>
    </div>
  `;

  const loadList = async () => {
    const params = new URLSearchParams({
      q: $("#cust-q").value,
      idnhanvien: $("#cust-staff").value,
      idloaikhachhang: $("#cust-type").value,
      page: state.customerPage,
      limit: 20,
    });
    const data = await api(`/api/customers?${params}`);
    const totalPages = Math.max(Math.ceil(data.total / data.limit), 1);
    $("#cust-table-wrap").innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Mã KH</th><th>Tên khách hàng</th><th>Điện thoại</th><th>Loại KH</th><th>NV Phụ trách</th><th>GD gần nhất</th><th>Thao tác</th></tr></thead>
          <tbody>
            ${
              data.items.length
                ? data.items
                    .map(
                      (c) => `
              <tr>
                <td>${esc(c.makhachhang)}</td>
                <td><strong>${esc(c.tenkhachhang)}</strong><div class="muted" style="font-size:11px">${esc(c.diachi || "")}</div></td>
                <td>${esc(c.dienthoai)}</td>
                <td><span class="badge badge-blue">${esc(c.tenloaikhachhang || "-")}</span></td>
                <td>${esc(c.tennhanvien || "-")}</td>
                <td>${fmtDate(c.ngaygiaodichgannhat)}</td>
                <td style="white-space:nowrap">
                  <button class="btn btn-outline btn-sm" data-view-cust="${esc(c.idkhachhang)}">Chi tiết</button>
                  <button class="btn btn-outline btn-sm" data-edit-cust="${esc(c.idkhachhang)}">Sửa</button>
                </td>
              </tr>
            `,
                    )
                    .join("")
                : '<tr><td colspan="7" class="muted">Không có dữ liệu.</td></tr>'
            }
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <span class="muted">Tổng: ${data.total} KH (Trang ${data.page}/${totalPages})</span>
        <button class="btn btn-outline btn-sm" id="cust-prev" ${data.page <= 1 ? "disabled" : ""}>Trước</button>
        <button class="btn btn-outline btn-sm" id="cust-next" ${data.page >= totalPages ? "disabled" : ""}>Sau</button>
      </div>
    `;

    $("#cust-prev")?.addEventListener("click", () => {
      state.customerPage--;
      loadList();
    });
    $("#cust-next")?.addEventListener("click", () => {
      state.customerPage++;
      loadList();
    });
    $$("[data-view-cust]").forEach((b) =>
      b.addEventListener("click", () => {
        const custId = b.dataset.viewCust;
        const c = customers.find((x) => String(x.idkhachhang) === String(custId));
        if (c) {
          if (typeof openCareDetailModal === "function") {
            openCareDetailModal(c.idkhachhang, c.tenkhachhang, c.dienthoai, c);
          } else if (typeof window.openCareDetailModal === "function") {
            window.openCareDetailModal(c.idkhachhang, c.tenkhachhang, c.dienthoai, c);
          } else {
            openCustomerDetail(custId);
          }
        } else {
          openCustomerDetail(custId);
        }
      }),
    );
    $$("[data-edit-cust]").forEach((b) =>
      b.addEventListener("click", () => openCustomerForm(b.dataset.editCust)),
    );
  };

  $("#cust-search").addEventListener("click", () => {
    state.customerPage = 1;
    loadList();
  });
  $("#btn-add-customer").addEventListener("click", () =>
    openCustomerForm(null),
  );
  await loadList();
}

async function openCustomerForm(id = null, initialData = null) {
  if (!state.catalogs) {
    try {
      state.catalogs = await api("/api/catalogs/all");
    } catch (_) {}
  }
  if (!state.user) {
    try {
      const me = await api("/api/auth/me");
      state.user = me?.user;
    } catch (_) {}
  }

  // Tải danh sách Loại sản phẩm / dịch vụ từ Stored Procedure dbo.tblloaikhachhang_SelectAll
  let loaiSpList = [];
  try {
    loaiSpList = await api("/api/catalogs/loaikhachhang");
  } catch (_) {
    loaiSpList = state.catalogs?.loaiKhachHang || [];
  }

  let c = initialData || {};
  if (id) {
    const detail = await api(`/api/customers/${id}`);
    c = detail.customer || {};
  }

  // Mặc định nhân viên phụ trách là tài khoản đang đăng nhập khi thêm mới
  const defaultStaffId =
    id && c.idnhanvien ? c.idnhanvien : state.user?.idnhanvien || "";

  openModal(
    id ? "Cập nhật Thông tin Khách hàng" : "Thêm Khách hàng mới",
    `
    <form id="cust-form" class="cust-modal-form">
      <div class="cust-form-grid">
        <div class="input-field-group cust-col-full">
          <label>Tên khách hàng / Phòng khám <span style="color:var(--danger)">*</span></label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </span>
            <input name="tenkhachhang" value="${esc(c.tenkhachhang || "")}" placeholder="Nhập tên phòng khám, nha khoa, bác sĩ..." required autofocus />
          </div>
        </div>

        <div class="input-field-group cust-col-full">
          <label>Địa chỉ khách hàng</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </span>
            <input name="diachi" value="${esc(c.diachi || "")}" placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..." />
          </div>
        </div>

        <div class="input-field-group">
          <label>Số điện thoại khách hàng</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
            </span>
            <input name="dienthoai" value="${esc(c.dienthoai || "")}" placeholder="vd: 0912345678, 0987654321..." />
          </div>
        </div>

        <div class="input-field-group">
          <label>Loại dịch vụ, sản phẩm <span style="color:var(--danger)">*</span></label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </span>
            <select name="idloaikhachhang" id="cust-modal-loaisp" required>
              <option value="">-- Chọn Loại dịch vụ, sản phẩm (bắt buộc) * --</option>
              ${optList(loaiSpList, "idloaikhachhang", "tenloaikhachhang", c.idloaikhachhang)}
            </select>
          </div>
        </div>

        <div class="input-field-group">
          <label>Nhân viên phụ trách</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </span>
            <select name="idnhanvien">
              ${optList(state.catalogs?.nhanVien, "idnhanvien", "hoten", defaultStaffId)}
            </select>
          </div>
        </div>

        <div class="input-field-group">
          <label>Email khách hàng</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </span>
            <input type="email" name="email" value="${esc(c.email || "")}" placeholder="email@example.com" />
          </div>
        </div>
      </div>

      <div class="cust-form-section-title">
        <span>Người đại diện & Thông tin bổ sung</span>
      </div>

      <div class="cust-form-grid">
        <div class="input-field-group">
          <label>Tên người liên hệ</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </span>
            <input name="tennguoilienlac" value="${esc(c.tennguoilienlac || "")}" placeholder="vd: Bác sĩ Tuấn, Chị Hằng..." />
          </div>
        </div>

        <div class="input-field-group">
          <label>Số điện thoại người liên hệ</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
            </span>
            <input name="dienthoainguoilienlac" value="${esc(c.dienthoainguoilienlac || "")}" placeholder="Số điện thoại người liên hệ..." />
          </div>
        </div>

        <div class="input-field-group cust-col-full">
          <label>Email người liên hệ</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </span>
            <input type="email" name="emailnguoilienlac" value="${esc(c.emailnguoilienlac || "")}" placeholder="Email người liên hệ/đại diện..." />
          </div>
        </div>

        <div class="input-field-group cust-col-full">
          <label>Ghi chú khách hàng</label>
          <div class="input-wrapper is-textarea">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </span>
            <textarea name="ghichu" rows="2" placeholder="Ghi chú thêm về nhu cầu khách hàng, lịch sử liên hệ...">${esc(c.ghichu || "")}</textarea>
          </div>
        </div>
      </div>

      <div class="cust-modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Hủy bỏ</button>
        <button type="submit" class="btn btn-primary" style="display:inline-flex;align-items:center;gap:8px">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span>${id ? "Lưu thay đổi" : "+ Tạo khách hàng mới"}</span>
        </button>
      </div>
    </form>
  `,
    true,
    "modal-customer-form",
  );

  $("#cust-modal-loaisp")?.addEventListener("change", (e) => {
    if (e.target.value) {
      e.target.closest(".input-wrapper")?.classList.remove("input-has-error");
    }
  });

  $("#cust-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.target).entries());

    // Chuẩn hóa dữ liệu tương thích C# logic: Trim().Normalize(), chuẩn hóa số điện thoại
    const normalizeVal = (v) => (v != null ? String(v).trim().normalize() : "");
    const normalizePhoneVal = (v) => {
      let p = normalizeVal(v).replace(/\s+/g, "");
      if (p.startsWith("+84")) p = "0" + p.slice(3);
      return p.replace(/\+84/g, "0");
    };

    const payload = {
      tenkhachhang: normalizeVal(raw.tenkhachhang),
      diachi: normalizeVal(raw.diachi),
      dienthoai: normalizePhoneVal(raw.dienthoai),
      email: normalizeVal(raw.email),
      ghichu: normalizeVal(raw.ghichu),
      idloaikhachhang: normalizeVal(raw.idloaikhachhang),
      tennguoilienlac: normalizeVal(raw.tennguoilienlac),
      dienthoainguoilienlac: normalizeVal(raw.dienthoainguoilienlac),
      emailnguoilienlac: normalizeVal(raw.emailnguoilienlac),
      idnhanvien: normalizeVal(raw.idnhanvien),
    };

    if (!payload.tenkhachhang) {
      toast("Vui lòng nhập tên khách hàng / phòng khám.");
      $("#cust-form [name='tenkhachhang']")?.focus();
      return;
    }

    if (!payload.idloaikhachhang) {
      toast("Vui lòng chọn loại dịch vụ, sản phẩm trước khi tạo khách hàng mới!");
      const loaiSpEl = $("#cust-modal-loaisp");
      if (loaiSpEl) {
        loaiSpEl.focus();
        const wrapper = loaiSpEl.closest(".input-wrapper");
        if (wrapper) {
          wrapper.classList.add("input-has-error");
          setTimeout(() => wrapper.classList.remove("input-has-error"), 3000);
        }
      }
      return;
    }

    const submitBtn = $("#cust-form button[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = true;
    }

    try {
      await api(id ? `/api/customers/${id}` : "/api/customers", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      toast(
        id ? "Đã cập nhật khách hàng" : "Đã thêm khách hàng mới thành công",
      );
      closeModal();
      if (state.currentPage === "customers") {
        renderCustomers();
      } else if (state.currentPage === "customer-search") {
        if (typeof window.__refreshCustomerSearch === "function") {
          window.__refreshCustomerSearch(payload);
        }
      }
    } catch (err) {
      toast(err.message || "Không thêm khách hàng");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  });
}

async function openCustomerDetail(id) {
  const data = await api(`/api/customers/${id}`);
  const c = data.customer;
  openModal(
    `Chi tiết Khách hàng: ${c.tenkhachhang}`,
    `
    <div style="margin-bottom:14px">
      <strong>Mã KH:</strong> ${esc(c.makhachhang)} | <strong>SĐT:</strong> ${esc(c.dienthoai)} | <strong>Email:</strong> ${esc(c.email)}<br/>
      <strong>Địa chỉ:</strong> ${esc(c.diachi)} | <strong>NV Phụ trách:</strong> ${esc(c.tennhanvien)}
    </div>
    <div class="tabs">
      <button class="tab-btn active" data-ctab="care">CSKH (${data.careHistory.length})</button>
      <button class="tab-btn" data-ctab="pkg">Gói dịch vụ (${data.packages.length})</button>
      <button class="tab-btn" data-ctab="app">Lịch hẹn (${data.appointments.length})</button>
      <button class="tab-btn" data-ctab="rec">Phiếu thu (${data.receipts.length})</button>
    </div>
    <div id="cust-tab-body"></div>
  `,
  );

  const renderTab = (tab) => {
    $$("[data-ctab]").forEach((b) =>
      b.classList.toggle("active", b.dataset.ctab === tab),
    );
    const body = $("#cust-tab-body");
    if (tab === "care") {
      body.innerHTML = data.careHistory.length
        ? data.careHistory
            .map(
              (x) =>
                `<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:10px">
                   <div>
                     <strong>${fmtDateTime(x.ngaythang)}</strong> - <span>Nhân viên CS: <strong>${esc(x.tennhanvien)}</strong></span> (${esc(x.tendanhgiakhachhang || "-")})
                     <div style="margin-top:4px">${esc(x.ghichu)}</div>
                   </div>
                   <button type="button" class="btn-delete-care-item" data-id="${esc(x.idchamsockhachhang || x.idchamsoc || "")}" title="Xóa lịch sử chăm sóc này">
                     <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                     </svg>
                     <span>Xóa</span>
                   </button>
                 </div>`,
            )
            .join("")
        : '<p class="muted">Chưa có lịch sử CSKH.</p>';

      body.onclick = async (e) => {
        const btn = e.target.closest(".btn-delete-care-item");
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const idCare = btn.dataset.id;
        if (!idCare) {
          toast("Không tìm thấy mã lịch sử chăm sóc cần xóa.");
          return;
        }
        const confirmed = await showConfirmModal({
          title: "Xác nhận xóa sự kiện chăm sóc",
          message: `Bạn có chắc chắn muốn xóa sự kiện chăm sóc này không?<br/><br/><strong>Mã chăm sóc:</strong> <span class="badge badge-blue">#${esc(idCare)}</span><br/><br/><span style="color:var(--text-secondary)">Thao tác này sẽ chạy Stored Procedure <code>tblchamsockhachhang_Delete</code> để xóa bản ghi nhật ký chăm sóc này (không xóa thông tin khách hàng).</span>`,
          confirmText: "Xóa bản ghi chăm sóc",
          cancelText: "Hủy bỏ",
          isDanger: true,
        });
        if (!confirmed) return;
        try {
          const res = await api(`/api/care/${encodeURIComponent(idCare)}`, { method: "DELETE" });
          toast(res.message || "Đã xóa lịch sử chăm sóc thành công.");
          openCustomerDetail(id);
        } catch (err) {
          toast(`Lỗi khi xóa chăm sóc: ${err.message}`);
        }
      };
    } else if (tab === "pkg") {
      body.innerHTML = data.packages.length
        ? data.packages
            .map(
              (p) =>
                `<div style="padding:8px 0;border-bottom:1px solid var(--border)"><strong>${esc(p.tenloaikhachhang)}</strong> | ${fmtDate(p.ngaybatdau)} → ${fmtDate(p.ngayhethan)} | Thu: ${fmtMoney(p.tongsotiendathu)}</div>`,
            )
            .join("")
        : '<p class="muted">Chưa có gói dịch vụ.</p>';
    } else if (tab === "app") {
      body.innerHTML = data.appointments.length
        ? data.appointments
            .map(
              (a) =>
                `<div style="padding:8px 0;border-bottom:1px solid var(--border)"><strong>${fmtDate(a.ngayhen)} ${esc(a.giohen)}</strong> - ${esc(a.noidunghen)}</div>`,
            )
            .join("")
        : '<p class="muted">Chưa có lịch hẹn.</p>';
    } else {
      body.innerHTML = data.receipts.length
        ? data.receipts
            .map(
              (r) =>
                `<div style="padding:8px 0;border-bottom:1px solid var(--border)"><strong>${fmtDate(r.thoigianthu)}</strong> - ${fmtMoney(r.sotien)} (${esc(r.noidung)})</div>`,
            )
            .join("")
        : '<p class="muted">Chưa có phiếu thu.</p>';
    }
  };
  $$("[data-ctab]").forEach((b) =>
    b.addEventListener("click", () => renderTab(b.dataset.ctab)),
  );
  renderTab("care");
}

// ==================== MODAL GHI NHẬN CHĂM SÓC KHÁCH HÀNG (MÔ PHỎNG & NÂNG CẤP CHUẨN CSKH) ====================
async function openAddCareModal(idkhachhang = null, tenkhachhang = "", onSaved = null) {
  if (!state.catalogs || !state.catalogs.danhmucDauViecCoDinh || !state.catalogs.nhanVienKyThuat) {
    try {
      state.catalogs = await api("/api/catalogs/all");
    } catch (_) {}
  }
  if (!state.catalogs?.danhmucDauViecCoDinh?.length) {
    try {
      state.catalogs = state.catalogs || {};
      state.catalogs.danhmucDauViecCoDinh = await api("/api/catalogs/danhmucdauvieccodinh");
    } catch (_) {}
  }
  if (!state.catalogs?.nhanVienKyThuat?.length) {
    try {
      state.catalogs = state.catalogs || {};
      state.catalogs.nhanVienKyThuat = await api("/api/catalogs/nhanvien-kythuat");
    } catch (_) {}
  }
  if (!state.user) {
    try {
      const me = await api("/api/auth/me");
      state.user = me?.user;
    } catch (_) {}
  }

  // Nếu chưa có idkhachhang, tải danh sách khách hàng để chọn
  let custList = [];
  if (!idkhachhang) {
    try {
      const custData = await api("/api/customers?limit=250");
      custList = custData?.items || [];
    } catch (_) {}
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const nowIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // Thời gian hẹn mặc định: 7 ngày sau cùng giờ (theo ảnh giao diện desktop: 17/11/2026 -> 24/11/2026 14:40)
  const appDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const appDateIso = `${appDate.getFullYear()}-${pad(appDate.getMonth() + 1)}-${pad(appDate.getDate())}T${pad(appDate.getHours())}:${pad(appDate.getMinutes())}`;

  // Người được giao mặc định là tài khoản đang đăng nhập
  const defaultStaffId = state.user?.idnhanvien || "";

  // Chuẩn hóa tiếng Việt không dấu để so khớp giá trị mặc định
  const normVi = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // 1. Hình thức CS mặc định là Điện thoại
  const defaultHinhThuc = (state.catalogs?.hinhThucChamSoc || []).find((x) =>
    normVi(x.tenhinhthuc).includes("dien thoai")
  );
  const defaultHinhThucId = defaultHinhThuc ? defaultHinhThuc.idhinhthucchamsoc : "";

  // 2. Đánh giá khách hàng mặc định là Tư vấn khách hàng
  const defaultDanhGia = (state.catalogs?.danhGiaKhachHang || []).find((x) =>
    normVi(x.tendanhgiakhachhang).includes("tu van khach hang")
  ) || (state.catalogs?.danhGiaKhachHang || []).find((x) =>
    normVi(x.tendanhgiakhachhang).includes("tu van")
  );
  const defaultDanhGiaId = defaultDanhGia ? defaultDanhGia.iddanhgiakhachhang : "";

  // 3. Lý do chăm sóc mặc định là Khách hàng cần chăm sóc
  const defaultLyDo = (state.catalogs?.lyDoKhachHang || []).find((x) =>
    normVi(x.tenlydokhachhang).includes("khach hang can cham soc")
  ) || (state.catalogs?.lyDoKhachHang || []).find((x) =>
    normVi(x.tenlydokhachhang).includes("can cham soc")
  ) || (state.catalogs?.lyDoKhachHang || []).find((x) =>
    normVi(x.tenlydokhachhang).includes("cham soc")
  );
  const defaultLyDoId = defaultLyDo ? defaultLyDo.idlydokhachhang : "";

  openModal(
    "CHĂM SÓC KHÁCH HÀNG - Thêm thông tin",
    `
    <form id="care-quick-form" class="cust-modal-form">
      <div class="cust-form-grid">
        ${
          idkhachhang
            ? `
        <div class="input-field-group cust-col-full">
          <label>Khách hàng:(*)</label>
          <input type="hidden" name="idkhachhang" value="${esc(idkhachhang)}" />
          <div class="care-cust-selected-card">
            <div class="care-cust-avatar">${esc((tenkhachhang || "KH").slice(0, 2).toUpperCase())}</div>
            <div class="care-cust-info">
              <strong>${esc(tenkhachhang || "Khách hàng")}</strong>
              <span>Mã KH: #${esc(idkhachhang)}</span>
            </div>
            <span class="care-cust-badge">Đang chăm sóc</span>
          </div>
        </div>
        `
            : `
        <div class="input-field-group cust-col-full">
          <label>Khách hàng:(*)</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </span>
            <select name="idkhachhang" id="care-select-cust" required autofocus>
              <option value="">-- Chọn khách hàng / Phòng khám (*) --</option>
              ${custList.map((k) => `<option value="${esc(k.idkhachhang)}">${esc(k.tenkhachhang)} ${k.dienthoai ? `(${esc(k.dienthoai)})` : ""}</option>`).join("")}
            </select>
          </div>
        </div>
        `
        }

        <div class="input-field-group">
          <label>Thời gian:(*)</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </span>
            <input type="datetime-local" name="ngaythang" value="${nowIso}" required />
          </div>
        </div>

        <div class="input-field-group care-quantam-group">
          <label>&nbsp;</label>
          <label class="care-quantam-toggle" title="Đánh dấu khách hàng đang rất quan tâm giao dịch này">
            <input type="checkbox" name="isquantam" />
            <span class="care-quantam-box">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>Quan tâm giao dịch này</span>
            </span>
          </label>
        </div>

        <div class="input-field-group">
          <label>Hình thức:(*)</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
            </span>
            <select name="idhinhthucchamsoc" required>
              <option value="">-- Chọn hình thức CS (*) --</option>
              ${optList(state.catalogs?.hinhThucChamSoc, "idhinhthucchamsoc", "tenhinhthuc", defaultHinhThucId)}
            </select>
          </div>
        </div>

        <div class="input-field-group">
          <label>Lý do:(*)</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </span>
            <select name="idlydokhachhang" required>
              <option value="">-- Chọn lý do (*) --</option>
              ${optList(state.catalogs?.lyDoKhachHang, "idlydokhachhang", "tenlydokhachhang", defaultLyDoId)}
            </select>
          </div>
        </div>

        <div class="input-field-group">
          <label>Đánh giá:(*)</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
              </svg>
            </span>
            <select name="iddanhgiakhachhang" required>
              <option value="">-- Chọn đánh giá (*) --</option>
              ${optList(state.catalogs?.danhGiaKhachHang, "iddanhgiakhachhang", "tendanhgiakhachhang", defaultDanhGiaId)}
            </select>
          </div>
        </div>

        <div class="input-field-group">
          <label>Trạng thái:</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </span>
            <select name="idtrangthai">
              <option value="">---{ Chọn trạng thái }---</option>
              ${optList(state.catalogs?.trangThai, "idtrangthai", "tentrangthai")}
            </select>
          </div>
        </div>
      </div>

      <!-- CHỌN ĐẦU VIỆC (HỖ TRỢ / LẬP TRÌNH) -->
      <div class="care-task-box" id="care-task-box-wrapper">
        <div class="care-task-row1">
          <label class="care-custom-check">
            <input type="checkbox" id="chk-care-opt-task" />
            <span class="care-check-mark"></span>
            <strong>Chọn đầu việc</strong>
          </label>
          <div class="care-task-select-wrapper">
            <select id="care-task-iddanhmuc" disabled class="care-task-select">
              <option value="">---{ Chọn đầu việc }---</option>
              ${optList(state.catalogs?.danhmucDauViecCoDinh, "iddanhmucdauviec", "tendauviec")}
            </select>
          </div>
        </div>

        <div class="care-task-row2 is-disabled" id="care-task-row2-panel">
          <div class="care-task-support-col">
            <label class="care-sublabel">Người hỗ trợ</label>
            <select id="care-task-idnv" disabled class="care-task-support-select">
              <option value="">---{ Chọn }---</option>
              ${optList(state.catalogs?.nhanVienKyThuat, "idnhanvien", "hoten")}
            </select>
          </div>
          <div class="care-task-metric-col" title="Điểm đầu việc">
            <input type="text" id="care-task-diem" value="0," readonly class="care-metric-input" />
          </div>
          <div class="care-task-metric-col" title="Giờ dự kiến trên 1 đầu việc">
            <input type="text" id="care-task-gio" value="0," readonly class="care-metric-input" />
          </div>
          <div class="care-task-duyet-col">
            <label class="care-duyet-toggle" title="Duyệt đầu việc hỗ trợ">
              <input type="checkbox" id="care-task-duyet" checked disabled />
              <span class="care-duyet-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Duyệt</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      <!-- NỘI DUNG GHI NHẬN -->
      <div class="input-field-group cust-col-full" style="margin-top:14px">
        <label>Nội dung:(*) <span style="color:var(--danger)">*</span></label>
        <div class="input-wrapper is-textarea">
          <span class="input-icon">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </span>
          <textarea name="ghichu" id="care-modal-ghichu" rows="4" placeholder="Nhập chi tiết nội dung cuộc gọi, tư vấn, yêu cầu hỗ trợ hoặc phản hồi của khách hàng..." required></textarea>
        </div>
      </div>

      <!-- GIAO VIỆC KỸ THUẬT -->
      <div class="care-expand-block">
        <div class="care-expand-header" id="header-care-opt-ktv">
          <label class="care-expand-check">
            <input type="checkbox" id="chk-care-opt-ktv" />
            <strong>Giao việc kỹ thuật</strong>
          </label>
          <span class="care-expand-badge">Tùy chọn</span>
        </div>
        <div id="care-expand-ktv-body" class="care-expand-content hidden">
          <div class="cust-form-grid">
            <div class="input-field-group">
              <label>Kỹ thuật làm</label>
              <div class="input-wrapper">
                <select id="care-ktv-idnv">
                  <option value="">---{ Chọn }---</option>
                  ${optList(state.catalogs?.nhanVienKyThuat, "idnhanvien", "hoten")}
                </select>
              </div>
            </div>
            <div class="input-field-group">
              <label>Nhóm việc</label>
              <div class="input-wrapper">
                <select id="care-ktv-nhomviec">
                  <option value="">---{ Chọn }---</option>
                  ${optList(state.catalogs?.nhomDauViecLapTrinh, "idnhomdauvieclaptrinh", "tendauviec")}
                </select>
              </div>
            </div>
            <div class="input-field-group">
              <label>Số lượng</label>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                  </svg>
                </span>
                <input type="number" id="care-ktv-soluong" value="1" min="1" />
              </div>
            </div>
            <div class="input-field-group">
              <label>Giờ trên 1 đầu việc (h)</label>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <input type="number" id="care-ktv-gio" step="0.1" value="0" min="0" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- THÊM THÔNG TIN LỊCH HẸN -->
      <div class="care-expand-block">
        <div class="care-expand-header" id="header-care-opt-app">
          <label class="care-expand-check">
            <input type="checkbox" id="chk-care-opt-app" />
            <strong>Thêm thông tin lịch hẹn</strong>
          </label>
          <span class="care-expand-badge">Tùy chọn</span>
        </div>
        <div id="care-expand-app-body" class="care-expand-content hidden">
          <div class="cust-form-grid">
            <div class="input-field-group">
              <label>Nội dung hẹn:</label>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </span>
                <input type="text" id="care-app-noidung" placeholder="Nội dung lịch hẹn tiếp theo..." />
              </div>
            </div>
            <div class="input-field-group">
              <label>ĐT:</label>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                </span>
                <input type="text" id="care-app-dienthoai" placeholder="Số điện thoại liên hệ..." />
              </div>
            </div>
            <div class="input-field-group">
              <label>Thời gian:</label>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <input type="datetime-local" id="care-app-thoigian" value="${appDateIso}" />
              </div>
            </div>
            <div class="input-field-group">
              <label>Người được giao:</label>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </span>
                <select id="care-app-idnv">
                  <option value="">---{ Chọn nhân viên }---</option>
                  ${optList(state.catalogs?.nhanVien, "idnhanvien", "hoten", defaultStaffId)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="cust-modal-actions care-modal-actions">
        <button type="submit" class="btn btn-primary care-btn-save" id="btn-submit-care-modal">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          <span>Lưu</span>
        </button>
        <button type="button" class="btn btn-outline care-btn-cancel" onclick="closeModal()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>Huỷ</span>
        </button>
      </div>
    </form>
    `,
    true,
    "modal-care-entry",
  );

  // Hook checkbox Chọn đầu việc
  const chkTask = $("#chk-care-opt-task");
  const selTask = $("#care-task-iddanhmuc");
  const row2Panel = $("#care-task-row2-panel");
  const selTaskStaff = $("#care-task-idnv");
  const chkDuyet = $("#care-task-duyet");
  const txtDiem = $("#care-task-diem");
  const txtGio = $("#care-task-gio");
  const boxWrapper = $("#care-task-box-wrapper");

  chkTask?.addEventListener("change", () => {
    const isChecked = chkTask.checked;
    if (selTask) selTask.disabled = !isChecked;
    if (row2Panel) row2Panel.classList.toggle("is-disabled", !isChecked);
    if (selTaskStaff) selTaskStaff.disabled = !isChecked;
    if (chkDuyet) chkDuyet.disabled = !isChecked;
    if (boxWrapper) boxWrapper.classList.toggle("is-active", isChecked);

    if (!isChecked) {
      if (selTask) selTask.value = "";
      if (selTaskStaff) selTaskStaff.value = "";
      if (txtDiem) txtDiem.value = "0,";
      if (txtGio) txtGio.value = "0,";
    }
  });

  // Khi chọn đầu việc: gọi SP tblnhomdauvieclaptrinh_SelectAll_ByID và tự điền điểm, giờ
  selTask?.addEventListener("change", async (e) => {
    const val = e.target.value;
    if (!val) {
      if (txtDiem) txtDiem.value = "0,";
      if (txtGio) txtGio.value = "0,";
      return;
    }

    const found = (state.catalogs?.danhmucDauViecCoDinh || []).find((x) => String(x.iddanhmucdauviec) === String(val));
    let diem = found?.diem != null ? found.diem : 0;
    let gio = found?.dukiensogiolam != null ? found.dukiensogiolam : 0;

    try {
      const dataTable = await api(`/api/catalogs/nhomdauvieclaptrinh/${encodeURIComponent(val)}`);
      if (dataTable) {
        if (dataTable.diem != null) diem = dataTable.diem;
        if (dataTable.dukiensogiolam != null) gio = dataTable.dukiensogiolam;
      }
    } catch (_) {}

    if (txtDiem) txtDiem.value = `${diem},`;
    if (txtGio) txtGio.value = `${parseFloat(gio) || 0},`;
  });

  // Hook toggle accordions cho KTV và Lịch hẹn
  const bindToggle = (chkId, bodyId) => {
    const chk = $(`#${chkId}`);
    const body = $(`#${bodyId}`);
    if (!chk || !body) return;
    chk.addEventListener("change", () => {
      body.classList.toggle("hidden", !chk.checked);
    });
  };
  bindToggle("chk-care-opt-ktv", "care-expand-ktv-body");
  bindToggle("chk-care-opt-app", "care-expand-app-body");

  // Submit care form
  $("#care-quick-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      idkhachhang: fd.get("idkhachhang"),
      ngaythang: fd.get("ngaythang"),
      idhinhthucchamsoc: fd.get("idhinhthucchamsoc"),
      iddanhgiakhachhang: fd.get("iddanhgiakhachhang"),
      idlydokhachhang: fd.get("idlydokhachhang"),
      idtrangthai: fd.get("idtrangthai") || "",
      ghichu: fd.get("ghichu")?.trim() || "",
      idnhanvien: state.user?.idnhanvien || "",
      isquantam: fd.get("isquantam") === "on",
    };

    if (!payload.idkhachhang) {
      toast("Vui lòng chọn khách hàng.");
      return;
    }
    if (!payload.idhinhthucchamsoc) {
      toast("Vui lòng chọn hình thức chăm sóc.");
      $("#care-quick-form select[name='idhinhthucchamsoc']")?.focus();
      return;
    }
    if (!payload.idlydokhachhang) {
      toast("Vui lòng chọn lý do chăm sóc.");
      $("#care-quick-form select[name='idlydokhachhang']")?.focus();
      return;
    }
    if (!payload.iddanhgiakhachhang) {
      toast("Vui lòng chọn đánh giá khách hàng.");
      $("#care-quick-form select[name='iddanhgiakhachhang']")?.focus();
      return;
    }
    if (!payload.ghichu) {
      toast("Vui lòng nhập nội dung ghi nhận chăm sóc.");
      $("#care-modal-ghichu")?.focus();
      return;
    }

    // Nếu có chọn đầu việc
    if ($("#chk-care-opt-task")?.checked && $("#care-task-iddanhmuc")?.value) {
      payload.dauViecCoDinh = {
        iddanhmucdauviec: $("#care-task-iddanhmuc").value,
        idnhanvienlam: $("#care-task-idnv")?.value || null,
        diem: parseFloat($("#care-task-diem")?.value) || 0,
        dukiensogiolam: parseFloat($("#care-task-gio")?.value) || 0,
        isduyet: $("#care-task-duyet")?.checked ? 1 : 0,
      };
    }

    const submitBtn = $("#btn-submit-care-modal");
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await api("/api/care", { method: "POST", body: JSON.stringify(payload) });

      // Nếu có tích thêm lịch hẹn
      if ($("#chk-care-opt-app")?.checked) {
        const noidungHen = $("#care-app-noidung")?.value?.trim();
        const thoigianHen = $("#care-app-thoigian")?.value;
        if (noidungHen && thoigianHen) {
          try {
            await api("/api/appointments", {
              method: "POST",
              body: JSON.stringify({
                idkhachhang: payload.idkhachhang,
                noidunghen: noidungHen,
                ngayhen: thoigianHen.slice(0, 10),
                giohen: thoigianHen.slice(11, 16) || "09:00",
                dienthoaihen: $("#care-app-dienthoai")?.value?.trim() || "",
                idnguoiduocgiao: $("#care-app-idnv")?.value || payload.idnhanvien,
              }),
            });
          } catch (_) {}
        }
      }

      // Nếu có tích giao việc kỹ thuật
      if ($("#chk-care-opt-ktv")?.checked) {
        const ktvId = $("#care-ktv-idnv")?.value;
        const nhomViecId = $("#care-ktv-nhomviec")?.value;
        if (ktvId && nhomViecId) {
          try {
            await api("/api/tasks", {
              method: "POST",
              body: JSON.stringify({
                idkhachhang: payload.idkhachhang,
                idnguoithuchien: ktvId,
                idnhomdauvieclaptrinh: nhomViecId,
                noidung: payload.ghichu || "Giao việc kỹ thuật theo chăm sóc",
                soluong: Number($("#care-ktv-soluong")?.value) || 1,
                dukiensogiolam: Number($("#care-ktv-gio")?.value) || 0,
                ngaybatdau: payload.ngaythang,
              }),
            });
          } catch (_) {}
        }
      }

      toast("Đã thêm thông tin chăm sóc khách hàng thành công");
      closeModal();
      if (typeof onSaved === "function") onSaved(res);
    } catch (err) {
      toast(err.message || "Không thêm được thông tin chăm sóc khách hàng");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

// ==================== CARE (CSKH) ====================
async function renderCare() {
  const el = $("#page-content");
  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Nhật ký Chăm sóc Khách hàng</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-care">+ Ghi nhận CSKH</button>
      </div>
      <div class="toolbar">
        <input id="care-q" placeholder="Tìm khách hàng, nội dung..." />
        <select id="care-dg"><option value="">-- Đánh giá --</option>${optList(state.catalogs.danhGiaKhachHang, "iddanhgiakhachhang", "tendanhgiakhachhang")}</select>
        <label class="checkbox-row"><input type="checkbox" id="care-qt" /> Chỉ khách quan tâm</label>
        <button class="btn btn-outline btn-sm" id="care-search">Lọc</button>
      </div>
      <div id="care-table">Đang tải...</div>
    </div>
  `;

  const load = async () => {
    const params = new URLSearchParams({
      q: $("#care-q").value,
      iddanhgiakhachhang: $("#care-dg").value,
      isquantam: $("#care-qt").checked ? "1" : "",
    });
    const data = await api(`/api/care?${params}`);
    $("#care-table").innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Thời gian</th><th>Khách hàng</th><th>Hình thức</th><th>Đánh giá</th><th>Ghi chú</th><th>NV</th></tr></thead>
          <tbody>
            ${
              data.items.length
                ? data.items
                    .map(
                      (x) => `
              <tr>
                <td>${fmtDateTime(x.ngaythang)}</td>
                <td><strong>${esc(x.tenkhachhang)}</strong><div class="muted">${esc(x.dienthoai)}</div></td>
                <td>${esc(x.tenhinhthuc || "-")}</td>
                <td><span class="badge ${x.isquantam ? "badge-amber" : "badge-blue"}">${esc(x.tendanhgiakhachhang || "-")}</span></td>
                <td>${esc(x.ghichu)}</td>
                <td>${esc(x.tennhanvien)}</td>
              </tr>
            `,
                    )
                    .join("")
                : '<tr><td colspan="6" class="muted">Không có dữ liệu.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    `;
  };

  $("#care-search").addEventListener("click", load);
  $("#btn-add-care").addEventListener("click", () => {
    openAddCareModal(null, "", () => load());
  });
  await load();
}

// ==================== APPOINTMENTS ====================
async function renderAppointments() {
  const el = $("#page-content");
  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Quản lý Lịch hẹn</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-app">+ Tạo lịch hẹn</button>
      </div>
      <div class="toolbar">
        <input id="app-q" placeholder="Tìm khách hàng, nội dung..." />
        <select id="app-st"><option value="">-- Tất cả --</option><option value="0">Chưa xử lý</option><option value="1">Đã hoàn thành</option></select>
        <button class="btn btn-outline btn-sm" id="app-search">Lọc</button>
      </div>
      <div id="app-table">Đang tải...</div>
    </div>
  `;

  const load = async () => {
    const params = new URLSearchParams({
      q: $("#app-q").value,
      trangthaixuly: $("#app-st").value,
    });
    const items = await api(`/api/appointments?${params}`);
    $("#app-table").innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ngày / Giờ</th><th>Khách hàng</th><th>Nội dung hẹn</th><th>Người được giao</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            ${
              items.length
                ? items
                    .map(
                      (a) => `
              <tr>
                <td><strong>${fmtDate(a.ngayhen)}</strong> ${esc(a.giohen || "")}</td>
                <td>${esc(a.tenkhachhang || "Khách lẻ")}</td>
                <td>${esc(a.noidunghen)}</td>
                <td>${esc(a.tennguoiduocgiao || "-")}</td>
                <td><span class="badge ${a.trangthaixuly ? "badge-green" : "badge-amber"}">${a.trangthaixuly ? "Đã xử lý" : "Chờ xử lý"}</span></td>
                <td><button class="btn btn-outline btn-sm" data-toggle-app="${esc(a.idlichhen)}" data-val="${a.trangthaixuly ? 0 : 1}">${a.trangthaixuly ? "Mở lại" : "Hoàn thành"}</button></td>
              </tr>
            `,
                    )
                    .join("")
                : '<tr><td colspan="6" class="muted">Không có lịch hẹn.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    `;
    $$("[data-toggle-app]").forEach((b) =>
      b.addEventListener("click", async () => {
        await api(`/api/appointments/${b.dataset.toggleApp}/status`, {
          method: "PATCH",
          body: JSON.stringify({ trangthaixuly: b.dataset.val === "1" }),
        });
        load();
      }),
    );
  };

  $("#app-search").addEventListener("click", load);
  $("#btn-add-app").addEventListener("click", async () => {
    const custs = await api("/api/customers?limit=100");
    openModal(
      "Tạo lịch hẹn mới",
      `
      <form id="app-form" class="form-stack">
        <div class="form-grid">
          <div class="form-group"><label>Ngày hẹn *</label><input type="date" name="ngayhen" required /></div>
          <div class="form-group"><label>Giờ hẹn</label><input name="giohen" placeholder="09:30" /></div>
          <div class="form-group"><label>Khách hàng</label><select name="idkhachhang"><option value="">-- Khách lẻ --</option>${optList(custs.items, "idkhachhang", "tenkhachhang")}</select></div>
          <div class="form-group"><label>Giao cho nhân viên</label><select name="idnguoiduocgiao">${optList(state.catalogs.nhanVien, "idnhanvien", "hoten", state.user.idnhanvien)}</select></div>
        </div>
        <div class="form-group"><label>Nội dung hẹn *</label><textarea name="noidunghen" rows="3" required></textarea></div>
        <button type="submit" class="btn btn-primary">Lưu lịch hẹn</button>
      </form>
    `,
    );
    $("#app-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      await api("/api/appointments", {
        method: "POST",
        body: JSON.stringify(
          Object.fromEntries(new FormData(e.target).entries()),
        ),
      });
      toast("Đã tạo lịch hẹn");
      closeModal();
      load();
    });
  });
  await load();
}

// ==================== PRODUCTS & PACKAGES ====================
async function renderProducts() {
  const el = $("#page-content");
  el.innerHTML = `
    <div class="card">
      <div class="tabs">
        <button class="tab-btn active" data-ptab="packages">Gói dịch vụ & Hạn sử dụng</button>
        <button class="tab-btn" data-ptab="catalog">Danh mục Sản phẩm / Dịch vụ</button>
      </div>
      <div id="prod-body"></div>
    </div>
  `;

  const renderPkg = async () => {
    const items = await api("/api/products/packages");
    $("#prod-body").innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Khách hàng</th><th>Gói</th><th>Bắt đầu</th><th>Hết hạn</th><th>Còn lại</th><th>Đã thu</th><th>NV</th></tr></thead>
          <tbody>
            ${
              items.length
                ? items
                    .map(
                      (p) => `
              <tr>
                <td><strong>${esc(p.tenkhachhang)}</strong></td>
                <td>${esc(p.tenloaikhachhang)}</td>
                <td>${fmtDate(p.ngaybatdau)}</td>
                <td>${fmtDate(p.ngayhethan)}</td>
                <td><span class="badge ${p.songayconlai < 0 ? "badge-red" : p.songayconlai <= 30 ? "badge-amber" : "badge-green"}">${p.songayconlai} ngày</span></td>
                <td>${fmtMoney(p.tongsotiendathu)}</td>
                <td>${esc(p.tennhanvien)}</td>
              </tr>
            `,
                    )
                    .join("")
                : '<tr><td colspan="7" class="muted">Không có dữ liệu.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    `;
  };

  const renderCat = async () => {
    const items = await api("/api/products/catalog");
    $("#prod-body").innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Mã SP</th><th>Tên sản phẩm / dịch vụ</th><th>Loại KH</th><th>Đơn giá</th><th>Giảm giá</th></tr></thead>
          <tbody>
            ${
              items.length
                ? items
                    .map(
                      (s) => `
              <tr><td>${esc(s.idsanpham)}</td><td><strong>${esc(s.sanpham)}</strong></td><td>${esc(s.tenloaikhachhang || "-")}</td><td>${fmtMoney(s.dongia)}</td><td>${fmtMoney(s.giamgia)}</td></tr>
            `,
                    )
                    .join("")
                : '<tr><td colspan="5" class="muted">Không có dữ liệu.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    `;
  };

  $$("[data-ptab]").forEach((b) =>
    b.addEventListener("click", () => {
      $$("[data-ptab]").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      b.dataset.ptab === "packages" ? renderPkg() : renderCat();
    }),
  );
  await renderPkg();
}

// ==================== TASKS ====================
async function renderTasks() {
  const el = $("#page-content");
  const { firstDayStr, lastDayStr } = getCurrentMonthRange();

  // Xác định người thực hiện mặc định CHÍNH XÁC là Nguyễn Văn Huy (không chọn nhầm Nguyễn Quốc Huy)
  const allStaff = state.catalogs.nhanVien || [];
  const isNguyenVanHuy = (name) => {
    if (!name) return false;
    const n = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    return n.includes("nguyen van huy");
  };

  const huyStaff = allStaff.find((nv) => isNguyenVanHuy(nv.hoten));

  let staffFilterOptions = `<option value="all">-- Tất cả người thực hiện --</option>`;
  let foundHuy = false;
  allStaff.forEach((nv) => {
    const isHuy = huyStaff
      ? nv.idnhanvien === huyStaff.idnhanvien
      : isNguyenVanHuy(nv.hoten);
    if (isHuy) foundHuy = true;
    staffFilterOptions += `<option value="${esc(nv.idnhanvien)}" ${isHuy ? "selected" : ""}>${esc(nv.hoten)}</option>`;
  });
  if (!foundHuy) {
    staffFilterOptions =
      `<option value="all">-- Tất cả người thực hiện --</option><option value="Nguyễn Văn Huy" selected>Nguyễn Văn Huy</option>` +
      staffFilterOptions.replace(
        '<option value="all">-- Tất cả người thực hiện --</option>',
        "",
      );
  }

  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 style="font-size:17px">Danh sách Công việc (Tasklist)</h3>
          <p class="muted" style="margin:4px 0 0;font-size:12.5px">Quản lý tiến độ công việc, phân công và xử lý yêu cầu khách hàng</p>
        </div>
      </div>

      <!-- BỘ LỌC TÌM KIẾM THEO TỪ NGÀY ĐẾN NGÀY, NGƯỜI THỰC HIỆN VÀ TRẠNG THÁI -->
      <div class="task-filter-panel">
        <div class="filter-field field-date">
          <label for="task-from">Từ ngày</label>
          <input type="date" id="task-from" value="${firstDayStr}" />
        </div>
        <div class="filter-field field-date">
          <label for="task-to">Đến ngày</label>
          <input type="date" id="task-to" value="${lastDayStr}" />
        </div>
        <div class="filter-field field-staff">
          <label for="task-staff-filter">Người thực hiện</label>
          <select id="task-staff-filter">
            ${staffFilterOptions}
          </select>
        </div>
        <div class="filter-field field-status">
          <label for="task-status-filter">Trạng thái</label>
          <select id="task-status-filter">
            <option value="tiepnhanmoi" selected>Tiếp nhận mới</option>
            <option value="dangthuchien">Đang thực hiện</option>
            <option value="dahoanthanh">Đã hoàn thành</option>
            <option value="all">Tất cả</option>
          </select>
        </div>
        <div class="filter-field flex-grow field-search">
          <label for="task-q">Tìm kiếm từ khóa</label>
          <input type="text" id="task-q" placeholder="Tìm theo tên khách hàng, nội dung..." />
        </div>
        <div class="filter-actions">
          <button class="btn btn-primary btn-sm" id="task-btn-search">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            Tìm kiếm
          </button>
          <button class="btn btn-outline btn-sm" id="task-btn-reset" title="Đặt lại bộ lọc về mặc định">
            Đặt lại
          </button>
        </div>
      </div>

      <!-- DANH SÁCH BẢNG CÔNG VIỆC -->
      <div id="task-table">
        <div style="padding:24px;text-align:center;color:var(--muted)">Đang tải danh sách công việc...</div>
      </div>
    </div>
  `;

  const load = async () => {
    const q = $("#task-q")?.value?.trim() || "";
    const from = $("#task-from")?.value || "";
    const to = $("#task-to")?.value || "";
    const staff = $("#task-staff-filter")?.value || "";
    const status = $("#task-status-filter")?.value || "tiepnhanmoi";

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (staff && staff !== "all") params.set("idnguoithuchien", staff);
    if (status) params.set("idtrangthaitasklist", status);

    try {
      const items = await api(`/api/tasks?${params.toString()}`);
      $("#task-table").innerHTML = `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="min-width:180px">Tên khách hàng</th>
                <th style="min-width:260px">Nội dung công việc</th>
                <th style="min-width:140px">Người thực hiện</th>
                <th style="min-width:110px">Giờ dự kiến</th>
                <th style="min-width:110px">Ngày tạo</th>
                <th style="min-width:130px">Người tạo</th>
                <th style="width:80px;text-align:center">Trạng thái</th>
                <th style="width:60px;text-align:center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${
                items.length
                  ? items
                      .map((t) => {
                        const stVal = String(t.idtrangthaitasklist || "");
                        const stName = String(t.tentrangthai || "");
                        let currentMapped = "30720200000";
                        let dotClass = "dot-new";
                        let statusTitle =
                          "Tiếp nhận mới (Nhấp để đổi trạng thái)";

                        if (
                          stVal === "30720200001" ||
                          stName.includes("Đang thực hiện")
                        ) {
                          currentMapped = "30720200001";
                          dotClass = "dot-progress";
                          statusTitle =
                            "Đang thực hiện (Nhấp để đổi trạng thái)";
                        } else if (
                          stVal === "30720200002" ||
                          stName.includes("hoàn thành") ||
                          stVal === "HOANTHANH"
                        ) {
                          currentMapped = "30720200002";
                          dotClass = "dot-done";
                          statusTitle =
                            "Đã hoàn thành (Nhấp để đổi trạng thái)";
                        }

                        return `
                  <tr>
                    <td>
                      <strong>${esc(t.tenkhachhang || "Khách lẻ / Nội bộ")}</strong>
                      ${t.makhachhang ? `<div class="muted" style="font-size:11px;margin-top:2px">Mã: ${esc(t.makhachhang)}</div>` : ""}
                    </td>
                    <td>
                      <div style="font-weight:600;color:var(--text)">${esc(t.noidung)}</div>
                      ${t.ghichu ? `<div class="muted" style="font-size:12px;margin-top:4px">${esc(t.ghichu)}</div>` : ""}
                      ${
                        t.mucuutien
                          ? `
                        <span class="badge ${t.mucuutien === "Khẩn cấp" ? "badge-red" : t.mucuutien === "Cao" ? "badge-amber" : "badge-blue"}" style="margin-top:5px">
                          ${esc(t.mucuutien)}
                        </span>
                      `
                          : ""
                      }
                    </td>
                    <td>
                      <span style="font-weight:600;color:var(--text)">${esc(t.tennguoithuchien || "-")}</span>
                    </td>
                    <td>
                      <span class="badge badge-amber" style="font-weight:700">
                        ${t.tongdukiensogiolam ?? t.dukiensogiolam ?? 0} giờ
                      </span>
                    </td>
                    <td>
                      <span style="font-size:13px;color:var(--text-secondary);font-weight:500">${fmtDateOnly(t.ngaytao)}</span>
                    </td>
                    <td>
                      <span style="color:#94a3b8">${esc(t.tennguoitao || "-")}</span>
                    </td>
                    <td style="text-align:center">
                      <div class="status-dot-cell">
                        <div class="status-dot-wrapper" title="${statusTitle}">
                          <select class="status-dot-select" data-task-status="${esc(t.idtasklist)}" data-val="${currentMapped}">
                            <option value="30720200000" ${currentMapped === "30720200000" ? "selected" : ""}>🔵 Tiếp nhận mới</option>
                            <option value="30720200001" ${currentMapped === "30720200001" ? "selected" : ""}>🟠 Đang thực hiện</option>
                            <option value="30720200002" ${currentMapped === "30720200002" ? "selected" : ""}>🟢 Đã hoàn thành</option>
                          </select>
                          <span class="status-dot-glow ${dotClass}"></span>
                        </div>
                      </div>
                    </td>
                    <td style="text-align:center">
                      <button class="btn btn-ghost btn-sm" data-del-task="${esc(t.idtasklist)}" title="Xóa công việc" style="color:var(--danger)">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                `;
                      })
                      .join("")
                  : `
                <tr>
                  <td colspan="8" style="text-align:center;padding:32px;color:var(--muted)">
                    Không tìm thấy công việc nào phù hợp với bộ lọc.
                  </td>
                </tr>
              `
              }
            </tbody>
          </table>
        </div>
        <div class="task-footer-stats" style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:12.5px;flex-wrap:wrap;gap:8px">
          <span>Tìm thấy: <strong style="color:var(--text)">${items.length}</strong> công việc</span>
          <span style="font-size:11.5px">Trạng thái: <strong>${$("#task-status-filter option:checked")?.text || ""}</strong></span>
        </div>
      `;

      // Cập nhật trạng thái công việc (đổi chấm màu và gửi API)
      $$(".status-dot-select").forEach((sel) =>
        sel.addEventListener("change", async () => {
          const newStatus = sel.value;
          const glow = sel.parentElement?.querySelector(".status-dot-glow");
          if (glow) {
            glow.className =
              "status-dot-glow " +
              (newStatus === "30720200000"
                ? "dot-new"
                : newStatus === "30720200001"
                  ? "dot-progress"
                  : "dot-done");
          }
          const titleText =
            newStatus === "30720200000"
              ? "Tiếp nhận mới (Nhấp để đổi trạng thái)"
              : newStatus === "30720200001"
                ? "Đang thực hiện (Nhấp để đổi trạng thái)"
                : "Đã hoàn thành (Nhấp để đổi trạng thái)";
          sel.parentElement?.setAttribute("title", titleText);

          try {
            await api(`/api/tasks/${sel.dataset.taskStatus}/status`, {
              method: "PATCH",
              body: JSON.stringify({ idtrangthaitasklist: newStatus }),
            });
            toast("Đã cập nhật trạng thái công việc");
          } catch (err) {
            toast(`Lỗi: ${err.message}`);
            load();
          }
        }),
      );

      // Xóa công việc
      $$("[data-del-task]").forEach((btn) =>
        btn.addEventListener("click", async () => {
          if (!confirm("Bạn có chắc chắn muốn xóa công việc này?")) return;
          try {
            await api(`/api/tasks/${btn.dataset.delTask}`, {
              method: "DELETE",
            });
            toast("Đã xóa công việc");
            load();
          } catch (err) {
            toast(`Lỗi: ${err.message}`);
          }
        }),
      );
    } catch (err) {
      $("#task-table").innerHTML =
        `<div class="modern-alert error">Lỗi tải dữ liệu: ${esc(err.message)}</div>`;
    }
  };

  // Sự kiện tìm kiếm & lọc
  $("#task-btn-search")?.addEventListener("click", load);
  $("#task-status-filter")?.addEventListener("change", load);
  $("#task-staff-filter")?.addEventListener("change", load);
  $("#task-q")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      load();
    }
  });

  // Đặt lại bộ lọc
  $("#task-btn-reset")?.addEventListener("click", () => {
    $("#task-from").value = firstDayStr;
    $("#task-to").value = lastDayStr;
    $("#task-q").value = "";
    $("#task-status-filter").value = "tiepnhanmoi";
    if ($("#task-staff-filter")) {
      const huyOpt = Array.from($("#task-staff-filter").options).find((opt) => {
        const t = opt.text
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return t.includes("nguyen van huy");
      });
      if (huyOpt) {
        $("#task-staff-filter").value = huyOpt.value;
      } else {
        $("#task-staff-filter").value = "all";
      }
    }
    load();
  });

  // Tự động load lần đầu với trạng thái mặc định "Tiếp nhận mới" và người thực hiện "Nguyễn Văn Huy"
  await load();
}

// ==================== THỐNG KÊ TIME KTV ====================
// ==================== THỐNG KÊ TIME KTV (GHÉP A + B) ====================
async function renderKtvTime() {
  const el = $("#page-content");
  const { firstDayStr, lastDayStr } = getCurrentMonthRange();

  // Helper tính khoảng ngày tháng trước
  const getPrevMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    const fmt = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };
    return { firstDayStr: fmt(firstDay), lastDayStr: fmt(lastDay) };
  };

  // Helper tính khoảng ngày tuần này (Thứ 2 ➜ Chủ nhật)
  const getCurrentWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(now);
    mon.setDate(diffToMon);
    const sun = new Date(now);
    sun.setDate(diffToMon + 6);
    const fmt = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };
    return { firstDayStr: fmt(mon), lastDayStr: fmt(sun) };
  };

  el.innerHTML = `
    <!-- Bảng Thống kê & Bộ lọc -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="flex-wrap:wrap;gap:12px;justify-content:space-between">
        <div>
          <h3 style="font-size:17px;font-weight:800;display:flex;align-items:center;gap:8px">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color:var(--primary)">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Thống kê Giờ làm Kỹ thuật viên (Time KTV)
          </h3>
          <p class="muted" style="margin:3px 0 0;font-size:12.5px">
            Tổng hợp dữ liệu giờ làm việc thực tế so với định mức dự kiến của các đầu việc cố định & phát sinh
          </p>
        </div>

        <!-- Chuyển đổi chế độ xem: Bảng đối chiếu (A) & Thẻ hồ sơ (B) -->
        <div class="view-mode-toggle">
          <button type="button" class="view-mode-btn" id="btn-view-table" title="Xem dạng Bảng đối chiếu chi tiết">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Dạng Bảng (Chuẩn)
          </button>
          <button type="button" class="view-mode-btn" id="btn-view-cards" title="Xem dạng Thẻ hồ sơ từng KTV">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Dạng Thẻ Hồ sơ
          </button>
        </div>
      </div>

      <!-- BỘ LỌC TÌM KIẾM, SẮP XẾP & CHIP THỜI GIAN NHANH -->
      <div class="task-filter-panel">
        <div style="display:flex;align-items:center;gap:6px;width:100%;margin-bottom:4px;flex-wrap:wrap">
          <span style="font-size:11.5px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;margin-right:4px">Chọn nhanh kỳ:</span>
          <div class="ktv-quick-chips">
            <button type="button" class="ktv-quick-chip active" id="chip-this-month" data-range="this-month">Tháng này</button>
            <button type="button" class="ktv-quick-chip" id="chip-last-month" data-range="last-month">Tháng trước</button>
            <button type="button" class="ktv-quick-chip" id="chip-this-week" data-range="this-week">Tuần này</button>
          </div>
        </div>

        <div class="filter-field field-date">
          <label for="ktv-from">Từ ngày duyệt</label>
          <input type="date" id="ktv-from" value="${firstDayStr}" />
        </div>
        <div class="filter-field field-date">
          <label for="ktv-to">Đến ngày duyệt</label>
          <input type="date" id="ktv-to" value="${lastDayStr}" />
        </div>
        <div class="filter-field field-sort">
          <label for="ktv-sort">Sắp xếp theo</label>
          <select id="ktv-sort">
            <option value="thucte_desc" selected>Giờ thực tế: Cao ➜ Thấp</option>
            <option value="thucte_asc">Giờ thực tế: Thấp ➜ Cao</option>
            <option value="hieusuat_desc">Hiệu suất (%): Cao ➜ Thấp</option>
            <option value="dukien_desc">Giờ dự kiến: Cao ➜ Thấp</option>
            <option value="dukien_asc">Giờ dự kiến: Thấp ➜ Cao</option>
            <option value="name">Tên nhân viên: A ➜ Z</option>
          </select>
        </div>
        <div class="filter-field flex-grow field-search">
          <label for="ktv-q">Tìm kiếm nhân viên</label>
          <input type="text" id="ktv-q" placeholder="Nhập tên KTV, số điện thoại, mã NV..." />
        </div>
        <div class="filter-actions">
          <button class="btn btn-primary btn-sm" id="ktv-btn-search">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            Tìm kiếm
          </button>
          <button class="btn btn-outline btn-sm" id="ktv-btn-reset" title="Đặt lại bộ lọc về đầu tháng - cuối tháng">
            Đặt lại
          </button>
        </div>
      </div>
    </div>

    <!-- 4 THẺ KPI TỔNG QUAN TOÀN BỘ ĐỘI NGŨ KTV -->
    <div class="ktv-kpi-grid" id="ktv-kpi-wrap">
      <div class="ktv-kpi-card">
        <div class="kpi-icon-box blue">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div class="kpi-content">
          <span class="kpi-label">KTV HOẠT ĐỘNG</span>
          <strong class="kpi-val" id="kpi-total-ktv">0 <small style="font-size:12px;font-weight:600">nhân sự</small></strong>
          <span class="kpi-sub" style="font-size:11.5px;color:var(--text-secondary)">Đã hoàn thành duyệt việc</span>
        </div>
      </div>

      <div class="ktv-kpi-card">
        <div class="kpi-icon-box amber">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div class="kpi-content">
          <span class="kpi-label">TỔNG GIỜ DỰ KIẾN</span>
          <strong class="kpi-val" id="kpi-total-dukien" style="color:#b45309">0.0 <small style="font-size:12px;font-weight:600">h</small></strong>
          <span class="kpi-sub" style="font-size:11.5px;color:var(--text-secondary)">Định mức công việc giao</span>
        </div>
      </div>

      <div class="ktv-kpi-card">
        <div class="kpi-icon-box green">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="kpi-content">
          <span class="kpi-label">TỔNG GIỜ THỰC TẾ</span>
          <strong class="kpi-val" id="kpi-total-thucte" style="color:#15803d">0.0 <small style="font-size:12px;font-weight:600">h</small></strong>
          <span class="kpi-sub" style="font-size:11.5px;color:var(--text-secondary)">Thực tế KTV cống hiến</span>
        </div>
      </div>

      <div class="ktv-kpi-card">
        <div class="kpi-icon-box purple">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div class="kpi-content">
          <span class="kpi-label">HIỆU SUẤT TRUNG BÌNH</span>
          <strong class="kpi-val" id="kpi-avg-hieusuat" style="color:var(--primary)">0%</strong>
          <span class="kpi-sub" id="kpi-diff-status" style="font-size:11.5px;font-weight:700">Đang nạp...</span>
        </div>
      </div>
    </div>

    <!-- KHUNG DỮ LIỆU CHÍNH (BẢNG ĐỐI CHIẾU HOẶC THẺ HỒ SƠ) -->
    <div id="ktv-table-wrap">
      <div style="padding:28px;text-align:center;color:var(--muted)">Đang tải thống kê giờ làm kỹ thuật viên...</div>
    </div>
  `;

  // Mặc định là Dạng Bảng đối chiếu (A) theo đề bài yêu cầu "bảng Thống kê Giờ làm KTV"
  let ktvViewMode = state.ktvViewMode || "table";

  const updateToggleButtons = () => {
    if ($("#btn-view-table")) {
      $("#btn-view-table").className =
        "view-mode-btn " + (ktvViewMode === "table" ? "active-mode" : "");
    }
    if ($("#btn-view-cards")) {
      $("#btn-view-cards").className =
        "view-mode-btn " + (ktvViewMode === "cards" ? "active-mode" : "");
    }
  };

  // Modal Chi tiết Hồ sơ Năng suất KTV & Đầu việc
  const openKtvDetailModal = (nv, fromDate, toDate) => {
    const diffSign = nv.chenhlech > 0 ? "+" : "";
    const diffClass = nv.chenhlech >= 0 ? "plus" : "minus";
    const barClass = nv.hieusuat >= 100 ? "high" : (nv.hieusuat >= 90 ? "mid" : "low");

    openModal(
      `Hồ sơ Năng suất: ${nv.hoten}`,
      `
      <div class="ktv-profile-header">
        <div class="ktv-profile-avatar">${esc((nv.hoten || "KT").slice(0, 2).toUpperCase())}</div>
        <div class="ktv-profile-info">
          <h3>${esc(nv.hoten)}</h3>
          <div class="ktv-profile-meta">
            ${nv.idnhanvien ? `<span>Mã: <strong>${esc(nv.idnhanvien)}</strong></span>` : ""}
            ${nv.dienthoai ? `<span>📞 <strong class="cs-copyable-cell" data-copy-val="${esc(nv.dienthoai)}" title="Nhấp để sao chép SĐT">${esc(nv.dienthoai)}</strong></span>` : ""}
            <span>Bộ phận: <strong style="color:var(--primary)">${esc(nv.tenbophan || "Kỹ thuật")}</strong></span>
            ${nv.email ? `<span>✉️ ${esc(nv.email)}</span>` : ""}
          </div>
        </div>
      </div>

      <div class="ktv-detail-stat-row">
        <div class="ktv-detail-stat-box">
          <div class="stat-label">Giờ dự kiến</div>
          <div class="stat-val" style="color:#b45309">${nv.tongdukien} <small style="font-size:12px;font-weight:500">h</small></div>
        </div>
        <div class="ktv-detail-stat-box">
          <div class="stat-label">Giờ thực tế</div>
          <div class="stat-val" style="color:#15803d">${nv.tongthucte} <small style="font-size:12px;font-weight:500">h</small></div>
        </div>
        <div class="ktv-detail-stat-box">
          <div class="stat-label">Hiệu suất</div>
          <div class="stat-val" style="color:var(--primary)">${nv.hieusuat}%</div>
        </div>
        <div class="ktv-detail-stat-box">
          <div class="stat-label">Chênh lệch</div>
          <div class="stat-val ${diffClass}" style="font-size:16px">${diffSign}${nv.chenhlech} h</div>
        </div>
      </div>

      <div style="background:var(--surface-subtle);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;margin-bottom:6px">
          <span style="color:var(--text-secondary)">Tiến độ giờ làm trong kỳ duyệt:</span>
          <strong>${fmtDateOnly(fromDate)} ➜ ${fmtDateOnly(toDate)}</strong>
        </div>
        <div class="ktv-bar-track" style="height:9px">
          <div class="ktv-bar-fill ${barClass}" style="width:${Math.min(nv.hieusuat, 100)}%"></div>
        </div>
        <div style="margin-top:10px;font-size:13px;line-height:1.55;color:var(--text)">
          Kỹ thuật viên <strong>${esc(nv.hoten)}</strong> hiện xếp thứ <strong>#${nv.stt}</strong> toàn đội ngũ. Tổng số giờ hoàn thành thực tế đạt <strong>${nv.tongthucte} giờ</strong> (${diffSign}${nv.chenhlech} giờ so với định mức giao).
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;border-top:1px solid var(--border);padding-top:14px">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Đóng cửa sổ</button>
        <button type="button" class="btn btn-primary" id="btn-goto-ktv-tasks" style="display:inline-flex;align-items:center;gap:6px">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Mở danh sách việc trên Tasklist
        </button>
      </div>
      `,
      true,
      "modal-ktv-detail",
    );

    // Gắn sự kiện sao chép trong modal
    $("#ktv-modal-content")?.querySelectorAll(".cs-copyable-cell").forEach((cEl) => {
      cEl.addEventListener("click", async (e) => {
        e.stopPropagation();
        const val = cEl.dataset.copyVal || cEl.textContent.trim();
        if (val && val !== "-") {
          await copyToClipboard(val);
          toast(`Đã sao chép "${val}"`);
        }
      });
    });

    // Chuyển trang sang Tasklist lọc theo đúng KTV này
    $("#btn-goto-ktv-tasks")?.addEventListener("click", () => {
      closeModal();
      navigate("tasks");
      setTimeout(() => {
        const filterStaff = $("#task-filter-assignee");
        if (filterStaff && nv.idnhanvien) {
          filterStaff.value = nv.idnhanvien;
          filterStaff.dispatchEvent(new Event("change"));
        }
      }, 150);
    });
  };

  const loadData = async () => {
    const from = $("#ktv-from")?.value || firstDayStr;
    const to = $("#ktv-to")?.value || lastDayStr;
    const sort = $("#ktv-sort")?.value || "thucte_desc";
    const q = $("#ktv-q")?.value?.trim() || "";

    updateToggleButtons();

    const params = new URLSearchParams({ from, to, sort });
    if (q) params.set("q", q);

    try {
      const data = await api(`/api/ktv-time?${params.toString()}`);
      const summary = data.summary || {};
      const items = data.items || [];

      // Cập nhật 4 thẻ KPI tổng quan
      if ($("#kpi-total-ktv")) {
        $("#kpi-total-ktv").innerHTML = `${summary.totalKtvs || items.length} <small style="font-size:12px;font-weight:600">nhân sự</small>`;
      }
      if ($("#kpi-total-dukien")) {
        $("#kpi-total-dukien").innerHTML = `${summary.totalDukien || 0} <small style="font-size:12px;font-weight:600">h</small>`;
      }
      if ($("#kpi-total-thucte")) {
        $("#kpi-total-thucte").innerHTML = `${summary.totalThucte || 0} <small style="font-size:12px;font-weight:600">h</small>`;
      }
      if ($("#kpi-avg-hieusuat")) {
        const avg = summary.avgHieusuat || 0;
        $("#kpi-avg-hieusuat").textContent = `${avg}%`;
        const diff = Math.round(((summary.totalThucte || 0) - (summary.totalDukien || 0)) * 10) / 10;
        const diffEl = $("#kpi-diff-status");
        if (diffEl) {
          if (diff >= 0) {
            diffEl.style.color = "#16a34a";
            diffEl.textContent = `▲ Vượt tiến độ +${diff} giờ`;
          } else {
            diffEl.style.color = "#ea580c";
            diffEl.textContent = `▼ Chậm tiến độ ${diff} giờ`;
          }
        }
      }

      if (ktvViewMode === "table") {
        // PHƯƠNG ÁN A: DẠNG BẢNG ĐỐI CHIẾU CHI TIẾT (MẶC ĐỊNH)
        $("#ktv-table-wrap").innerHTML = `
          <div class="card" style="padding:0;overflow:hidden">
            <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <h4 style="font-size:14.5px;font-weight:800;color:var(--text)">Bảng Xếp hạng & Đối chiếu Giờ làm KTV</h4>
              <span style="font-size:12.5px;color:var(--text-secondary)">
                Tìm thấy <strong>${items.length}</strong> kỹ thuật viên (từ ${fmtDateOnly(from)} ➜ ${fmtDateOnly(to)})
              </span>
            </div>

            <div class="table-wrap" style="border:none;border-radius:0">
              <table class="ktv-table">
                <thead>
                  <tr>
                    <th style="width:65px;text-align:center">Thứ hạng</th>
                    <th style="min-width:220px">Kỹ thuật viên</th>
                    <th style="min-width:130px">Bộ phận</th>
                    <th style="min-width:120px;text-align:right">Giờ dự kiến</th>
                    <th style="min-width:125px;text-align:right">Giờ thực tế</th>
                    <th style="min-width:210px">Tốc độ & Hiệu suất</th>
                    <th style="width:110px;text-align:center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    items.length
                      ? items
                          .map((nv) => {
                            let rankBadge = "";
                            if (nv.stt === 1) {
                              rankBadge = '<span class="ktv-rank-badge top-1" title="Top 1 Năng suất">🥇</span>';
                            } else if (nv.stt === 2) {
                              rankBadge = '<span class="ktv-rank-badge top-2" title="Top 2 Năng suất">🥈</span>';
                            } else if (nv.stt === 3) {
                              rankBadge = '<span class="ktv-rank-badge top-3" title="Top 3 Năng suất">🥉</span>';
                            } else {
                              rankBadge = `<span class="ktv-rank-badge normal">#${nv.stt}</span>`;
                            }

                            const pct = Math.min(Math.round(nv.hieusuat || 0), 200);
                            const barClass = pct >= 100 ? "high" : (pct >= 90 ? "mid" : "low");
                            const diffClass = nv.chenhlech >= 0 ? "plus" : "minus";
                            const diffSign = nv.chenhlech > 0 ? "+" : "";

                            return `
                      <tr class="ktv-row-item" data-id="${esc(nv.idnhanvien)}" style="cursor:pointer" title="Nhấp để xem hồ sơ chi tiết">
                        <td style="text-align:center">${rankBadge}</td>
                        <td>
                          <div style="display:flex;align-items:center;gap:10px">
                            <div class="user-avatar-modern" style="width:36px;height:36px;font-size:12.5px;font-weight:800;flex-shrink:0">
                              ${esc((nv.hoten || "KT").slice(0, 2).toUpperCase())}
                            </div>
                            <div>
                              <strong style="color:var(--text);font-size:13.5px;display:block">${esc(nv.hoten)}</strong>
                              <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;display:flex;gap:6px;align-items:center">
                                ${nv.idnhanvien ? `<span>${esc(nv.idnhanvien)}</span>` : ""}
                                ${nv.dienthoai ? `· <span class="cs-copyable-cell" data-copy-val="${esc(nv.dienthoai)}" title="Nhấp để sao chép SĐT" style="font-weight:600;color:var(--primary)">📞 ${esc(nv.dienthoai)}</span>` : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td><span class="badge badge-blue">${esc(nv.tenbophan || "Kỹ thuật")}</span></td>
                        <td class="ktv-num-cell ktv-num-dukien">
                          ${nv.tongdukien} <small style="font-weight:500;font-size:11px">h</small>
                        </td>
                        <td class="ktv-num-cell ktv-num-thucte">
                          ${nv.tongthucte} <small style="font-weight:500;font-size:11px">h</small>
                        </td>
                        <td>
                          <div class="ktv-perf-box">
                            <div class="ktv-perf-meta">
                              <span style="color:var(--text);font-size:12.5px">${nv.hieusuat}%</span>
                              <span class="ktv-diff-pill ${diffClass}">${diffSign}${nv.chenhlech} h</span>
                            </div>
                            <div class="ktv-bar-track">
                              <div class="ktv-bar-fill ${barClass}" style="width:${Math.min(pct, 100)}%"></div>
                            </div>
                          </div>
                        </td>
                        <td style="text-align:center">
                          <button type="button" class="btn btn-outline btn-sm btn-ktv-detail" style="height:28px;padding:0 9px;font-size:12px" title="Xem chi tiết hồ sơ & đầu việc">
                            Xem việc
                          </button>
                        </td>
                      </tr>
                    `;
                          })
                          .join("")
                      : `
                    <tr>
                      <td colspan="7" style="text-align:center;padding:36px;color:var(--muted)">
                        Không tìm thấy kỹ thuật viên hoặc giờ làm nào trong khoảng ngày duyệt này.
                      </td>
                    </tr>
                  `
                  }
                </tbody>
              </table>
            </div>

            <div class="task-footer-stats" style="padding:12px 18px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:12.5px;flex-wrap:wrap;gap:8px">
              <span>Tổng số: <strong style="color:var(--text)">${items.length}</strong> KTV</span>
              <span>Khoảng ngày duyệt: <strong style="color:var(--text)">${fmtDateOnly(from)} ➜ ${fmtDateOnly(to)}</strong></span>
            </div>
          </div>
        `;
      } else {
        // PHƯƠNG ÁN B: DẠNG THẺ HỒ SƠ TỪNG KTV
        $("#ktv-table-wrap").innerHTML = `
          ${
            items.length
              ? `
            <div class="ktv-cards-grid">
              ${items
                .map((nv) => {
                  let rankHtml = "";
                  if (nv.stt === 1) rankHtml = "🥇 Top 1";
                  else if (nv.stt === 2) rankHtml = "🥈 Top 2";
                  else if (nv.stt === 3) rankHtml = "🥉 Top 3";
                  else rankHtml = `#${nv.stt}`;

                  const pct = Math.min(Math.round(nv.hieusuat || 0), 200);
                  const barClass = pct >= 100 ? "high" : (pct >= 90 ? "mid" : "low");
                  const diffClass = nv.chenhlech >= 0 ? "plus" : "minus";
                  const diffSign = nv.chenhlech > 0 ? "+" : "";

                  return `
                  <div class="ktv-employee-card ktv-row-item" data-id="${esc(nv.idnhanvien)}" style="cursor:pointer" title="Nhấp để xem hồ sơ chi tiết">
                    <!-- Header Card -->
                    <div class="ktv-card-header">
                      <div class="ktv-card-user">
                        <div class="ktv-card-avatar">
                          ${esc((nv.hoten || "KT").slice(0, 2).toUpperCase())}
                        </div>
                        <div class="ktv-card-name-block">
                          <h4 class="ktv-card-name" title="${esc(nv.hoten)}">${esc(nv.hoten)}</h4>
                          <div class="ktv-card-meta">
                            ${nv.idnhanvien ? `<span>Mã: <strong>${esc(nv.idnhanvien)}</strong></span>` : ""}
                            ${nv.dienthoai ? `<span class="cs-copyable-cell" data-copy-val="${esc(nv.dienthoai)}" title="Nhấp để sao chép SĐT">📞 ${esc(nv.dienthoai)}</span>` : ""}
                          </div>
                        </div>
                      </div>
                      <span class="ktv-card-stt-badge ${nv.stt <= 3 ? "top-" + nv.stt : ""}">
                        ${rankHtml}
                      </span>
                    </div>

                    <!-- Chỉ số: Giờ dự kiến & Giờ thực tế -->
                    <div class="ktv-card-stats-row" style="grid-template-columns:1fr 1fr">
                      <div class="ktv-card-stat-box">
                        <div class="ktv-card-stat-label">Giờ dự kiến</div>
                        <div class="ktv-card-stat-val dukien" style="color:#b45309">
                          ${nv.tongdukien} <small>h</small>
                        </div>
                      </div>

                      <div class="ktv-card-stat-box">
                        <div class="ktv-card-stat-label">Giờ thực tế</div>
                        <div class="ktv-card-stat-val thucte" style="color:#15803d">
                          ${nv.tongthucte} <small>h</small>
                        </div>
                      </div>
                    </div>

                    <!-- Tốc độ / Hiệu suất -->
                    <div class="ktv-card-perf-section">
                      <div class="ktv-card-perf-top">
                        <span class="ktv-card-perf-label">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          Tốc độ / Hiệu suất
                        </span>
                        <div class="ktv-card-perf-badges">
                          <span class="ktv-card-diff-tag ${diffClass}">
                            ${diffSign}${nv.chenhlech} h
                          </span>
                          <span class="ktv-card-pct">${nv.hieusuat}%</span>
                        </div>
                      </div>
                      <div class="ktv-bar-track" style="height:8px">
                        <div class="ktv-bar-fill ${barClass}" style="width:${Math.min(pct, 100)}%"></div>
                      </div>
                    </div>

                    <!-- Chân thẻ: Bộ phận & Nút xem việc -->
                    <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:12px;margin-top:2px">
                      <span class="badge badge-blue">${esc(nv.tenbophan || "Kỹ thuật")}</span>
                      <button type="button" class="btn btn-outline btn-sm btn-ktv-detail" style="height:28px;padding:0 10px;font-size:12px">
                        Xem việc ➔
                      </button>
                    </div>
                  </div>
                `;
                })
                .join("")}
            </div>
          `
              : `
            <div style="text-align:center;padding:36px;color:var(--muted)">
              Không tìm thấy kỹ thuật viên hoặc giờ làm nào trong khoảng ngày duyệt này.
            </div>
          `
          }
          <div class="task-footer-stats" style="margin-top:16px;display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:12.5px;flex-wrap:wrap;gap:8px">
            <span>Tìm thấy: <strong style="color:var(--text)">${items.length}</strong> kỹ thuật viên</span>
            <span>Khoảng ngày duyệt: <strong style="color:var(--text)">${fmtDateOnly(from)} ➜ ${fmtDateOnly(to)}</strong></span>
          </div>
        `;
      }

      // Gắn sự kiện sao chép SĐT
      $$(".cs-copyable-cell").forEach((el) => {
        el.addEventListener("click", async (e) => {
          e.stopPropagation();
          const val = el.dataset.copyVal || el.textContent.trim();
          if (val && val !== "-") {
            await copyToClipboard(val);
            toast(`Đã sao chép "${val}"`);
          }
        });
      });

      // Gắn sự kiện mở Modal Chi tiết khi bấm nút Xem việc hoặc bấm dòng / thẻ
      const bindKtvDetailEvents = () => {
        $$(".ktv-row-item").forEach((row, idx) => {
          const nv = items[idx];
          if (!nv) return;

          row.addEventListener("click", (e) => {
            if (e.target.closest(".cs-copyable-cell")) return;
            openKtvDetailModal(nv, from, to);
          });

          const btn = row.querySelector(".btn-ktv-detail");
          if (btn) {
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              openKtvDetailModal(nv, from, to);
            });
          }
        });
      };
      bindKtvDetailEvents();
    } catch (err) {
      $("#ktv-table-wrap").innerHTML =
        `<div class="modern-alert error">Lỗi tải dữ liệu KTV: ${esc(err.message)}</div>`;
    }
  };

  // Sự kiện chuyển đổi chế độ xem Dạng Bảng (A) / Dạng Thẻ (B)
  $("#btn-view-table")?.addEventListener("click", () => {
    ktvViewMode = "table";
    state.ktvViewMode = "table";
    loadData();
  });
  $("#btn-view-cards")?.addEventListener("click", () => {
    ktvViewMode = "cards";
    state.ktvViewMode = "cards";
    loadData();
  });

  // Sự kiện chip chọn nhanh kỳ thời gian
  const setActiveChip = (range) => {
    $$(".ktv-quick-chip").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.range === range);
    });
  };

  $("#chip-this-month")?.addEventListener("click", () => {
    const { firstDayStr: f, lastDayStr: l } = getCurrentMonthRange();
    if ($("#ktv-from")) $("#ktv-from").value = f;
    if ($("#ktv-to")) $("#ktv-to").value = l;
    setActiveChip("this-month");
    loadData();
  });

  $("#chip-last-month")?.addEventListener("click", () => {
    const { firstDayStr: f, lastDayStr: l } = getPrevMonthRange();
    if ($("#ktv-from")) $("#ktv-from").value = f;
    if ($("#ktv-to")) $("#ktv-to").value = l;
    setActiveChip("last-month");
    loadData();
  });

  $("#chip-this-week")?.addEventListener("click", () => {
    const { firstDayStr: f, lastDayStr: l } = getCurrentWeekRange();
    if ($("#ktv-from")) $("#ktv-from").value = f;
    if ($("#ktv-to")) $("#ktv-to").value = l;
    setActiveChip("this-week");
    loadData();
  });

  // Sự kiện tìm kiếm & lọc
  $("#ktv-btn-search")?.addEventListener("click", () => {
    setActiveChip("");
    loadData();
  });
  $("#ktv-sort")?.addEventListener("change", loadData);
  $("#ktv-q")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setActiveChip("");
      loadData();
    }
  });

  // Đặt lại bộ lọc
  $("#ktv-btn-reset")?.addEventListener("click", () => {
    $("#ktv-from").value = firstDayStr;
    $("#ktv-to").value = lastDayStr;
    $("#ktv-sort").value = "thucte_desc";
    $("#ktv-q").value = "";
    setActiveChip("this-month");
    loadData();
  });

  await loadData();
}

// ==================== TRA CỨU KHÁCH HÀNG & CHI TIẾT CSKH ====================
async function renderCustomerSearch() {
  const el = $("#page-content");
  let selectedCustId = null;
  let selectedCustName = "";
  let selectedCustPhone = "";
  let allFoundCustomers = [];
  let csCurrentPage = 1;
  let csPageSize = 10;

  // Hàm hiển thị số điện thoại chuyên nghiệp (tách nhiều số/liên hệ thành các chip gọn gàng, tự xuống dòng, chống vỡ layout)
  const formatPhoneNumbers = (phoneStr) => {
    if (!phoneStr) return '<span class="muted">-</span>';
    let s = String(phoneStr).trim();
    if (!s) return '<span class="muted">-</span>';

    // 1. Tách các ký tự phân cách cơ bản: xuống dòng, phẩy, chấm phẩy, gạch chéo, pipe
    s = s.replace(/[\r\n,;/|]+/g, " ### ");

    // 2. Tách dấu gạch ngang giữa 2 số điện thoại dài (>= 8 chữ số mỗi bên): ví dụ 0905470253-0914666407
    s = s.replace(
      /(\d{8,12})\s*[-–—]\s*(\d{8,12})/g,
      (m, a, b) => a + " ### " + b,
    );

    // 3. Tách dấu gạch ngang giữa số điện thoại và tên liên hệ: ví dụ 0334323888-ChịQuyên
    s = s.replace(
      /(\d{8,12})\s*[-–—]\s*([^\d\s]+)/g,
      (m, a, b) => a + " ### " + b,
    );

    // 4. Tách dấu gạch ngang giữa tên liên hệ và số điện thoại: ví dụ ChịQuyên-0912893132
    s = s.replace(
      /([^\d\s\(\)]+)\s*[-–—]\s*(\d{8,12})/g,
      (m, a, b) => a + " ### " + b,
    );

    // 5. Tách dấu gạch ngang sau ngoặc đơn: ví dụ (AnhLĩnh)-nv0975979809
    s = s.replace(/\)\s*[-–—]\s*/g, ") ### ");

    const rawParts = s
      .split(" ### ")
      .map((p) => p.trim())
      .filter(Boolean);
    if (!rawParts.length) return '<span class="muted">-</span>';

    return `
      <div class="phone-chips-wrap">
        ${rawParts
          .map(
            (p) => `
          <span class="phone-chip cs-copyable-cell" data-copy-val="${esc(p)}" data-copy-label="Số điện thoại" title="Nhấp để sao chép SĐT này">
            ${esc(p)}
            <svg class="cs-copy-icon" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </span>
        `,
          )
          .join("")}
      </div>
    `;
  };

  // Loại bỏ phần trong ngoặc đơn ở loại khách hàng (ví dụ: "Nha khoa số plus (Nha khoa...)" -> "Nha khoa số plus")
  const cleanCustomerType = (typeStr) => {
    if (!typeStr) return "Khách hàng";
    let cleaned = String(typeStr)
      .replace(/\s*\([^)]*(\)|$)/g, "")
      .replace(/\s*\(.*$/g, "")
      .trim();
    if (!cleaned) {
      cleaned = String(typeStr).replace(/[()]/g, "").trim();
    }
    return cleaned || "Khách hàng";
  };

  el.innerHTML = `
    <!-- PANEL BỘ LỌC TRA CỨU THEO 4 TIÊU CHÍ (4 STORED PROCEDURES) -->
    <div class="card" id="cs-search-card">
      <div class="card-header">
        <div>
          <h3 style="font-size:17px">Tra cứu Khách hàng</h3>
          <p class="muted" style="margin:4px 0 0;font-size:12.5px">
            Nhập một hoặc nhiều thông tin: Tên khách hàng, Số điện thoại, Địa chỉ, Mã KH và bấm Tìm kiếm
          </p>
        </div>
      </div>

      <!-- BỘ LỌC 4 Ô TÌM KIẾM -->
      <div class="task-filter-panel">
        <div class="filter-field flex-grow" style="min-width:180px">
          <label for="cs-name">Tên khách hàng</label>
          <input type="text" id="cs-name" placeholder="vd: Nguyễn Văn A..." autocomplete="off" />
        </div>
        <div class="filter-field flex-grow" style="min-width:150px">
          <label for="cs-phone">Số điện thoại</label>
          <input type="text" id="cs-phone" placeholder="vd: 0912345678..." autocomplete="off" />
        </div>
        <div class="filter-field flex-grow" style="min-width:180px">
          <label for="cs-address">Địa chỉ</label>
          <input type="text" id="cs-address" placeholder="vd: Hà Nội, Quận 1..." autocomplete="off" />
        </div>
        <div class="filter-field" style="min-width:130px">
          <label for="cs-code">Mã KH</label>
          <input type="text" id="cs-code" placeholder="vd: 102, KH01..." autocomplete="off" />
        </div>
        <div class="filter-actions">
          <button class="btn btn-primary btn-sm" id="btn-cs-search">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            Tìm kiếm
          </button>
          <button class="btn btn-outline btn-sm" id="btn-cs-reset" title="Xóa trắng các ô tìm kiếm">
            Đặt lại
          </button>
        </div>
      </div>
    </div>

    <!-- DANH SÁCH KHÁCH HÀNG TÌM ĐƯỢC (BẢNG RỘNG HIỆN ĐẠI, BẤM DÒNG MỞ MODAL CSKH) -->
    <div class="card hidden" style="margin-top:16px" id="cs-result-card">
      <div class="card-header" style="flex-wrap:wrap;gap:10px;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div>
            <h3 style="font-size:16px">Danh sách Khách hàng tìm được</h3>
            <p class="muted" style="margin:2px 0 0;font-size:12px">
              Nhấp vào khách hàng để mở Chi tiết Chăm sóc Khách hàng
            </p>
          </div>
          <span class="badge badge-blue" id="cs-cust-count">0 khách hàng</span>
        </div>
        <button type="button" class="btn btn-primary btn-sm" id="btn-cs-add-customer">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Thêm khách hàng mới
        </button>
      </div>

      <div id="cs-table-wrap">
        <div style="padding:28px;text-align:center;color:var(--muted)">Đang tải danh sách khách hàng...</div>
      </div>
    </div>
  `;

  const getInitials = (name) => {
    if (!name) return "KH";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Mở modal Chi tiết Chăm sóc Khách hàng (Hero Header, Dạng thẻ Timeline chi tiết, toàn bộ nội dung hiển thị trọn vẹn)
  openCareDetailModal = async (
    idkhachhang,
    tenkhachhang,
    dienthoai,
    extraInfo = {},
  ) => {
    window.openCareDetailModal = openCareDetailModal;
    let careItems = [];

    const buildModalHtml = () => `
      <div id="care-modal-content-wrap">
        <!-- HERO PROFILE HEADER -->
        <div class="care-modal-hero">
          <div class="care-hero-top">
            <div class="care-hero-name">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:var(--primary-light);color:var(--primary);font-size:14px;font-weight:800;flex-shrink:0">
                ${getInitials(tenkhachhang)}
              </span>
              <span>${esc(tenkhachhang || "Khách hàng")}</span>
              <span class="badge badge-blue">${esc(cleanCustomerType(extraInfo.tenloaikhachhang))}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <button type="button" class="btn btn-outline btn-sm" id="btn-modal-edit-cust" title="Chỉnh sửa thông tin khách hàng">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Sửa KH
              </button>
              <button type="button" class="btn btn-outline-danger btn-sm" id="btn-modal-delete-cust" title="Xóa khách hàng khỏi hệ thống">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Xóa KH
              </button>
              <button type="button" class="btn btn-primary btn-sm" id="btn-modal-add-care" title="Ghi nhận lần chăm sóc mới">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                + Ghi nhận CS mới
              </button>
            </div>
          </div>

          <div class="care-hero-grid">
            <div class="care-hero-item">
              <span class="care-hero-lbl">Mã KH:</span>
              <span class="badge badge-blue cs-copyable-cell" data-copy-val="${esc(extraInfo.makhachhang || idkhachhang)}" data-copy-label="Mã KH" title="Nhấp để sao chép Mã KH">
                ${esc(extraInfo.makhachhang || idkhachhang)}
                <svg class="cs-copy-icon" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              </span>
            </div>
            <div class="care-hero-item">
              <span class="care-hero-lbl">SĐT:</span>
              <div style="display:inline-flex;gap:4px;flex-wrap:wrap">${formatPhoneNumbers(dienthoai)}</div>
            </div>
            ${
              extraInfo.diachi
                ? `
            <div class="care-hero-item cs-copyable-cell" data-copy-val="${esc(extraInfo.diachi)}" data-copy-label="Địa chỉ" title="Nhấp để sao chép Địa chỉ" style="max-width:100%">
              <span class="care-hero-lbl">Địa chỉ:</span>
              <span style="color:var(--text);font-weight:500;word-break:break-word">${esc(extraInfo.diachi)}</span>
              <svg class="cs-copy-icon" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </div>
            `
                : ""
            }
            <div class="care-hero-item">
              <span class="care-hero-lbl">NV phụ trách:</span>
              <strong style="color:var(--primary)">${esc(extraInfo.tennhanvien || "Chưa phân công")}</strong>
            </div>
            ${
              extraInfo.tennguoilienlac || extraInfo.dienthoainguoilienlac
                ? `
            <div class="care-hero-item">
              <span class="care-hero-lbl">Người liên hệ:</span>
              <span style="font-weight:600">${esc(extraInfo.tennguoilienlac || "")}</span>
              ${extraInfo.dienthoainguoilienlac ? ` - <span class="cs-copyable-cell" data-copy-val="${esc(extraInfo.dienthoainguoilienlac)}" data-copy-label="SĐT người liên hệ" style="font-weight:600;color:var(--primary)">${esc(extraInfo.dienthoainguoilienlac)}</span>` : ""}
            </div>
            `
                : ""
            }
            ${
              extraInfo.email
                ? `
            <div class="care-hero-item">
              <span class="care-hero-lbl">Email:</span>
              <span class="cs-copyable-cell" data-copy-val="${esc(extraInfo.email)}" data-copy-label="Email">${esc(extraInfo.email)}</span>
            </div>
            `
                : ""
            }
          </div>
        </div>

        <!-- TOOLBAR: TIÊU ĐỀ + BADGE SỐ LƯỢNG (CHỈ HIỂN THỊ DẠNG THẺ) -->
        <div class="care-view-toolbar">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:13.5px;font-weight:700;color:var(--text-heading)">Lịch sử Chăm sóc Khách hàng</span>
            <span class="badge badge-amber" id="modal-care-count-badge">Đang tải...</span>
          </div>
        </div>

        <!-- KHUNG NỘI DUNG CHĂM SÓC (DẠNG THẺ DỄ ĐỌC, KHÔNG BỊ CẮT CHỮ) -->
        <div id="care-modal-body">
          <div style="padding:32px;text-align:center;color:var(--muted)">Đang tải lịch sử chăm sóc...</div>
        </div>

        <!-- FOOTER -->
        <div style="display:flex;justify-content:flex-end;margin-top:16px;border-top:1px solid var(--border);padding-top:12px">
          <button type="button" class="btn btn-outline btn-sm" onclick="closeModal()">Đóng cửa sổ</button>
        </div>
      </div>
    `;

    openModal(
      `Chi tiết Chăm sóc: ${tenkhachhang || "Khách hàng"}`,
      buildModalHtml(),
      true,
      "modal-care-detail",
    );

    // Gắn sự kiện sao chép trong hero header
    const bindCopyHero = () => {
      $("#care-modal-content-wrap")
        ?.querySelectorAll(".cs-copyable-cell")
        .forEach((cEl) => {
          cEl.addEventListener("click", async (e) => {
            e.stopPropagation();
            const val = cEl.dataset.copyVal || cEl.textContent.trim();
            const label = cEl.dataset.copyLabel || "";
            if (val && val !== "-") {
              try {
                await copyToClipboard(val);
                toast(`Đã sao chép ${label ? label + ": " : ""}"${val}"`);
                cEl.classList.add("copied-highlight");
                setTimeout(() => cEl.classList.remove("copied-highlight"), 1000);
              } catch (err) {
                toast(`Lỗi sao chép: ${err.message}`);
              }
            }
          });
        });
    };
    bindCopyHero();

    // Nút Sửa KH
    $("#btn-modal-edit-cust")?.addEventListener("click", () => {
      openCustomerForm(idkhachhang);
    });

    // Nút Xóa KH (chạy Stored Procedure dbo.tblkhachhang_Delete)
    $("#btn-modal-delete-cust")?.addEventListener("click", async () => {
      const confirmed = await showConfirmModal({
        title: "Xác nhận xóa khách hàng",
        message: `Bạn có chắc chắn muốn xóa khách hàng <strong>${esc(tenkhachhang || idkhachhang)}</strong>?<br/><br/><span style="color:var(--danger);font-weight:600">⚠️ Chú ý:</span> Thao tác này sẽ chạy Stored Procedure <code>tblkhachhang_Delete</code> để xóa toàn bộ dữ liệu lịch hẹn, công việc và lịch sử chăm sóc của khách hàng này khỏi hệ thống.`,
        confirmText: "Xóa vĩnh viễn khách hàng",
        cancelText: "Hủy bỏ",
        isDanger: true,
      });
      if (!confirmed) return;

      try {
        const res = await api(`/api/customers/${encodeURIComponent(idkhachhang)}`, {
          method: "DELETE",
        });
        toast(res.message || "Đã xóa khách hàng thành công.");
        closeModal();

        // 1. Cập nhật và nạp lại "Danh sách Khách hàng tìm được" nếu đang ở màn hình tra cứu
        if (state.currentPage === "customer-search" || $("#cs-result-card")) {
          // Lọc bỏ ngay lập tức khách hàng đã xóa khỏi danh sách trong bộ nhớ để bảng phản hồi tức thì
          allFoundCustomers = (allFoundCustomers || []).filter(
            (kh) => String(kh.idkhachhang) !== String(idkhachhang),
          );
          if (typeof renderCustomerTable === "function") {
            renderCustomerTable();
          }

          // Nạp lại dữ liệu tìm kiếm mới nhất từ CSDL SQL Server
          if (typeof searchCustomers === "function") {
            await searchCustomers(true);
          } else if (typeof window.__reloadFoundCustomers === "function") {
            await window.__reloadFoundCustomers(idkhachhang);
          } else if (typeof window.__refreshCustomerSearch === "function") {
            window.__refreshCustomerSearch();
          }
        }

        // 2. Cập nhật lại danh sách nếu đang ở tab Khách hàng
        if (state.currentPage === "customers" && typeof renderCustomers === "function") {
          renderCustomers();
        }
      } catch (err) {
        toast(`Lỗi khi xóa khách hàng: ${err.message}`);
      }
    });

    // Nút Ghi nhận CS mới
    $("#btn-modal-add-care")?.addEventListener("click", () => {
      openAddCareModal(idkhachhang, tenkhachhang, () => {
        openCareDetailModal(idkhachhang, tenkhachhang, dienthoai, extraInfo);
      });
    });

    // Hàm tải danh sách lịch sử chăm sóc từ server
    const loadCareHistory = async () => {
      try {
        const data = await api(
          `/api/customer-search/care?idkhachhang=${encodeURIComponent(idkhachhang)}`,
        );
        careItems = data.items || [];

        const countBadge = $("#modal-care-count-badge");
        if (countBadge) {
          countBadge.textContent = `${careItems.length} lần chăm sóc`;
          countBadge.className = `badge ${careItems.length > 0 ? "badge-green" : "badge-amber"}`;
        }

        renderCareItems();
      } catch (err) {
        const bodyEl = $("#care-modal-body");
        if (bodyEl) {
          bodyEl.innerHTML = `<div class="modern-alert error">Lỗi tải lịch sử chăm sóc: ${esc(err.message)}</div>`;
        }
      }
    };

    // Hàm render danh sách chăm sóc (cards hoặc table)
    const renderCareItems = () => {
      const bodyEl = $("#care-modal-body");
      if (!bodyEl) return;

      if (!careItems.length) {
        bodyEl.innerHTML = `
          <div style="padding:40px 20px;text-align:center;background:var(--surface-subtle);border-radius:var(--radius-md);border:1px dashed var(--border)">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color:var(--muted);margin:0 auto 10px;display:block">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <div style="font-weight:700;color:var(--text);font-size:14px;margin-bottom:4px">Chưa có nhật ký chăm sóc nào</div>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">Khách hàng này chưa được ghi nhận lịch sử chăm sóc hoặc tư vấn trong hệ thống.</p>
            <button type="button" class="btn btn-primary btn-sm" id="btn-modal-empty-add-care">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              + Ghi nhận chăm sóc đầu tiên
            </button>
          </div>
        `;
        $("#btn-modal-empty-add-care")?.addEventListener("click", () => {
          openAddCareModal(idkhachhang, tenkhachhang, () => {
            openCareDetailModal(idkhachhang, tenkhachhang, dienthoai, extraInfo);
          });
        });
        return;
      }

      // Luôn luôn hiển thị dạng thẻ (Cards view) theo yêu cầu người dùng
      bodyEl.innerHTML = `
        <div class="care-cards-list">
          ${careItems
            .map(
              (c) => `
            <div class="care-item-card">
              <div class="care-card-header">
                <div class="care-card-tags">
                  <span class="care-stt-chip">#${c.stt || ""}</span>
                  ${
                    (c.idchamsockhachhang || c.idchamsoc)
                      ? `
                    <span class="badge badge-blue cs-copyable-cell" data-copy-val="${esc(c.idchamsockhachhang || c.idchamsoc)}" title="Nhấp để sao chép Mã CS: #${esc(c.idchamsockhachhang || c.idchamsoc)}">
                      Mã CS: <strong>#${esc(c.idchamsockhachhang || c.idchamsoc)}</strong>
                      <svg class="cs-copy-icon" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    </span>
                  `
                      : ""
                  }
                  <span class="care-date-badge">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="vertical-align:-1px;margin-right:3px">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    ${fmtDateOnly(c.ngaythang)}
                  </span>
                  ${
                    c.tenhinhthuc &&
                    !c.tenhinhthuc.toLowerCase().includes("điện thoại") &&
                    !c.tenhinhthuc.toLowerCase().includes("dien thoai") &&
                    c.tenhinhthuc !== "Chăm sóc"
                      ? `<span class="badge badge-blue">${esc(c.tenhinhthuc)}</span>`
                      : ""
                  }
                  ${
                    c.tendanhgiakhachhang &&
                    !c.tendanhgiakhachhang.toLowerCase().includes("tư vấn") &&
                    !c.tendanhgiakhachhang.toLowerCase().includes("tu van") &&
                    c.tendanhgiakhachhang !== "-"
                      ? `<span class="badge badge-green">${esc(c.tendanhgiakhachhang)}</span>`
                      : ""
                  }
                  ${
                    c.tentrangthai && c.tentrangthai !== "-" && c.tentrangthai.trim() !== ""
                      ? `<span class="badge badge-amber">${esc(c.tentrangthai)}</span>`
                      : ""
                  }
                  ${c.isquantam ? `<span class="badge badge-purple" title="Quan tâm sản phẩm">★ Quan tâm SP</span>` : ""}
                </div>
                <div class="care-card-staff">
                  <span>Nhân viên CS: <strong>${esc(c.tennhanvien || "-")}</strong></span>
                  <button type="button" class="btn-delete-care-item" data-id="${esc(c.idchamsockhachhang || c.idchamsoc || c.id || "")}" title="Xóa lịch sử chăm sóc này">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Xóa</span>
                  </button>
                </div>
              </div>
              <div class="care-card-content">${esc(c.noidungchamsoc || c.ghichu || "Không có nội dung")}</div>
            </div>
          `,
            )
            .join("")}
        </div>
      `;

      // Bắt sự kiện sao chép mã CS & xóa chăm sóc khách hàng bằng event delegation để luôn nhận diện chính xác
      bodyEl.onclick = async (e) => {
        // Sao chép Mã CS nếu bấm vào badge
        const copyEl = e.target.closest(".cs-copyable-cell");
        if (copyEl) {
          const val = copyEl.dataset.copyVal || copyEl.textContent.trim();
          if (val) {
            try {
              await copyToClipboard(val);
              toast(`Đã sao chép: "${val}"`);
              copyEl.classList.add("copied-highlight");
              setTimeout(() => copyEl.classList.remove("copied-highlight"), 1000);
            } catch (_) {}
          }
          return;
        }

        const btn = e.target.closest(".btn-delete-care-item");
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        const idCare = btn.dataset.id || btn.getAttribute("data-id");
        if (!idCare) {
          toast("Không tìm thấy mã lịch sử chăm sóc cần xóa.");
          return;
        }

        const confirmed = await showConfirmModal({
          title: "Xác nhận xóa sự kiện chăm sóc",
          message: `Bạn có chắc chắn muốn xóa sự kiện chăm sóc này không?<br/><br/><strong>Mã chăm sóc:</strong> <span class="badge badge-blue">#${esc(idCare)}</span><br/><br/><span style="color:var(--text-secondary)">Thao tác này sẽ chạy Stored Procedure <code>tblchamsockhachhang_Delete</code> để xóa bản ghi nhật ký chăm sóc này (không xóa thông tin khách hàng).</span>`,
          confirmText: "Xóa bản ghi chăm sóc",
          cancelText: "Hủy bỏ",
          isDanger: true,
        });
        if (!confirmed) return;

        try {
          btn.disabled = true;
          btn.style.opacity = "0.5";
          const res = await api(`/api/care/${encodeURIComponent(idCare)}`, {
            method: "DELETE",
          });
          toast(res.message || "Đã xóa lịch sử chăm sóc thành công.");
          await loadCareHistory();
        } catch (err) {
          btn.disabled = false;
          btn.style.opacity = "1";
          toast(`Lỗi khi xóa chăm sóc: ${err.message}`);
        }
      };
    };

    await loadCareHistory();
  };

  // Hàm render bảng khách hàng theo trang hiện tại (Phân trang 10 - 50 - 100 & Trang 1, 2, 3...)
  function renderCustomerTable() {
    const tableWrap = $("#cs-table-wrap");
    if (!tableWrap) return;

    const total = allFoundCustomers.length;
    if (!total) {
      tableWrap.innerHTML = `
        <div class="table-wrap">
          <table class="cs-table">
            <colgroup>
              <col class="cs-col-stt" style="width: 48px">
              <col class="cs-col-code" style="width: 95px">
              <col class="cs-col-name" style="width: 210px">
              <col class="cs-col-phone" style="width: 190px">
              <col class="cs-col-address" style="width: 270px">
              <col class="cs-col-type" style="width: 140px">
              <col class="cs-col-staff" style="width: 130px">
              <col class="cs-col-action" style="width: 110px">
            </colgroup>
            <thead>
              <tr>
                <th class="cs-col-stt" style="text-align:center">STT</th>
                <th class="cs-col-code">Mã KH</th>
                <th class="cs-col-name">Tên khách hàng</th>
                <th class="cs-col-phone">Số điện thoại</th>
                <th class="cs-col-address">Địa chỉ</th>
                <th class="cs-col-type">Loại KH</th>
                <th class="cs-col-staff">NV phụ trách</th>
                <th class="cs-col-action" style="text-align:center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="8" style="text-align:center;padding:36px 16px;color:var(--muted)">
                  <div style="font-size:14px;margin-bottom:12px;color:var(--text-secondary)">Không tìm thấy khách hàng nào khớp với thông tin tra cứu.</div>
                  <button type="button" class="btn btn-primary btn-sm" id="btn-cs-add-customer-empty">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm khách hàng mới
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      if ($("#cs-cust-count")) $("#cs-cust-count").textContent = "0 khách hàng";
      $("#btn-cs-add-customer-empty")?.addEventListener(
        "click",
        handleOpenAddCust,
      );
      return;
    }

    if ($("#cs-cust-count")) {
      $("#cs-cust-count").textContent = `${total} khách hàng`;
    }

    const totalPages = Math.max(1, Math.ceil(total / csPageSize));
    if (csCurrentPage > totalPages) csCurrentPage = totalPages;
    if (csCurrentPage < 1) csCurrentPage = 1;

    const startIdx = (csCurrentPage - 1) * csPageSize;
    const endIdx = Math.min(startIdx + csPageSize, total);
    const pageItems = allFoundCustomers.slice(startIdx, endIdx);

    // Tạo danh sách nút bấm số trang thông minh
    const generatePageButtons = () => {
      if (totalPages <= 1) return "";

      let buttonsHtml = "";
      buttonsHtml += `
        <button type="button" class="page-btn" data-page="1" ${csCurrentPage === 1 ? "disabled" : ""} title="Về trang đầu">«</button>
        <button type="button" class="page-btn" data-page="${csCurrentPage - 1}" ${csCurrentPage === 1 ? "disabled" : ""} title="Trang trước">‹</button>
      `;

      const delta = 2;
      const range = [];
      for (
        let i = Math.max(2, csCurrentPage - delta);
        i <= Math.min(totalPages - 1, csCurrentPage + delta);
        i++
      ) {
        range.push(i);
      }

      buttonsHtml += `<button type="button" class="page-btn ${csCurrentPage === 1 ? "active" : ""}" data-page="1">1</button>`;

      if (range.length > 0 && range[0] > 2) {
        buttonsHtml += `<span class="page-ellipsis">…</span>`;
      }

      range.forEach((p) => {
        buttonsHtml += `<button type="button" class="page-btn ${csCurrentPage === p ? "active" : ""}" data-page="${p}">${p}</button>`;
      });

      if (range.length > 0 && range[range.length - 1] < totalPages - 1) {
        buttonsHtml += `<span class="page-ellipsis">…</span>`;
      }

      if (totalPages > 1) {
        buttonsHtml += `<button type="button" class="page-btn ${csCurrentPage === totalPages ? "active" : ""}" data-page="${totalPages}">${totalPages}</button>`;
      }

      buttonsHtml += `
        <button type="button" class="page-btn" data-page="${csCurrentPage + 1}" ${csCurrentPage === totalPages ? "disabled" : ""} title="Trang kế tiếp">›</button>
        <button type="button" class="page-btn" data-page="${totalPages}" ${csCurrentPage === totalPages ? "disabled" : ""} title="Đến trang cuối">»</button>
      `;

      return buttonsHtml;
    };

    tableWrap.innerHTML = `
      <div class="table-wrap">
        <table class="cs-table">
          <colgroup>
            <col class="cs-col-stt" style="width: 48px">
            <col class="cs-col-code" style="width: 95px">
            <col class="cs-col-name" style="width: 210px">
            <col class="cs-col-phone" style="width: 190px">
            <col class="cs-col-address" style="width: 270px">
            <col class="cs-col-type" style="width: 140px">
            <col class="cs-col-staff" style="width: 130px">
            <col class="cs-col-action" style="width: 110px">
          </colgroup>
          <thead>
            <tr>
              <th class="cs-col-stt" style="text-align:center">STT</th>
              <th class="cs-col-code">Mã KH</th>
              <th class="cs-col-name">Tên khách hàng</th>
              <th class="cs-col-phone">Số điện thoại</th>
              <th class="cs-col-address">Địa chỉ</th>
              <th class="cs-col-type">Loại KH</th>
              <th class="cs-col-staff">NV phụ trách</th>
              <th class="cs-col-action" style="text-align:center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems
              .map((kh, idx) => {
                const overallStt = startIdx + idx + 1;
                return `
                <tr class="cust-row-selectable" 
                    data-idkhachhang="${esc(kh.idkhachhang)}" 
                    data-tenkhachhang="${esc(kh.tenkhachhang)}" 
                    data-dienthoai="${esc(kh.dienthoai)}"
                    data-makhachhang="${esc(kh.makhachhang || "")}"
                    data-diachi="${esc(kh.diachi || "")}"
                    data-tenloaikhachhang="${esc(kh.tenloaikhachhang || "")}"
                    data-tennhanvien="${esc(kh.tennhanvien || "")}"
                    data-email="${esc(kh.email || "")}"
                    data-ghichu="${esc(kh.ghichu || "")}"
                    data-tennguoilienlac="${esc(kh.tennguoilienlac || "")}"
                    data-dienthoainguoilienlac="${esc(kh.dienthoainguoilienlac || "")}"
                    data-emailnguoilienlac="${esc(kh.emailnguoilienlac || "")}"
                    title="Nhấp vào dòng để xem Chi tiết Chăm sóc Khách hàng">
                  <td class="cs-col-stt" style="text-align:center;font-weight:700;color:#94a3b8">${overallStt}</td>
                  <td class="cs-col-code">
                    <span class="badge badge-blue cs-copyable-cell" data-copy-val="${esc(kh.makhachhang || "")}" data-copy-label="Mã KH" title="Nhấp để sao chép Mã KH">
                      ${esc(kh.makhachhang || "-")}
                      ${
                        kh.makhachhang
                          ? `
                        <svg class="cs-copy-icon" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                      `
                          : ""
                      }
                    </span>
                  </td>
                  <td class="cs-col-name">
                    <div>
                      <strong class="cs-copyable-cell" data-copy-val="${esc(kh.tenkhachhang)}" data-copy-label="Tên khách hàng" title="Nhấp để sao chép Tên khách hàng" style="color:var(--text);font-size:13.5px;display:inline-flex;align-items:center;gap:4px">
                        ${esc(kh.tenkhachhang)}
                        <svg class="cs-copy-icon" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                      </strong>
                    </div>
                  </td>
                  <td class="cs-col-phone">
                    ${formatPhoneNumbers(kh.dienthoai)}
                  </td>
                  <td class="cs-col-address">
                    ${
                      kh.diachi
                        ? `
                      <div class="cs-copyable-cell cs-address-text" data-copy-val="${esc(kh.diachi)}" data-copy-label="Địa chỉ" title="Nhấp để sao chép Địa chỉ" style="font-size:12.5px;color:var(--text-secondary);line-height:1.45;word-break:break-word">
                        ${esc(kh.diachi)}
                        <svg class="cs-copy-icon" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                      </div>
                    `
                        : `<span style="color:var(--muted)">-</span>`
                    }
                  </td>
                  <td class="cs-col-type">
                    <span class="badge badge-blue" title="${esc(kh.tenloaikhachhang || "Khách hàng")}">${esc(cleanCustomerType(kh.tenloaikhachhang))}</span>
                  </td>
                  <td class="cs-col-staff" style="font-size:12.5px">${esc(kh.tennhanvien || "-")}</td>
                  <td class="cs-col-action" style="text-align:center">
                    <button type="button" class="btn btn-outline btn-sm btn-open-care-detail" title="Xem Chi tiết Chăm sóc Khách hàng">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Chi tiết
                    </button>
                  </td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>

      <!-- THANH PHÂN TRANG (10 - 50 - 100 VÀ TRANG 1, 2, 3...) -->
      <div class="cs-pagination-bar">
        <div class="cs-pagination-left">
          <div class="cs-pagesize-select-wrap">
            <label for="cs-pagesize" class="cs-pagesize-label">Hiển thị:</label>
            <select id="cs-pagesize" class="cs-pagesize-select" title="Chọn số dòng trên mỗi trang">
              <option value="10" ${csPageSize === 10 ? "selected" : ""}>10 / trang</option>
              <option value="50" ${csPageSize === 50 ? "selected" : ""}>50 / trang</option>
              <option value="100" ${csPageSize === 100 ? "selected" : ""}>100 / trang</option>
            </select>
          </div>
          <span class="cs-page-summary">
            Hiển thị <strong>${startIdx + 1}</strong> – <strong>${endIdx}</strong> trên <strong>${total}</strong> khách hàng (Trang <strong>${csCurrentPage}</strong>/<strong>${totalPages}</strong>)
          </span>
        </div>

        <div class="cs-pagination-right">
          ${generatePageButtons()}
        </div>
      </div>
    `;

    // Sự kiện sao chép dữ liệu khi bấm vào Mã KH, Tên KH, SĐT, Địa chỉ
    $$(".cs-copyable-cell").forEach((el) => {
      el.addEventListener("click", async (e) => {
        e.stopPropagation();
        const val = el.dataset.copyVal || el.textContent.trim();
        const label = el.dataset.copyLabel || "";
        if (val && val !== "-") {
          try {
            await copyToClipboard(val);
            toast(`Đã sao chép ${label ? label + ": " : ""}"${val}"`);
            el.classList.add("copied-highlight");
            setTimeout(() => el.classList.remove("copied-highlight"), 1000);
          } catch (err) {
            toast(`Lỗi sao chép: ${err.message}`);
          }
        }
      });
    });

    // Mở modal khi bấm vào dòng khách hàng hoặc nút Chi tiết
    const triggerCareModalForTr = (tr) => {
      if (!tr) return;
      openCareDetailModal(
        tr.dataset.idkhachhang,
        tr.dataset.tenkhachhang,
        tr.dataset.dienthoai,
        {
          makhachhang: tr.dataset.makhachhang,
          diachi: tr.dataset.diachi,
          tenloaikhachhang: tr.dataset.tenloaikhachhang,
          tennhanvien: tr.dataset.tennhanvien,
          email: tr.dataset.email,
          ghichu: tr.dataset.ghichu,
          tennguoilienlac: tr.dataset.tennguoilienlac,
          dienthoainguoilienlac: tr.dataset.dienthoainguoilienlac,
          emailnguoilienlac: tr.dataset.emailnguoilienlac,
        },
      );
    };

    $$(".cust-row-selectable").forEach((tr) => {
      tr.addEventListener("click", (e) => {
        if (e.target.closest(".cs-copyable-cell")) return;
        triggerCareModalForTr(tr);
      });
    });

    $$(".btn-open-care-detail").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const tr = btn.closest("tr");
        triggerCareModalForTr(tr);
      });
    });

    // Thay đổi số dòng trên trang (10 - 50 - 100)
    $("#cs-pagesize")?.addEventListener("change", (e) => {
      csPageSize = parseInt(e.target.value, 10) || 10;
      csCurrentPage = 1;
      renderCustomerTable();
    });

    // Bấm nút chuyển trang
    $$(".cs-pagination-right .page-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetPage = parseInt(btn.dataset.page, 10);
        if (
          targetPage &&
          targetPage !== csCurrentPage &&
          targetPage >= 1 &&
          targetPage <= totalPages
        ) {
          csCurrentPage = targetPage;
          renderCustomerTable();
          $("#cs-result-card")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    });
  };

  // Tìm kiếm khách hàng theo các tiêu chí đã nhập (hoặc nạp lại danh sách khi xóa/thêm/sửa)
  async function searchCustomers(isReload = false) {
    const tenkhachhang = $("#cs-name")?.value?.trim() || "";
    const dienthoai = $("#cs-phone")?.value?.trim() || "";
    const diachi = $("#cs-address")?.value?.trim() || "";
    const makhachhang = $("#cs-code")?.value?.trim() || "";

    if (!isReload && !tenkhachhang && !dienthoai && !diachi && !makhachhang) {
      toast(
        "Vui lòng nhập ít nhất một thông tin để tra cứu (Tên, SĐT, Địa chỉ hoặc Mã KH).",
      );
      return;
    }

    const qs = new URLSearchParams();
    if (tenkhachhang) qs.set("tenkhachhang", tenkhachhang);
    if (dienthoai) qs.set("dienthoai", dienthoai);
    if (diachi) qs.set("diachi", diachi);
    if (makhachhang) qs.set("makhachhang", makhachhang);

    // Mở khung danh sách khách hàng tìm được
    $("#cs-result-card")?.classList.remove("hidden");
    selectedCustId = null;

    if (!isReload || !allFoundCustomers.length) {
      $("#cs-table-wrap").innerHTML = `
        <div style="padding:28px;text-align:center;color:var(--muted)">
          Đang tra cứu dữ liệu khách hàng từ SQL Server...
        </div>
      `;
    }

    try {
      const data = await api(`/api/customer-search?${qs.toString()}`);
      allFoundCustomers = data.items || [];
      if (!isReload) {
        csCurrentPage = 1;
      }
      renderCustomerTable();
    } catch (err) {
      $("#cs-table-wrap").innerHTML =
        `<div class="modern-alert error">Lỗi tra cứu khách hàng: ${esc(err.message)}</div>`;
    }
  }

  // Bắt sự kiện bấm nút Tìm kiếm
  $("#btn-cs-search")?.addEventListener("click", () => searchCustomers(false));

  // Phím Enter trên các ô tìm kiếm
  ["#cs-name", "#cs-phone", "#cs-address", "#cs-code"].forEach((sel) => {
    $(sel)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        searchCustomers(false);
      }
    });
  });

  // Bắt sự kiện bấm nút Đặt lại: xóa trắng các ô và ẩn lại danh sách
  $("#btn-cs-reset")?.addEventListener("click", () => {
    if ($("#cs-name")) $("#cs-name").value = "";
    if ($("#cs-phone")) $("#cs-phone").value = "";
    if ($("#cs-address")) $("#cs-address").value = "";
    if ($("#cs-code")) $("#cs-code").value = "";
    selectedCustId = null;
    allFoundCustomers = [];
    csCurrentPage = 1;
    $("#cs-result-card")?.classList.add("hidden");
  });

  // Mở modal thêm khách hàng mới (tự điền các thông tin đã gõ ở ô tra cứu nếu có)
  const handleOpenAddCust = () => {
    const initData = {
      tenkhachhang: $("#cs-name")?.value?.trim() || "",
      dienthoai: $("#cs-phone")?.value?.trim() || "",
      diachi: $("#cs-address")?.value?.trim() || "",
    };
    openCustomerForm(null, initData);
  };

  // Nút thêm khách hàng mới bên dưới danh sách tìm được
  $("#btn-cs-add-customer")?.addEventListener("click", handleOpenAddCust);

  // Hook nạp lại danh sách khách hàng tìm được khi có khách hàng bị xóa
  window.__reloadFoundCustomers = async (deletedId = null) => {
    if (deletedId) {
      allFoundCustomers = (allFoundCustomers || []).filter(
        (kh) => String(kh.idkhachhang) !== String(deletedId)
      );
      renderCustomerTable();
    }
    await searchCustomers(true);
  };

  // Tự động làm mới kết quả tra cứu và tự chọn khách hàng mới thêm
  window.__refreshCustomerSearch = (payload) => {
    if (payload) {
      if (payload.tenkhachhang && $("#cs-name"))
        $("#cs-name").value = payload.tenkhachhang;
      if (payload.dienthoai && $("#cs-phone"))
        $("#cs-phone").value = payload.dienthoai;
      if (payload.diachi && $("#cs-address"))
        $("#cs-address").value = payload.diachi;
    }
    searchCustomers(true);
  };
}

// ==================== THỐNG KÊ SP BÁN RA & DOANH SỐ ====================
async function renderSalesStats() {
  const el = $("#page-content");
  const { firstDayStr, lastDayStr } = getCurrentMonthRange();

  let activeFilter = null; // { type: 'product' | 'staff', id: string, name: string }
  let cachedProdData = null;
  let cachedStaffData = null;
  let cachedDetailItems = [];

  const getRankBadge = (idx) => {
    if (idx === 0)
      return '<span class="sales-rank-badge top-1" title="Top 1">🥇</span>';
    if (idx === 1)
      return '<span class="sales-rank-badge top-2" title="Top 2">🥈</span>';
    if (idx === 2)
      return '<span class="sales-rank-badge top-3" title="Top 3">🥉</span>';
    return `<span class="sales-rank-badge normal">${idx + 1}</span>`;
  };

  el.innerHTML = `
    <!-- BỘ LỌC TỪ NGÀY ĐẾN NGÀY -->
    <div class="card">
      <div class="card-header" style="flex-wrap:wrap;gap:12px">
        <div>
          <h3 style="font-size:17px">Thống Kê Sản Phẩm Bán Ra & Doanh Số</h3>
          <p class="muted" style="margin:4px 0 0;font-size:12.5px">
            Thống kê chi tiết sản phẩm dịch vụ đã bán và doanh số theo từng nhân viên
          </p>
        </div>
      </div>

      <div class="task-filter-panel">
        <div class="filter-field field-date">
          <label for="sales-from">Từ ngày</label>
          <input type="date" id="sales-from" value="${firstDayStr}" />
        </div>
        <div class="filter-field field-date">
          <label for="sales-to">Đến ngày</label>
          <input type="date" id="sales-to" value="${lastDayStr}" />
        </div>
        <div class="filter-actions">
          <button class="btn btn-primary btn-sm" id="btn-sales-filter">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
            </svg>
            Lọc dữ liệu
          </button>
          <button class="btn btn-outline btn-sm" id="btn-sales-reset" title="Đặt lại khoảng ngày về đầu tháng - cuối tháng">
            Đặt lại
          </button>
        </div>
      </div>
    </div>

    <!-- 4 THẺ KPI TỔNG HỢP NHANH -->
    <div class="sales-kpi-grid" id="sales-kpi-container">
      <div class="sales-kpi-card">
        <div class="sales-kpi-icon blue">💰</div>
        <div class="sales-kpi-info">
          <span class="sales-kpi-title">Doanh thu sản phẩm</span>
          <span class="sales-kpi-num nowrap-money" id="kpi-prod-total">Đang tính...</span>
          <span class="sales-kpi-sub" id="kpi-prod-count">0 loại sản phẩm</span>
        </div>
      </div>

      <div class="sales-kpi-card">
        <div class="sales-kpi-icon green">👥</div>
        <div class="sales-kpi-info">
          <span class="sales-kpi-title">Doanh số nhân viên</span>
          <span class="sales-kpi-num nowrap-money" id="kpi-staff-total">Đang tính...</span>
          <span class="sales-kpi-sub" id="kpi-staff-count">0 nhân viên có doanh số</span>
        </div>
      </div>

      <div class="sales-kpi-card">
        <div class="sales-kpi-icon amber">🏆</div>
        <div class="sales-kpi-info">
          <span class="sales-kpi-title">Sản phẩm bán chạy nhất</span>
          <span class="sales-kpi-num" id="kpi-top-prod" style="font-size:15px;font-weight:700">---</span>
          <span class="sales-kpi-sub" id="kpi-top-prod-sub">Chưa có dữ liệu</span>
        </div>
      </div>

      <div class="sales-kpi-card">
        <div class="sales-kpi-icon purple">⭐</div>
        <div class="sales-kpi-info">
          <span class="sales-kpi-title">Nhân viên dẫn đầu</span>
          <span class="sales-kpi-num" id="kpi-top-staff" style="font-size:15px;font-weight:700">---</span>
          <span class="sales-kpi-sub" id="kpi-top-staff-sub">Chưa có dữ liệu</span>
        </div>
      </div>
    </div>

    <!-- 2 BẢNG TỔNG HỢP: SẢN PHẨM (~10 LOẠI) & NHÂN VIÊN (NHIỀU NV) -->
    <div class="sales-overview-grid">
      <!-- BẢNG 1: SẢN PHẨM / DỊCH VỤ ĐÃ BÁN RA (SP: tblkhoanthu_ThongKeSanPhamBanRa) -->
      <div class="card">
        <div class="card-header" style="flex-wrap:wrap;gap:8px">
          <div>
            <h4 style="font-size:15px;margin:0;display:flex;align-items:center;gap:6px">
              <span>🛍️</span> Sản phẩm / Dịch vụ đã bán
            </h4>
            <p class="muted" style="margin:2px 0 0;font-size:11.5px">
              Nhấp vào sản phẩm để xem danh sách khách hàng đã mua
            </p>
          </div>
          <span class="badge badge-blue" id="badge-prod-summary">Đang tải...</span>
        </div>
        <div id="table-products-wrap">
          <div style="padding:24px;text-align:center;color:var(--muted)">Đang tải thống kê sản phẩm...</div>
        </div>
      </div>

      <!-- BẢNG 2: DOANH SỐ THEO TỪNG NHÂN VIÊN (SP: tblnhanvien_SelectByDate_DoanhSoHienTai) -->
      <div class="card">
        <div class="card-header" style="flex-wrap:wrap;gap:8px;justify-content:space-between">
          <div>
            <h4 style="font-size:15px;margin:0;display:flex;align-items:center;gap:6px">
              <span>👤</span> Doanh số theo Nhân viên
            </h4>
            <p class="muted" style="margin:2px 0 0;font-size:11.5px">
              Nhấp vào nhân viên để xem danh sách khách hàng đã bán
            </p>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <div class="sales-quick-search">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
              </svg>
              <input type="text" id="staff-search-input" placeholder="Tìm nhanh nhân viên..." />
            </div>
            <span class="badge badge-green" id="badge-staff-summary">Đang tải...</span>
          </div>
        </div>
        <div id="table-staff-wrap">
          <div style="padding:24px;text-align:center;color:var(--muted)">Đang tải doanh số nhân viên...</div>
        </div>
      </div>
    </div>

    <!-- BẢNG 3: CHI TIẾT KHÁCH HÀNG SẢN PHẨM ĐÃ BÁN (THEO SP HOẶC THEO NV) -->
    <div class="card" style="margin-top:16px" id="sales-detail-card">
      <div class="card-header" style="flex-wrap:wrap;gap:12px;justify-content:space-between">
        <div>
          <h3 style="font-size:16px;display:flex;align-items:center;gap:8px;margin:0">
            <span>📋</span> Chi tiết Khách hàng: <span id="sales-detail-title" style="color:var(--primary);font-weight:700">Chưa chọn mục nào</span>
          </h3>
          <p class="muted" style="margin:3px 0 0;font-size:12px" id="sales-detail-subtitle">
            Tích chọn sản phẩm dịch vụ hoặc nhân viên ở bảng trên để xem chi tiết
          </p>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <div class="sales-quick-search" id="detail-search-box" style="display:none">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
            </svg>
            <input type="text" id="cust-detail-search-input" placeholder="Lọc khách hàng, địa chỉ..." />
          </div>
          <span class="badge badge-amber" id="sales-detail-count-badge">0 khách hàng</span>
        </div>
      </div>

      <div id="sales-detail-wrap">
        <div style="padding:36px;text-align:center;color:var(--muted)">
          👉 Nhấp vào một <strong>Sản phẩm / Dịch vụ</strong> hoặc <strong>Nhân viên</strong> ở bảng trên để xem danh sách chi tiết khách hàng và tổng tiền.
        </div>
      </div>
    </div>
  `;

  // Hàm render bảng chi tiết khách hàng từ danh sách mảng (hỗ trợ lọc nhanh)
  const renderDetailTable = (items, totalSotien) => {
    const wrap = $("#sales-detail-wrap");
    if (!wrap) return;

    if ($("#sales-detail-count-badge")) {
      $("#sales-detail-count-badge").textContent = `${items.length} khách hàng`;
      $("#sales-detail-count-badge").className =
        `badge ${items.length > 0 ? "badge-green" : "badge-amber"}`;
    }

    wrap.innerHTML = `
      <div class="table-wrap sales-custom-scroll" style="max-height:450px">
        <table>
          <thead>
            <tr>
              <th style="width:55px;text-align:center">STT</th>
              <th style="min-width:240px">Tên khách hàng</th>
              <th style="min-width:300px">Địa chỉ</th>
              <th style="width:170px;text-align:right">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            ${
              items.length
                ? items
                    .map(
                      (c, idx) => `
              <tr>
                <td style="text-align:center;font-weight:700;color:#94a3b8">${c.stt || idx + 1}</td>
                <td>
                  <strong style="color:var(--text);font-size:14px;letter-spacing:-0.2px">${esc(c.tenkhachhang)}</strong>
                </td>
                <td>
                  <span style="color:var(--text-secondary);font-size:12.5px;line-height:1.4">${esc(c.diachi || "-")}</span>
                </td>
                <td class="nowrap-money" style="text-align:right;font-weight:700;color:#34d399;font-size:14.5px">
                  ${fmtMoney(c.sotien)}
                </td>
              </tr>
            `,
                    )
                    .join("")
                : `
              <tr>
                <td colspan="4" style="text-align:center;padding:36px;color:var(--muted)">
                  Không tìm thấy khách hàng nào phù hợp.
                </td>
              </tr>
            `
            }
          </tbody>
        </table>
      </div>

      <!-- BÊN DƯỚI DANH SÁCH CÓ TỔNG TIỀN -->
      <div class="sales-total-footer">
        <span style="color:var(--muted)">
          Tổng số: <strong style="color:var(--text)">${items.length}</strong> khách hàng
        </span>
        <div class="sales-total-box">
          <span style="color:#94a3b8;font-weight:600;font-size:13px;letter-spacing:0.5px">TỔNG TIỀN:</span>
          <strong class="nowrap-money" style="font-size:18px;color:#34d399;letter-spacing:-0.3px">
            ${fmtMoney(totalSotien)}
          </strong>
        </div>
      </div>
    `;
  };

  // Hàm tải chi tiết khách hàng theo điều kiện đang chọn
  const loadDetail = async (type, id, name) => {
    activeFilter = { type, id, name };
    const from = $("#sales-from")?.value || firstDayStr;
    const to = $("#sales-to")?.value || lastDayStr;

    // Cập nhật tiêu đề khung chi tiết
    if ($("#sales-detail-title")) {
      $("#sales-detail-title").textContent =
        type === "product" ? `Sản phẩm: ${name}` : `Nhân viên: ${name}`;
    }
    if ($("#sales-detail-subtitle")) {
      $("#sales-detail-subtitle").textContent =
        `Thời gian từ ${fmtDateOnly(from)} đến ${fmtDateOnly(to)}`;
    }

    // Hiển thị ô tìm kiếm chi tiết
    if ($("#detail-search-box")) {
      $("#detail-search-box").style.display = "block";
      const searchInput = $("#cust-detail-search-input");
      if (searchInput) searchInput.value = "";
    }

    // Cập nhật highlight cho dòng được chọn và bỏ chọn dòng khác
    $$(".sales-row-clickable").forEach((tr) => {
      const match =
        (type === "product" && tr.dataset.productId === id) ||
        (type === "staff" && tr.dataset.staffId === id);
      tr.classList.toggle("row-selected", match);
    });

    $("#sales-detail-wrap").innerHTML = `
      <div style="padding:28px;text-align:center;color:var(--muted)">
        Đang tải danh sách chi tiết khách hàng...
      </div>
    `;

    try {
      const url =
        type === "product"
          ? `/api/sales-stats/detail-by-product?from=${from}&to=${to}&idloaikhachhang=${encodeURIComponent(id)}`
          : `/api/sales-stats/detail-by-staff?from=${from}&to=${to}&idnhanvien=${encodeURIComponent(id)}`;

      const data = await api(url);
      cachedDetailItems = data.items || [];
      const totalSotien = Number(data.totalSotien || 0);

      renderDetailTable(cachedDetailItems, totalSotien);

      // Lắng nghe tìm kiếm nhanh khách hàng
      $("#cust-detail-search-input")?.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (!query) {
          renderDetailTable(cachedDetailItems, totalSotien);
          return;
        }
        const filtered = cachedDetailItems.filter(
          (c) =>
            (c.tenkhachhang && c.tenkhachhang.toLowerCase().includes(query)) ||
            (c.diachi && c.diachi.toLowerCase().includes(query)),
        );
        const filteredTotal = filtered.reduce(
          (sum, x) => sum + (x.sotien || 0),
          0,
        );
        renderDetailTable(filtered, filteredTotal);
      });

      // Tự động cuộn mượt nhẹ xuống bảng chi tiết nếu cần
      const detailCard = $("#sales-detail-card");
      if (detailCard && window.innerWidth <= 1024) {
        detailCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } catch (err) {
      $("#sales-detail-wrap").innerHTML =
        `<div class="modern-alert error">Lỗi tải chi tiết: ${esc(err.message)}</div>`;
    }
  };

  // Hàm render bảng nhân viên với bộ lọc tìm kiếm
  const renderStaffTable = (staffItems, totalDoanhso, filterQuery = "") => {
    const container = $("#table-staff-wrap");
    if (!container) return;

    let items = staffItems;
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      items = staffItems.filter(
        (nv) => nv.hoten && nv.hoten.toLowerCase().includes(q),
      );
    }

    if ($("#badge-staff-summary")) {
      $("#badge-staff-summary").textContent =
        `${items.length}/${staffItems.length} NV | ${fmtMoney(totalDoanhso)}`;
    }

    container.innerHTML = `
      <div class="table-wrap sales-custom-scroll" style="max-height:460px">
        <table>
          <thead>
            <tr>
              <th style="width:50px;text-align:center">Hạng</th>
              <th style="min-width:210px">Nhân viên</th>
              <th style="width:160px;text-align:right">Doanh số</th>
            </tr>
          </thead>
          <tbody>
            ${
              items.length
                ? items
                    .map((nv) => {
                      const isSelected =
                        activeFilter &&
                        activeFilter.type === "staff" &&
                        activeFilter.id === nv.idnhanvien;
                      const originalIdx = staffItems.findIndex(
                        (x) => x.idnhanvien === nv.idnhanvien,
                      );
                      const rankBadge = getRankBadge(
                        originalIdx >= 0 ? originalIdx : 0,
                      );
                      const pct =
                        totalDoanhso > 0
                          ? Math.min(
                              100,
                              Math.round((nv.doanhso / totalDoanhso) * 100),
                            )
                          : 0;

                      return `
                <tr class="sales-row-clickable ${isSelected ? "row-selected" : ""}" data-staff-id="${esc(nv.idnhanvien)}" data-staff-name="${esc(nv.hoten)}">
                  <td style="text-align:center">${rankBadge}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="user-avatar-modern" style="width:32px;height:32px;font-size:12px;font-weight:700">
                        ${esc((nv.hoten || "NV").slice(0, 2).toUpperCase())}
                      </div>
                      <div style="flex:1;min-width:0">
                        <strong style="color:var(--text);font-size:13.5px;display:block">${esc(nv.hoten)}</strong>
                        <div style="display:flex;align-items:center;gap:6px">
                          <div class="sales-progress-bar" style="flex:1">
                            <div class="sales-progress-fill staff" style="width:${pct}%"></div>
                          </div>
                          <span style="font-size:11px;color:#94a3b8;font-weight:600">${pct}%</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="nowrap-money" style="text-align:right;font-weight:700;color:#34d399;font-size:14px">
                    ${fmtMoney(nv.doanhso)}
                  </td>
                </tr>
              `;
                    })
                    .join("")
                : `
              <tr>
                <td colspan="3" style="text-align:center;padding:28px;color:var(--muted)">
                  ${filterQuery ? "Không tìm thấy nhân viên nào phù hợp." : "Không có doanh số nhân viên nào trong khoảng ngày này."}
                </td>
              </tr>
            `
            }
          </tbody>
        </table>
      </div>
    `;

    // Gắn sự kiện click từng dòng nhân viên
    $$("#table-staff-wrap [data-staff-id]").forEach((tr) => {
      tr.addEventListener("click", () => {
        loadDetail("staff", tr.dataset.staffId, tr.dataset.staffName);
      });
    });
  };

  // Hàm tải tổng quan 2 bảng: Sản phẩm bán ra & Doanh số theo nhân viên
  const loadOverview = async () => {
    const from = $("#sales-from")?.value || firstDayStr;
    const to = $("#sales-to")?.value || lastDayStr;

    $("#table-products-wrap").innerHTML =
      `<div style="padding:24px;text-align:center;color:var(--muted)">Đang tải sản phẩm...</div>`;
    $("#table-staff-wrap").innerHTML =
      `<div style="padding:24px;text-align:center;color:var(--muted)">Đang tải doanh số...</div>`;

    try {
      const [prodData, staffData] = await Promise.all([
        api(`/api/sales-stats/products?from=${from}&to=${to}`),
        api(`/api/sales-stats/staff?from=${from}&to=${to}`),
      ]);

      cachedProdData = prodData;
      cachedStaffData = staffData;

      const prodItems = prodData.items || [];
      const staffItems = staffData.items || [];

      // Cập nhật 4 thẻ KPI Dashboard
      if ($("#kpi-prod-total"))
        $("#kpi-prod-total").textContent = fmtMoney(prodData.totalSotien || 0);
      if ($("#kpi-prod-count"))
        $("#kpi-prod-count").textContent =
          `${prodItems.length} loại sản phẩm/gói DV`;

      if ($("#kpi-staff-total"))
        $("#kpi-staff-total").textContent = fmtMoney(
          staffData.totalDoanhso || 0,
        );
      if ($("#kpi-staff-count"))
        $("#kpi-staff-count").textContent =
          `${staffItems.length} nhân viên có doanh số`;

      if (prodItems.length > 0) {
        if ($("#kpi-top-prod"))
          $("#kpi-top-prod").textContent = prodItems[0].tenloaikhachhang;
        if ($("#kpi-top-prod-sub"))
          $("#kpi-top-prod-sub").textContent =
            `${prodItems[0].soluong} lượt | ${fmtMoney(prodItems[0].sotien)}`;
      } else {
        if ($("#kpi-top-prod")) $("#kpi-top-prod").textContent = "Chưa có";
        if ($("#kpi-top-prod-sub"))
          $("#kpi-top-prod-sub").textContent = "0 lượt bán";
      }

      if (staffItems.length > 0) {
        if ($("#kpi-top-staff"))
          $("#kpi-top-staff").textContent = staffItems[0].hoten;
        if ($("#kpi-top-staff-sub"))
          $("#kpi-top-staff-sub").textContent = fmtMoney(staffItems[0].doanhso);
      } else {
        if ($("#kpi-top-staff")) $("#kpi-top-staff").textContent = "Chưa có";
        if ($("#kpi-top-staff-sub"))
          $("#kpi-top-staff-sub").textContent = "0 đ";
      }

      // 1. Cập nhật bảng Sản phẩm / Dịch vụ (~10 sản phẩm, gọn gàng, hiển thị trọn vẹn)
      if ($("#badge-prod-summary")) {
        $("#badge-prod-summary").textContent =
          `${prodItems.length} loại | ${fmtMoney(prodData.totalSotien || 0)}`;
      }

      $("#table-products-wrap").innerHTML = `
        <div class="table-wrap sales-custom-scroll" style="max-height:460px">
          <table>
            <thead>
              <tr>
                <th style="width:50px;text-align:center">Hạng</th>
                <th style="min-width:180px">Sản phẩm / Gói DV</th>
                <th style="width:85px;text-align:center">Số lượng</th>
                <th style="width:140px;text-align:right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${
                prodItems.length
                  ? prodItems
                      .map((p, idx) => {
                        const isSelected =
                          activeFilter &&
                          activeFilter.type === "product" &&
                          activeFilter.id === p.idloaikhachhang;
                        const rankBadge = getRankBadge(idx);
                        const pct =
                          (prodData.totalSotien || 0) > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (p.sotien / prodData.totalSotien) * 100,
                                ),
                              )
                            : 0;

                        return `
                  <tr class="sales-row-clickable ${isSelected ? "row-selected" : ""}" data-product-id="${esc(p.idloaikhachhang)}" data-product-name="${esc(p.tenloaikhachhang)}">
                    <td style="text-align:center">${rankBadge}</td>
                    <td>
                      <strong style="color:var(--text);font-size:13.5px;display:block">${esc(p.tenloaikhachhang)}</strong>
                      <div style="display:flex;align-items:center;gap:6px">
                        <div class="sales-progress-bar" style="flex:1">
                          <div class="sales-progress-fill prod" style="width:${pct}%"></div>
                        </div>
                        <span style="font-size:11px;color:#94a3b8;font-weight:600">${pct}%</span>
                      </div>
                    </td>
                    <td style="text-align:center">
                      <span class="badge badge-blue" style="font-weight:700;font-size:12px">${p.soluong}</span>
                    </td>
                    <td class="nowrap-money" style="text-align:right;font-weight:700;color:#fbbf24;font-size:14px">
                      ${fmtMoney(p.sotien)}
                    </td>
                  </tr>
                `;
                      })
                      .join("")
                  : `
                <tr>
                  <td colspan="4" style="text-align:center;padding:28px;color:var(--muted)">
                    Không có sản phẩm nào bán ra trong khoảng ngày này.
                  </td>
                </tr>
              `
              }
            </tbody>
          </table>
        </div>
      `;

      // Gắn sự kiện click dòng sản phẩm
      $$("#table-products-wrap [data-product-id]").forEach((tr) => {
        tr.addEventListener("click", () => {
          loadDetail("product", tr.dataset.productId, tr.dataset.productName);
        });
      });

      // 2. Cập nhật bảng Doanh số theo Nhân viên (nhiều nhân viên)
      renderStaffTable(staffItems, staffData.totalDoanhso || 0);

      // Lắng nghe tìm kiếm nhanh nhân viên
      $("#staff-search-input")?.addEventListener("input", (e) => {
        renderStaffTable(
          staffItems,
          staffData.totalDoanhso || 0,
          e.target.value.trim(),
        );
      });

      // Nếu đang có mục chọn trước đó, tải lại chi tiết với khoảng ngày mới
      if (activeFilter) {
        loadDetail(activeFilter.type, activeFilter.id, activeFilter.name);
      }
    } catch (err) {
      $("#table-products-wrap").innerHTML =
        `<div class="modern-alert error">Lỗi tải sản phẩm: ${esc(err.message)}</div>`;
      $("#table-staff-wrap").innerHTML =
        `<div class="modern-alert error">Lỗi tải doanh số: ${esc(err.message)}</div>`;
    }
  };

  // Bắt sự kiện lọc dữ liệu
  $("#btn-sales-filter")?.addEventListener("click", loadOverview);

  // Bắt sự kiện đặt lại
  $("#btn-sales-reset")?.addEventListener("click", () => {
    $("#sales-from").value = firstDayStr;
    $("#sales-to").value = lastDayStr;
    loadOverview();
  });

  // Tự động tải lần đầu
  await loadOverview();
}

// ==================== FINANCE ====================

// ==================== FINANCE ====================
async function renderFinance() {
  const el = $("#page-content");
  const [sum, receipts, expenses] = await Promise.all([
    api("/api/finance/summary"),
    api("/api/finance/receipts"),
    api("/api/finance/expenses"),
  ]);

  el.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Tổng thu tháng này</div><div class="kpi-value" style="color:var(--success)">${fmtMoney(sum.tongThu)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Tổng chi tháng này</div><div class="kpi-value" style="color:var(--danger)">${fmtMoney(sum.tongChi)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Chênh lệch</div><div class="kpi-value" style="color:var(--primary)">${fmtMoney(sum.chenhLech)}</div></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Phiếu Thu gần đây</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-receipt">+ Lập phiếu thu</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ngày thu</th><th>Nội dung</th><th>Người nộp / KH</th><th>Số tiền</th><th>NV Thu</th></tr></thead>
          <tbody>
            ${
              receipts.length
                ? receipts
                    .slice(0, 30)
                    .map(
                      (r) => `
              <tr><td>${fmtDate(r.thoigianthu)}</td><td>${esc(r.noidung)}</td><td>${esc(r.tenkhachhang || r.nguoinop)}</td><td><strong>${fmtMoney(r.sotien)}</strong></td><td>${esc(r.tennhanvienthu)}</td></tr>
            `,
                    )
                    .join("")
                : '<tr><td colspan="5" class="muted">Chưa có phiếu thu.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Phiếu Chi gần đây</h3>
        <button class="btn btn-outline btn-sm" id="btn-add-expense">+ Lập phiếu chi</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ngày chi</th><th>Nội dung</th><th>Người nhận</th><th>Số tiền</th><th>NV Chi</th></tr></thead>
          <tbody>
            ${
              expenses.length
                ? expenses
                    .slice(0, 30)
                    .map(
                      (c) => `
              <tr><td>${fmtDate(c.thoigianchi)}</td><td>${esc(c.noidung)}</td><td>${esc(c.nguoinhan)}</td><td><strong>${fmtMoney(c.sotien)}</strong></td><td>${esc(c.tennhanvienchi)}</td></tr>
            `,
                    )
                    .join("")
                : '<tr><td colspan="5" class="muted">Chưa có phiếu chi.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  $("#btn-add-receipt").addEventListener("click", () => {
    openModal(
      "Lập Phiếu Thu",
      `
      <form id="rec-form" class="form-stack">
        <div class="form-grid">
          <div class="form-group"><label>Loại khoản thu</label><select name="idloaikhoanthu"><option value="">-- Chọn --</option>${optList(state.catalogs.loaiKhoanThu, "idloaikhoanthu", "tenkhoanthu")}</select></div>
          <div class="form-group"><label>Số tiền *</label><input type="number" name="sotien" required /></div>
          <div class="form-group"><label>Người nộp</label><input name="nguoinop" /></div>
          <div class="form-group"><label>NV Thu</label><select name="idnhanvienthu">${optList(state.catalogs.nhanVien, "idnhanvien", "hoten", state.user.idnhanvien)}</select></div>
        </div>
        <div class="form-group"><label>Nội dung thu</label><textarea name="noidung" rows="2"></textarea></div>
        <button type="submit" class="btn btn-primary">Lưu phiếu thu</button>
      </form>
    `,
    );
    $("#rec-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      await api("/api/finance/receipts", {
        method: "POST",
        body: JSON.stringify(
          Object.fromEntries(new FormData(e.target).entries()),
        ),
      });
      toast("Đã lưu phiếu thu");
      closeModal();
      renderFinance();
    });
  });

  $("#btn-add-expense").addEventListener("click", () => {
    openModal(
      "Lập Phiếu Chi",
      `
      <form id="exp-form" class="form-stack">
        <div class="form-grid">
          <div class="form-group"><label>Loại khoản chi</label><select name="idloaikhoanchi"><option value="">-- Chọn --</option>${optList(state.catalogs.loaiKhoanChi, "idloaikhoanchi", "tenkhoanchi")}</select></div>
          <div class="form-group"><label>Số tiền *</label><input type="number" name="sotien" required /></div>
          <div class="form-group"><label>Người nhận</label><input name="nguoinhan" /></div>
          <div class="form-group"><label>NV Chi</label><select name="idnhanvienchi">${optList(state.catalogs.nhanVien, "idnhanvien", "hoten", state.user.idnhanvien)}</select></div>
        </div>
        <div class="form-group"><label>Nội dung chi</label><textarea name="noidung" rows="2"></textarea></div>
        <button type="submit" class="btn btn-primary">Lưu phiếu chi</button>
      </form>
    `,
    );
    $("#exp-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      await api("/api/finance/expenses", {
        method: "POST",
        body: JSON.stringify(
          Object.fromEntries(new FormData(e.target).entries()),
        ),
      });
      toast("Đã lưu phiếu chi");
      closeModal();
      renderFinance();
    });
  });
}

// ==================== STAFF & SYSTEM ====================
async function renderStaff() {
  const el = $("#page-content");
  const [staff, logs] = await Promise.all([
    api("/api/staff"),
    api("/api/staff/login-history"),
  ]);
  el.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Danh sách Nhân viên (tblnhanvien)</h3></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Mã NV</th><th>Họ tên</th><th>Tài khoản</th><th>Bộ phận</th><th>SĐT</th><th>Trạng thái</th></tr></thead>
          <tbody>
            ${staff
              .map(
                (s) => `
              <tr>
                <td>${esc(s.idnhanvien)}</td>
                <td><strong>${esc(s.hoten)}</strong></td>
                <td>${esc(s.tendangnhap)}</td>
                <td>${esc(s.tenbophan || "-")}</td>
                <td>${esc(s.dienthoai || "-")}</td>
                <td><span class="badge ${s.issudung ? "badge-green" : "badge-red"}">${s.issudung ? "Đang hoạt động" : "Đã khóa"}</span></td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Lịch sử đăng nhập gần đây (LichSuDangNhap)</h3></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Tài khoản</th><th>Thời gian</th><th>IP</th><th>Trạng thái</th></tr></thead>
          <tbody>
            ${logs
              .slice(0, 20)
              .map(
                (l) => `
              <tr>
                <td>${esc(l.TaiKhoan)}</td>
                <td>${fmtDateTime(l.ThoiGian)}</td>
                <td>${esc(l.DiaChiIP)}</td>
                <td><span class="badge ${l.TrangThai ? "badge-green" : "badge-red"}">${l.TrangThai ? "Thành công" : "Thất bại"}</span></td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Bootstrap
checkDbStatus();
if (state.token) {
  enterApp();
}
