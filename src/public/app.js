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

const state = {
  token: localStorage.getItem("crm_token") || "",
  user: null,
  catalogs: {},
  currentPage: "tasks",
  dashboardScope: "mine",
  customerPage: 1,
};

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

$("#open-db-config-login").addEventListener("click", openDbConfigModal);
$("#open-db-config-top").addEventListener("click", openDbConfigModal);

// Toggle password visibility
const btnTogglePwd = $("#btn-toggle-pwd");
if (btnTogglePwd) {
  btnTogglePwd.addEventListener("click", () => {
    const pwdInput = $("#login-password");
    const isPwd = pwdInput.type === "password";
    pwdInput.type = isPwd ? "text" : "password";
    btnTogglePwd.innerHTML = isPwd
      ? `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>`
      : `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
  });
}

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errBox = $("#login-error");
  const errText = $("#login-error-text");
  const submitBtn = $("#btn-login-submit");

  const loginType = $('input[name="login_type"]:checked')?.value || "md5";

  errBox.classList.add("hidden");
  submitBtn.disabled = true;
  submitBtn.querySelector(".btn-text").textContent = "Đang xác thực...";

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
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector(".btn-text").textContent = "Đăng nhập ngay";
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

// Toggle hiển thị tùy chọn nâng cao (loại mật khẩu & danh sách nhân viên) khi bấm vào logo CRM+
$("#login-logo-btn")?.addEventListener("click", () => {
  const typeSwitch = $("#login-type-switch");
  const staffBtn = $("#btn-login-staff-list");
  if (!typeSwitch || !staffBtn) return;

  const isHidden = typeSwitch.classList.contains("hidden");
  if (isHidden) {
    typeSwitch.classList.remove("hidden");
    typeSwitch.classList.add("login-advanced-reveal");
    staffBtn.classList.remove("hidden");
    staffBtn.classList.add("login-advanced-reveal");
    toast("Đã hiển thị chọn loại mật khẩu & danh sách nhân viên");
  } else {
    typeSwitch.classList.add("hidden");
    typeSwitch.classList.remove("login-advanced-reveal");
    staffBtn.classList.add("hidden");
    staffBtn.classList.remove("login-advanced-reveal");
  }
});

function logout() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("crm_token");
  $("#app-view").classList.add("hidden");
  $("#login-view").classList.remove("hidden");
  $("#login-type-switch")?.classList.add("hidden");
  $("#btn-login-staff-list")?.classList.add("hidden");
  checkDbStatus();
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
      b.addEventListener("click", () => openCustomerDetail(b.dataset.viewCust)),
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
    id ? "Cập nhật Hồ sơ Khách hàng" : "Thêm Khách hàng mới",
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
          <label>Loại dịch vụ, sản phẩm</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </span>
            <select name="idloaikhachhang" id="cust-modal-loaisp">
              <option value="">-- Chọn Loại dịch vụ, sản phẩm --</option>
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
    }
  });
}

async function openCustomerDetail(id) {
  const data = await api(`/api/customers/${id}`);
  const c = data.customer;
  openModal(
    `Hồ sơ 360°: ${c.tenkhachhang}`,
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
                `<div style="padding:8px 0;border-bottom:1px solid var(--border)"><strong>${fmtDateTime(x.ngaythang)}</strong> - ${esc(x.tennhanvien)} (${esc(x.tendanhgiakhachhang || "-")})<div>${esc(x.ghichu)}</div></div>`,
            )
            .join("")
        : '<p class="muted">Chưa có lịch sử CSKH.</p>';
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
  $("#btn-add-care").addEventListener("click", async () => {
    const custs = await api("/api/customers?limit=100");
    openModal(
      "Ghi nhận Chăm sóc Khách hàng",
      `
      <form id="care-form" class="form-stack">
        <div class="form-group"><label>Khách hàng *</label><select name="idkhachhang" required>${optList(custs.items, "idkhachhang", "tenkhachhang")}</select></div>
        <div class="form-grid">
          <div class="form-group"><label>Hình thức CS</label><select name="idhinhthucchamsoc"><option value="">-- Chọn --</option>${optList(state.catalogs.hinhThucChamSoc, "idhinhthucchamsoc", "tenhinhthuc")}</select></div>
          <div class="form-group"><label>Đánh giá</label><select name="iddanhgiakhachhang"><option value="">-- Chọn --</option>${optList(state.catalogs.danhGiaKhachHang, "iddanhgiakhachhang", "tendanhgiakhachhang")}</select></div>
          <div class="form-group"><label>Lý do</label><select name="idlydokhachhang"><option value="">-- Chọn --</option>${optList(state.catalogs.lyDoKhachHang, "idlydokhachhang", "tenlydokhachhang")}</select></div>
          <div class="form-group"><label>Trạng thái</label><select name="idtrangthai"><option value="">-- Chọn --</option>${optList(state.catalogs.trangThai, "idtrangthai", "tentrangthai")}</select></div>
        </div>
        <label class="checkbox-row"><input type="checkbox" name="isquantam" /> Khách đang quan tâm</label>
        <div class="form-group"><label>Ghi chú nội dung</label><textarea name="ghichu" rows="3" required></textarea></div>
        <button type="submit" class="btn btn-primary">Lưu nhật ký</button>
      </form>
    `,
    );
    $("#care-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      payload.isquantam = fd.get("isquantam") === "on";
      await api("/api/care", { method: "POST", body: JSON.stringify(payload) });
      toast("Đã lưu nhật ký CSKH");
      closeModal();
      load();
    });
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
async function renderKtvTime() {
  const el = $("#page-content");
  const { firstDayStr, lastDayStr } = getCurrentMonthRange();

  el.innerHTML = `
    <!-- Bảng Thống kê & Bộ lọc -->
    <div class="card">
      <div class="card-header" style="flex-wrap:wrap;gap:12px">
        <div>
          <h3 style="font-size:17px">Thống kê Giờ làm Kỹ thuật viên (Time KTV)</h3>
          <p class="muted" style="margin:4px 0 0;font-size:12.5px">Mỗi kỹ thuật viên hiển thị trên một form riêng biệt với đầy đủ thông tin</p>
        </div>
        <div class="view-mode-toggle">
          <button type="button" class="view-mode-btn active-mode" id="btn-view-cards" title="Xem dạng Form riêng từng nhân viên">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Dạng Form riêng
          </button>
          <button type="button" class="view-mode-btn" id="btn-view-table" title="Xem dạng Bảng truyền thống">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Dạng Bảng
          </button>
        </div>
      </div>

      <!-- BỘ LỌC TÌM KIẾM & SẮP XẾP -->
      <div class="task-filter-panel">
        <div class="filter-field field-date">
          <label for="ktv-from">Từ ngày duyệt</label>
          <input type="date" id="ktv-from" value="${firstDayStr}" />
        </div>
        <div class="filter-field field-date">
          <label for="ktv-to">Đến ngày duyệt</label>
          <input type="date" id="ktv-to" value="${lastDayStr}" />
        </div>
        <div class="filter-field field-sort">
          <label for="ktv-sort">Sắp xếp thời gian</label>
          <select id="ktv-sort">
            <option value="thucte_desc" selected>Giờ thực tế: Cao ➜ Thấp</option>
            <option value="thucte_asc">Giờ thực tế: Thấp ➜ Cao</option>
            <option value="dukien_desc">Giờ dự kiến: Cao ➜ Thấp</option>
            <option value="dukien_asc">Giờ dự kiến: Thấp ➜ Cao</option>
            <option value="name">Tên nhân viên: A ➜ Z</option>
          </select>
        </div>
        <div class="filter-field flex-grow field-search">
          <label for="ktv-q">Tìm kiếm nhân viên</label>
          <input type="text" id="ktv-q" placeholder="Nhập tên KTV, số điện thoại..." />
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

      <!-- DANH SÁCH FORM / BẢNG TIME KTV -->
      <div id="ktv-table-wrap">
        <div style="padding:28px;text-align:center;color:var(--muted)">Đang tải thống kê giờ làm kỹ thuật viên...</div>
      </div>
    </div>
  `;

  let ktvViewMode = state.ktvViewMode || "cards";

  const updateToggleButtons = () => {
    if ($("#btn-view-cards")) {
      $("#btn-view-cards").className =
        "view-mode-btn " + (ktvViewMode === "cards" ? "active-mode" : "");
    }
    if ($("#btn-view-table")) {
      $("#btn-view-table").className =
        "view-mode-btn " + (ktvViewMode === "table" ? "active-mode" : "");
    }
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

      if (ktvViewMode === "cards") {
        // HIỂN THỊ DẠNG FORM RIÊNG CHO MỖI NHÂN VIÊN
        $("#ktv-table-wrap").innerHTML = `
          ${
            items.length
              ? `
            <div class="ktv-cards-grid">
              ${items
                .map((nv) => {
                  const pct = Math.min(Math.round(nv.hieusuat || 0), 200);
                  const barClass =
                    pct >= 100 ? "high" : pct >= 60 ? "normal" : "low";
                  const sttClass =
                    nv.stt === 1
                      ? "top-1"
                      : nv.stt === 2
                        ? "top-2"
                        : nv.stt === 3
                          ? "top-3"
                          : "";
                  const diffClass = nv.chenhlech >= 0 ? "plus" : "minus";
                  const diffSign = nv.chenhlech > 0 ? "+" : "";

                  return `
                  <div class="ktv-employee-card">
                    <!-- Header: Thông tin KTV & Bộ phận -->
                    <div class="ktv-card-header">
                      <div class="ktv-card-user">
                        <span class="ktv-card-stt-badge ${sttClass}" title="Thứ tự xếp hạng">#${nv.stt}</span>
                        <div class="ktv-card-avatar">
                          ${esc((nv.hoten || "KT").slice(0, 2).toUpperCase())}
                        </div>
                        <div class="ktv-card-name-block">
                          <h4 class="ktv-card-name" title="${esc(nv.hoten)}">${esc(nv.hoten)}</h4>
                          <div class="ktv-card-meta">
                            ${nv.idnhanvien ? `<span>Mã: <strong>${esc(nv.idnhanvien)}</strong></span>` : ""}
                            ${nv.dienthoai ? `<span>📞 ${esc(nv.dienthoai)}</span>` : nv.tendangnhap ? `<span>@${esc(nv.tendangnhap)}</span>` : ""}
                          </div>
                        </div>
                      </div>
                      <span class="ktv-card-dept-tag">${esc(nv.tenbophan || "Kỹ thuật")}</span>
                    </div>

                    <!-- Chỉ số: Giờ dự kiến & Giờ thực tế -->
                    <div class="ktv-card-stats-row">
                      <div class="ktv-card-stat-box">
                        <div class="ktv-card-stat-label">
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Giờ dự kiến
                        </div>
                        <div class="ktv-card-stat-val dukien">
                          ${nv.tongdukien} <small>giờ</small>
                        </div>
                      </div>

                      <div class="ktv-card-stat-box">
                        <div class="ktv-card-stat-label">
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Giờ thực tế
                        </div>
                        <div class="ktv-card-stat-val thucte">
                          ${nv.tongthucte} <small>giờ</small>
                        </div>
                      </div>
                    </div>

                    <!-- Tốc độ / Hiệu suất -->
                    <div class="ktv-card-perf-section">
                      <div class="ktv-card-perf-top">
                        <span class="ktv-card-perf-label">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Tốc độ / Hiệu suất
                        </span>
                        <div class="ktv-card-perf-badges">
                          <span class="ktv-card-diff-tag ${diffClass}" title="Chênh lệch giờ làm thực tế so với dự kiến">
                            ${diffSign}${nv.chenhlech} h
                          </span>
                          <span class="ktv-card-pct">${nv.hieusuat}%</span>
                        </div>
                      </div>
                      <div class="ktv-progress-bar-bg" style="height:8px">
                        <div class="ktv-progress-bar-fill ${barClass}" style="width:${Math.min(pct, 100)}%"></div>
                      </div>
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
      } else {
        // HIỂN THỊ DẠNG BẢNG
        $("#ktv-table-wrap").innerHTML = `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width:55px;text-align:center">STT</th>
                  <th style="min-width:200px">Nhân viên KTV</th>
                  <th style="min-width:130px">Bộ phận</th>
                  <th style="min-width:130px;text-align:right">Giờ dự kiến</th>
                  <th style="min-width:130px;text-align:right">Giờ thực tế</th>
                  <th style="min-width:180px">Tốc độ / Hiệu suất</th>
                </tr>
              </thead>
              <tbody>
                ${
                  items.length
                    ? items
                        .map((nv) => {
                          const pct = Math.min(
                            Math.round(nv.hieusuat || 0),
                            200,
                          );
                          const barClass =
                            pct >= 100 ? "high" : pct >= 60 ? "normal" : "low";
                          return `
                    <tr>
                      <td style="text-align:center;font-weight:700;color:#94a3b8">${nv.stt}</td>
                      <td>
                        <div style="display:flex;align-items:center;gap:10px">
                          <div class="user-avatar-modern" style="width:34px;height:34px;font-size:12px">
                            ${esc((nv.hoten || "KT").slice(0, 2).toUpperCase())}
                          </div>
                          <div>
                            <strong style="color:var(--text);font-size:14px">${esc(nv.hoten)}</strong>
                            <div class="muted" style="font-size:11.5px">${esc(nv.dienthoai || nv.tendangnhap || "")}</div>
                          </div>
                        </div>
                      </td>
                      <td><span class="badge badge-blue">${esc(nv.tenbophan || "Kỹ thuật")}</span></td>
                      <td style="text-align:right;font-weight:700;color:#fbbf24;font-size:14px">
                        ${nv.tongdukien} <small style="font-weight:500;font-size:11px">giờ</small>
                      </td>
                      <td style="text-align:right;font-weight:800;color:#34d399;font-size:14.5px">
                        ${nv.tongthucte} <small style="font-weight:500;font-size:11px">giờ</small>
                      </td>
                      <td>
                        <div class="ktv-progress-wrapper">
                          <div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:600">
                            <span style="color:var(--text-secondary)">${nv.hieusuat}%</span>
                            <span style="color:${nv.chenhlech >= 0 ? "#34d399" : "#f87171"}">
                              ${nv.chenhlech > 0 ? "+" : ""}${nv.chenhlech} h
                            </span>
                          </div>
                          <div class="ktv-progress-bar-bg">
                            <div class="ktv-progress-bar-fill ${barClass}" style="width:${Math.min(pct, 100)}%"></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `;
                        })
                        .join("")
                    : `
                  <tr>
                    <td colspan="6" style="text-align:center;padding:36px;color:var(--muted)">
                      Không tìm thấy kỹ thuật viên hoặc giờ làm nào trong khoảng ngày duyệt này.
                    </td>
                  </tr>
                `
                }
              </tbody>
            </table>
          </div>
          <div class="task-footer-stats" style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:12.5px;flex-wrap:wrap;gap:8px">
            <span>Tìm thấy: <strong style="color:var(--text)">${items.length}</strong> kỹ thuật viên</span>
            <span>Khoảng ngày duyệt: <strong style="color:var(--text)">${fmtDateOnly(from)} ➜ ${fmtDateOnly(to)}</strong></span>
          </div>
        `;
      }
    } catch (err) {
      $("#ktv-table-wrap").innerHTML =
        `<div class="modern-alert error">Lỗi tải dữ liệu KTV: ${esc(err.message)}</div>`;
    }
  };

  // Sự kiện chuyển đổi chế độ xem Dạng Form / Dạng Bảng
  $("#btn-view-cards")?.addEventListener("click", () => {
    ktvViewMode = "cards";
    state.ktvViewMode = "cards";
    loadData();
  });
  $("#btn-view-table")?.addEventListener("click", () => {
    ktvViewMode = "table";
    state.ktvViewMode = "table";
    loadData();
  });

  // Sự kiện tìm kiếm & lọc
  $("#ktv-btn-search")?.addEventListener("click", loadData);
  $("#ktv-sort")?.addEventListener("change", loadData);
  $("#ktv-q")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loadData();
    }
  });

  // Đặt lại bộ lọc
  $("#ktv-btn-reset")?.addEventListener("click", () => {
    $("#ktv-from").value = firstDayStr;
    $("#ktv-to").value = lastDayStr;
    $("#ktv-sort").value = "thucte_desc";
    $("#ktv-q").value = "";
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
    const cleaned = String(typeStr)
      .replace(/\s*\([^)]*\)?/g, "")
      .trim();
    return cleaned || String(typeStr).trim();
  };

  el.innerHTML = `
    <!-- PANEL BỘ LỌC TRA CỨU THEO 4 TIÊU CHÍ (4 STORED PROCEDURES) -->
    <div class="card">
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

    <!-- DANH SÁCH KHÁCH HÀNG TÌM ĐƯỢC (Mặc định ẩn, khi tìm mới hiện) -->
    <div class="card hidden" style="margin-top:16px" id="cs-result-card">
      <div class="card-header" style="flex-wrap:wrap;gap:12px;justify-content:space-between">
        <div>
          <h3 style="font-size:16px">Danh sách Khách hàng tìm được</h3>
          <p class="muted" style="margin:3px 0 0;font-size:12px">
            Tích chọn vào một khách hàng để xem chi tiết chăm sóc bên dưới
          </p>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span class="badge badge-blue" id="cs-cust-count">0 khách hàng</span>
          <button type="button" class="btn btn-primary btn-sm" id="btn-cs-add-customer">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Thêm khách hàng mới
          </button>
        </div>
      </div>

      <div id="cs-table-wrap">
        <div style="padding:28px;text-align:center;color:var(--muted)">Đang tải danh sách khách hàng...</div>
      </div>
    </div>
  `;

  // Tải chi tiết chăm sóc của khách hàng được tích chọn và mở Modal hiển thị
  const loadCareDetail = async (
    idkhachhang,
    tenkhachhang,
    dienthoai,
    extraInfo = {},
  ) => {
    selectedCustId = idkhachhang;
    selectedCustName = tenkhachhang;
    selectedCustPhone = dienthoai;

    // Cập nhật radio và highlight dòng trên trang hiện tại
    $$(".cust-row-selectable").forEach((tr) => {
      const isThis = String(tr.dataset.idkhachhang) === String(idkhachhang);
      tr.classList.toggle("row-selected", isThis);
      const radio = tr.querySelector(".cust-radio-input");
      if (radio) radio.checked = isThis;
    });

    openModal(
      `Chi tiết Chăm sóc: ${tenkhachhang || "Khách hàng"}`,
      `
        <div id="care-modal-content-wrap">
          <div style="padding:12px 14px;background:var(--surface-subtle);border-radius:var(--radius-md);border:1px solid var(--border);margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
            <div style="font-size:13px;line-height:1.5">
              <strong>Khách hàng:</strong> <span style="color:var(--primary);font-weight:700">${esc(tenkhachhang)}</span>
              ${extraInfo.makhachhang ? ` | <strong>Mã KH:</strong> <code style="font-weight:700;color:var(--primary)">${esc(extraInfo.makhachhang)}</code>` : ""}
              ${dienthoai ? ` | <strong>SĐT:</strong> <span>${esc(dienthoai)}</span>` : ""}
              ${extraInfo.diachi ? `<div style="color:var(--text-secondary);font-size:12px;margin-top:3px"><strong>Địa chỉ:</strong> ${esc(extraInfo.diachi)}</div>` : ""}
            </div>
            <span class="badge badge-amber" id="modal-care-count-badge">Đang nạp...</span>
          </div>

          <div id="care-detail-modal-body">
            <div style="padding:32px;text-align:center;color:var(--muted)">
              Đang tải lịch sử chăm sóc khách hàng...
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;margin-top:16px;gap:8px">
            <button type="button" class="btn btn-outline btn-sm" onclick="closeModal()">Đóng</button>
          </div>
        </div>
      `,
      true,
      "modal-care-detail",
    );

    try {
      const data = await api(
        `/api/customer-search/care?idkhachhang=${encodeURIComponent(idkhachhang)}`,
      );
      const items = data.items || [];

      const countBadge = $("#modal-care-count-badge");
      if (countBadge) {
        countBadge.textContent = `${items.length} lần chăm sóc`;
        countBadge.className = `badge ${items.length > 0 ? "badge-green" : "badge-amber"}`;
      }

      const bodyEl = $("#care-detail-modal-body");
      if (!bodyEl) return;

      bodyEl.innerHTML = `
        <div class="care-table-scroll-container">
          <table class="care-detail-table">
            <colgroup>
              <col style="width: 50px">
              <col style="width: 105px">
              <col style="width: 130px">
              <col style="width: 140px">
              <col style="width: auto">
            </colgroup>
            <thead>
              <tr>
                <th style="text-align:center">STT</th>
                <th style="text-align:center">Thời gian</th>
                <th>Hình thức CS</th>
                <th>Nhân viên CS</th>
                <th>Nội dung / Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              ${
                items.length
                  ? items
                      .map(
                        (c) => `
                <tr>
                  <td style="text-align:center;font-weight:700;color:#94a3b8">${c.stt}</td>
                  <td style="text-align:center"><span class="care-date-badge">${fmtDateOnly(c.ngaythang)}</span></td>
                  <td><span class="badge badge-blue">${esc(c.tenhinhthuc || "Chăm sóc")}</span></td>
                  <td><strong style="color:var(--text);font-size:13px">${esc(c.tennhanvien || "-")}</strong></td>
                  <td class="care-note-cell">
                    <div class="care-note-cell-text">${esc(c.noidungchamsoc || c.ghichu || "-")}</div>
                  </td>
                </tr>
              `,
                      )
                      .join("")
                  : `
                <tr>
                  <td colspan="5" style="text-align:center;padding:36px;color:var(--muted)">
                    Khách hàng này chưa có dữ liệu chăm sóc nào trong hệ thống.
                  </td>
                </tr>
              `
              }
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      const bodyEl = $("#care-detail-modal-body");
      if (bodyEl) {
        bodyEl.innerHTML = `<div class="modern-alert error">Lỗi tải lịch sử chăm sóc: ${esc(err.message)}</div>`;
      }
    }
  };

  // Hàm render bảng khách hàng theo trang hiện tại (Phân trang 10 - 50 - 100 & Trang 1, 2, 3...)
  const renderCustomerTable = () => {
    const tableWrap = $("#cs-table-wrap");
    if (!tableWrap) return;

    const total = allFoundCustomers.length;
    if (!total) {
      tableWrap.innerHTML = `
        <div class="table-wrap">
          <table class="cs-table">
            <colgroup>
              <col style="width:48px">
              <col style="width:52px">
              <col style="width:105px">
              <col style="width:210px">
              <col style="width:210px">
              <col style="width:310px">
              <col style="width:150px">
              <col style="width:155px">
            </colgroup>
            <thead>
              <tr>
                <th class="cs-col-select">CHỌN</th>
                <th class="cs-col-stt">STT</th>
                <th class="cs-col-code">Mã KH</th>
                <th class="cs-col-name">Tên khách hàng</th>
                <th class="cs-col-phone">Số điện thoại</th>
                <th class="cs-col-address">Địa chỉ</th>
                <th class="cs-col-type">Loại KH</th>
                <th class="cs-col-staff">Nhân viên phụ trách</th>
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
            <col style="width:48px">
            <col style="width:52px">
            <col style="width:105px">
            <col style="width:210px">
            <col style="width:210px">
            <col style="width:310px">
            <col style="width:150px">
            <col style="width:155px">
          </colgroup>
          <thead>
            <tr>
              <th class="cs-col-select">CHỌN</th>
              <th class="cs-col-stt">STT</th>
              <th class="cs-col-code">Mã KH</th>
              <th class="cs-col-name">Tên khách hàng</th>
              <th class="cs-col-phone">Số điện thoại</th>
              <th class="cs-col-address">Địa chỉ</th>
              <th class="cs-col-type">Loại KH</th>
              <th class="cs-col-staff">Nhân viên phụ trách</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems
              .map((kh, idx) => {
                const overallStt = startIdx + idx + 1;
                const isSelected =
                  String(kh.idkhachhang) === String(selectedCustId);
                return `
                <tr class="cust-row-selectable ${isSelected ? "row-selected" : ""}" 
                    data-idkhachhang="${esc(kh.idkhachhang)}" 
                    data-tenkhachhang="${esc(kh.tenkhachhang)}" 
                    data-dienthoai="${esc(kh.dienthoai)}"
                    data-makhachhang="${esc(kh.makhachhang || "")}"
                    data-diachi="${esc(kh.diachi || "")}">
                  <td class="cs-col-select" onclick="event.stopPropagation()">
                    <input type="radio" name="selected_cust_radio" class="cust-radio-input" ${isSelected ? "checked" : ""} data-radio-id="${esc(kh.idkhachhang)}" title="Tích chọn để xem lịch sử chăm sóc" />
                  </td>
                  <td class="cs-col-stt" style="font-weight:700;color:#94a3b8">${overallStt}</td>
                  <td class="cs-col-code">
                    <span class="badge badge-blue cs-copyable-cell" data-copy-val="${esc(kh.makhachhang || "")}" data-copy-label="Mã KH" title="Nhấp để sao chép Mã KH">
                      ${esc(kh.makhachhang || "-")}
                      ${
                        kh.makhachhang
                          ? `
                        <svg class="cs-copy-icon" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                      `
                          : ""
                      }
                    </span>
                  </td>
                  <td class="cs-col-name">
                    <strong class="cs-copyable-cell" data-copy-val="${esc(kh.tenkhachhang)}" data-copy-label="Tên khách hàng" title="Nhấp để sao chép Tên khách hàng" style="color:var(--text);font-size:13.5px;display:inline-flex;align-items:center;gap:4px">
                      ${esc(kh.tenkhachhang)}
                      <svg class="cs-copy-icon" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                    </strong>
                    ${kh.email ? `<div class="muted cs-copyable-cell" data-copy-val="${esc(kh.email)}" data-copy-label="Email" title="Nhấp để sao chép Email" style="font-size:11px;word-break:break-all">${esc(kh.email)}</div>` : ""}
                  </td>
                  <td class="cs-col-phone">
                    ${formatPhoneNumbers(kh.dienthoai)}
                  </td>
                  <td class="cs-col-address">
                    <div class="cs-copyable-cell cs-address-text" data-copy-val="${esc(kh.diachi || "")}" data-copy-label="Địa chỉ" title="Nhấp để sao chép Địa chỉ" style="font-size:12.5px;color:var(--text-secondary);line-height:1.45;word-break:break-word">
                      ${esc(kh.diachi || "-")}
                      ${
                        kh.diachi
                          ? `
                        <svg class="cs-copy-icon" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                      `
                          : ""
                      }
                    </div>
                  </td>
                  <td class="cs-col-type">
                    <span class="badge badge-blue" title="${esc(kh.tenloaikhachhang || "Khách hàng")}">${esc(cleanCustomerType(kh.tenloaikhachhang))}</span>
                  </td>
                  <td class="cs-col-staff" style="font-size:13px">${esc(kh.tennhanvien || "-")}</td>
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

    // Gắn sự kiện chọn dòng khách hàng (Mở Modal Chi tiết Chăm sóc Khách hàng)
    $$(".cust-row-selectable").forEach((tr) => {
      tr.addEventListener("click", (e) => {
        if (e.target.closest(".cs-copyable-cell")) return;
        const radio = tr.querySelector(".cust-radio-input");
        if (radio) radio.checked = true;
        loadCareDetail(
          tr.dataset.idkhachhang,
          tr.dataset.tenkhachhang,
          tr.dataset.dienthoai,
          {
            makhachhang: tr.dataset.makhachhang,
            diachi: tr.dataset.diachi,
          },
        );
      });
    });

    // Sự kiện khi tích chọn radio
    $$(".cust-radio-input").forEach((radio) => {
      radio.addEventListener("change", () => {
        const tr = radio.closest("tr");
        if (tr) {
          loadCareDetail(
            tr.dataset.idkhachhang,
            tr.dataset.tenkhachhang,
            tr.dataset.dienthoai,
            {
              makhachhang: tr.dataset.makhachhang,
              diachi: tr.dataset.diachi,
            },
          );
        }
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

  // Tìm kiếm khách hàng theo các tiêu chí đã nhập
  const searchCustomers = async () => {
    const tenkhachhang = $("#cs-name")?.value?.trim() || "";
    const dienthoai = $("#cs-phone")?.value?.trim() || "";
    const diachi = $("#cs-address")?.value?.trim() || "";
    const makhachhang = $("#cs-code")?.value?.trim() || "";

    if (!tenkhachhang && !dienthoai && !diachi && !makhachhang) {
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

    // Mở khung danh sách khách hàng
    $("#cs-result-card")?.classList.remove("hidden");
    selectedCustId = null;

    $("#cs-table-wrap").innerHTML = `
      <div style="padding:28px;text-align:center;color:var(--muted)">
        Đang tra cứu dữ liệu khách hàng từ SQL Server...
      </div>
    `;

    try {
      const data = await api(`/api/customer-search?${qs.toString()}`);
      allFoundCustomers = data.items || [];
      csCurrentPage = 1;
      renderCustomerTable();
    } catch (err) {
      $("#cs-table-wrap").innerHTML =
        `<div class="modern-alert error">Lỗi tra cứu khách hàng: ${esc(err.message)}</div>`;
    }
  };

  // Bắt sự kiện bấm nút Tìm kiếm
  $("#btn-cs-search")?.addEventListener("click", searchCustomers);

  // Phím Enter trên các ô tìm kiếm
  ["#cs-name", "#cs-phone", "#cs-address", "#cs-code"].forEach((sel) => {
    $(sel)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        searchCustomers();
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
    searchCustomers();
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
