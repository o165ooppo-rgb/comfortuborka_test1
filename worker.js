/* =========================================================
   WORKER.JS — страница работника
   Только: турникет, чат с директором, мои задания.
   НЕ зависит от app.js (он не подключён в worker.html).
========================================================= */

let session = null;

let _staffChatOpen = false;
let _staffChatDirectorLogin = null;
let _staffChatPollTimer = null;

let _myTasksOpen = false;

let _tsType = "check_in";
let _tsStream = null;
let _tsPhotoDataUrl = null;
let _tsGeo = null;
let _tsGeoLoading = false;

let _currentReceiptOrderId = null;

let _heartbeatTimer = null;

bootstrapApp({ allowedRoles: ["worker"] }, function (s) {
  session = s;
  startHeartbeatLoop();
  applySettings();
  renderNav();
  renderWorkerHero();
  renderStats();

  initStaffChat();
  initMyTasks();

  // Storage events — обновляем когда что-то меняется
  window.addEventListener("storage", e => {
    if (e.key === "kus_settings") applySettings();
    if (e.key === "kus_chats") refreshStaffChat();
    if (e.key === "kus_tasks") {
      renderMyTasks();
      refreshMyTasksBadge();
      renderStats();
    }
    if (e.key === "kus_attendance") renderStats();
  });

  // Перерисовка при смене языка
  window.addEventListener("lang-changed", () => {
    applyI18n();
    renderNav();
    renderWorkerHero();
    renderStats();
    applySettings();
    renderMyTasks();
  });
});

/* =========================================================
   HEARTBEAT
========================================================= */
function startHeartbeatLoop() {
  if (_heartbeatTimer) clearInterval(_heartbeatTimer);
  updateHeartbeat(session.login);
  _heartbeatTimer = setInterval(() => updateHeartbeat(session.login), 30 * 1000);
}

/* =========================================================
   SETTINGS / NAV / HERO
========================================================= */
function applySettings() {
  const settings = getSettings();
  const callCenterEl = document.getElementById("callCenterText");
  if (callCenterEl && settings.callCenter) {
    callCenterEl.textContent = "Call Center " + settings.callCenter;
  }
}

function renderNav() {
  const nav = document.getElementById("navRight");
  if (!nav) return;
  const langSwitcher = typeof renderLangSwitcher === "function" ? renderLangSwitcher() : "";
  nav.innerHTML = `
    ${langSwitcher}
    <div class="user-chip" title="${escapeHtml(session.fullName || session.login)}">
      <div class="user-chip-avatar"><i class="fa-solid fa-user"></i></div>
      <div class="user-chip-info">
        <div class="user-chip-name">${escapeHtml(session.fullName || session.login)}</div>
        <div class="user-chip-role muted">${roleLabel(session.role)}</div>
      </div>
    </div>
    <button class="ghost-btn small" onclick="doLogout()" title="${t("nav.logout")}">
      <i class="fa-solid fa-right-from-bracket"></i> <span data-i18n="nav.logout">Выйти</span>
    </button>
  `;
  applyI18n();
}

function renderWorkerHero() {
  const nameEl = document.getElementById("workerWelcomeName");
  if (nameEl) nameEl.textContent = session.fullName || session.login;
}

function doLogout() {
  logout();
  window.location.href = "login.html";
}

/* =========================================================
   СТАТИСТИКА (3 плитки сверху)
========================================================= */
function renderStats() {
  const myTasks = getTasksForUser(session.login);
  const pending = myTasks.filter(t => (t.statuses && t.statuses[session.login]) === "pending").length;

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const done = myTasks.filter(tk => {
    if ((tk.statuses && tk.statuses[session.login]) !== "done") return false;
    return new Date(tk.createdAt).getTime() >= todayStart.getTime();
  }).length;

  // Отметок сегодня
  const attendance = getAttendance();
  const todayAtts = attendance.filter(a => a.login === session.login && new Date(a.timestamp || a.createdAt).getTime() >= todayStart.getTime()).length;

  setText("wstatTasksPending", pending);
  setText("wstatTasksDone", done);
  setText("wstatAttToday", todayAtts);
}

function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

/* =========================================================
   ЧАТ С ДИРЕКТОРОМ
========================================================= */
function getDirectorLogin() {
  const users = getUsers();
  const dir = users.find(u => u.role === "director");
  return dir ? dir.login : null;
}

function initStaffChat() {
  _staffChatDirectorLogin = getDirectorLogin();
  const bubble = document.getElementById("chatBubble");
  if (bubble) bubble.style.display = "flex";
  refreshStaffChat();
  _staffChatPollTimer = setInterval(refreshStaffChat, 3000);
}

function toggleStaffChat() {
  const panel = document.getElementById("staffChatPanel");
  if (!panel) return;
  if (!_staffChatDirectorLogin) _staffChatDirectorLogin = getDirectorLogin();
  _staffChatOpen = !_staffChatOpen;
  if (_staffChatOpen) {
    panel.style.display = "flex";
    if (_staffChatDirectorLogin) {
      markMessagesRead(session.login, _staffChatDirectorLogin);
      renderStaffChatMessages();
      setTimeout(() => {
        const m = document.getElementById("staffChatMessages");
        if (m) m.scrollTop = m.scrollHeight;
      }, 50);
    }
    refreshStaffChatBadge();
  } else {
    panel.style.display = "none";
  }
}

function refreshStaffChat() {
  if (!_staffChatDirectorLogin) _staffChatDirectorLogin = getDirectorLogin();
  if (_staffChatOpen) renderStaffChatMessages();
  refreshStaffChatBadge();
}

function refreshStaffChatBadge() {
  if (!_staffChatDirectorLogin) return;
  const unread = getUnreadCount(session.login, _staffChatDirectorLogin);
  const bub = document.getElementById("chatBubbleBadge");
  const card = document.getElementById("workerChatBadge");
  if (unread > 0) {
    if (bub) { bub.textContent = unread; bub.style.display = "flex"; }
    if (card) { card.textContent = unread; card.style.display = "inline-flex"; }
  } else {
    if (bub) bub.style.display = "none";
    if (card) card.style.display = "none";
  }
}

function renderStaffChatMessages() {
  const wrap = document.getElementById("staffChatMessages");
  if (!wrap || !_staffChatDirectorLogin) return;
  const messages = getMessagesBetween(session.login, _staffChatDirectorLogin);
  if (messages.length === 0) {
    wrap.innerHTML = `<div class="staff-chat-empty"><i class="fa-regular fa-comments"></i><p>${escapeHtml(t("staff.chat.dirInfo")).replace(/\n/g, "<br>")}</p></div>`;
    return;
  }
  wrap.innerHTML = messages.map(m => {
    const mine = m.from === session.login;
    const ts = m.timestamp || m.createdAt;
    const time = new Date(ts).toLocaleTimeString(getCurrentLang() === "uz" ? "uz-UZ" : (getCurrentLang() === "en" ? "en-US" : "ru-RU"), { hour: "2-digit", minute: "2-digit" });
    return `
      <div class="msg ${mine ? "msg-mine" : "msg-theirs"}">
        <div class="msg-bubble">${escapeHtml(m.text).replace(/\n/g, "<br>")}</div>
        <div class="msg-time muted">${escapeHtml(time)}</div>
      </div>
    `;
  }).join("");
  setTimeout(() => { wrap.scrollTop = wrap.scrollHeight; }, 10);
}

function staffSendMessage() {
  const input = document.getElementById("staffChatInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  if (!_staffChatDirectorLogin) {
    showToast("error", t("common.error"), t("staff.chat.noDir"));
    return;
  }
  sendMessage(session.login, _staffChatDirectorLogin, text);
  input.value = "";
  renderStaffChatMessages();
}

/* =========================================================
   МОИ ЗАДАНИЯ
========================================================= */
function initMyTasks() {
  const bubble = document.getElementById("myTasksBubble");
  if (bubble) bubble.style.display = "flex";
  renderMyTasks();
  refreshMyTasksBadge();
  setInterval(refreshMyTasksBadge, 5000);
}

function refreshMyTasksBadge() {
  const n = countNewTasksForUser(session.login);
  const bub = document.getElementById("myTasksBadge");
  const card = document.getElementById("workerTasksBadge");
  if (n > 0) {
    if (bub) { bub.textContent = n; bub.style.display = "flex"; }
    if (card) { card.textContent = n; card.style.display = "inline-flex"; }
  } else {
    if (bub) bub.style.display = "none";
    if (card) card.style.display = "none";
  }
}

function toggleMyTasks() {
  const panel = document.getElementById("myTasksPanel");
  if (!panel) return;
  _myTasksOpen = !_myTasksOpen;
  if (_myTasksOpen) {
    renderMyTasks();
    panel.style.display = "flex";
  } else {
    panel.style.display = "none";
  }
}

function renderMyTasks() {
  const list = document.getElementById("myTasksList");
  if (!list) return;
  const tasks = getTasksForUser(session.login);
  if (tasks.length === 0) {
    list.innerHTML = `<div class="empty-state" style="padding:30px"><i class="fa-regular fa-folder-open"></i><p>${escapeHtml(t("my.tasks.empty"))}</p></div>`;
    return;
  }
  const users = getUsers();
  list.innerHTML = tasks.map(task => {
    const fromUser = users.find(u => u.login === task.fromLogin);
    const fromName = fromUser ? (fromUser.fullName || fromUser.login) : task.fromLogin;
    const status = task.statuses && task.statuses[session.login];
    const isDone = status === "done";
    const isNew = status === "pending";
    const createdAt = new Date(task.createdAt);
    const dateStr = createdAt.toLocaleString(getCurrentLang() === "uz" ? "uz-UZ" : (getCurrentLang() === "en" ? "en-US" : "ru-RU"));
    const escText = escapeHtml(task.text).replace(/\n/g, "<br>");
    const receiptBtn = task.receiptOrderId
      ? `<button class="ghost-btn small" onclick="openReceipt('${task.receiptOrderId}')">
           <i class="fa-solid fa-receipt"></i> ${t("receipt.show")}
         </button>` : "";
    return `
      <div class="my-task-card ${isDone ? 'my-task-done' : ''}">
        <div class="my-task-head">
          <div class="my-task-from">
            <i class="fa-solid fa-user-tie"></i>
            <span class="muted">${t("my.tasks.from")}</span>
            <strong>${escapeHtml(fromName)}</strong>
          </div>
          ${isNew ? `<span class="my-task-badge-new">${t("my.tasks.new")}</span>` : ""}
          ${isDone ? `<span class="my-task-badge-done"><i class="fa-solid fa-check"></i> ${t("my.tasks.done")}</span>` : ""}
        </div>
        <div class="my-task-text">${escText}</div>
        <div class="my-task-foot">
          <span class="muted"><i class="fa-regular fa-clock"></i> ${escapeHtml(dateStr)}</span>
          <div class="my-task-actions">
            ${receiptBtn}
            ${!isDone ? `<button class="primary small" onclick="handleMarkTaskDone('${task.id}')">
              <i class="fa-solid fa-check"></i> ${t("my.tasks.markDone")}
            </button>` : ""}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function handleMarkTaskDone(taskId) {
  const res = markTaskDone(taskId, session.login);
  if (res.ok) {
    showToast("success", t("common.success"), t("my.tasks.completed"));
    renderMyTasks();
    refreshMyTasksBadge();
    renderStats();
  }
}

/* =========================================================
   ЧЕК (просмотр когда пришёл из задания)
========================================================= */
function openReceipt(orderId) {
  const order = getAllOrders().find(o => o.id === orderId);
  if (!order) {
    showToast("error", t("common.error"), t("dir.att.notFound"));
    return;
  }
  _currentReceiptOrderId = orderId;
  document.getElementById("receiptBody").innerHTML = buildReceiptHtml(order);
  document.getElementById("receiptModal").classList.add("open");
}

function closeReceipt() {
  document.getElementById("receiptModal").classList.remove("open");
  _currentReceiptOrderId = null;
}

function buildReceiptHtml(order) {
  const settings = getSettings();
  const company = settings.companyName || "Komfort Uborka";
  const callCenter = settings.callCenter || "";
  const lang = getCurrentLang();
  let serviceTitle = order.serviceTitle || "—";
  if (lang === "ru" && order.serviceTitleRu) serviceTitle = order.serviceTitleRu;
  else if (lang === "uz" && order.serviceTitleUz) serviceTitle = order.serviceTitleUz;
  else if (lang === "en" && order.serviceTitleEn) serviceTitle = order.serviceTitleEn;

  const price = order.price || order.total || 0;
  const advance = order.advance || 0;
  const remaining = Math.max(0, price - advance);

  let payLabel, payColor;
  if (order.payment === "paid") { payLabel = t("receipt.paid"); payColor = "#00b87a"; }
  else if (order.payment === "draft") { payLabel = t("receipt.draft"); payColor = "#f59e0b"; }
  else { payLabel = t("receipt.unpaid"); payColor = "#ef4444"; }

  const createdAt = new Date(order.createdAt);
  const createdStr = createdAt.toLocaleString(lang === "uz" ? "uz-UZ" : (lang === "en" ? "en-US" : "ru-RU"));

  return `
    <div class="receipt-paper">
      <div class="receipt-head">
        <div class="receipt-logo"><i class="fa-solid fa-broom"></i></div>
        <div class="receipt-company">${escapeHtml(company)}</div>
        ${callCenter ? `<div class="receipt-contact"><i class="fa-solid fa-phone"></i> ${escapeHtml(callCenter)}</div>` : ""}
        <div class="receipt-divider"></div>
        <div class="receipt-id">${t("receipt.no")}${order.id.slice(-6).toUpperCase()}</div>
        <div class="receipt-date">${escapeHtml(createdStr)}</div>
      </div>
      <div class="receipt-rows">
        <div class="receipt-row"><span class="muted">${t("receipt.service")}</span><strong>${escapeHtml(serviceTitle)}</strong></div>
        <div class="receipt-row"><span class="muted">${t("receipt.client")}</span><strong>${escapeHtml(order.name)}</strong></div>
        <div class="receipt-row"><span class="muted">${t("receipt.phone")}</span><strong>${escapeHtml(order.phone)}</strong></div>
        <div class="receipt-row"><span class="muted">${t("receipt.address")}</span><strong>${escapeHtml(order.address)}</strong></div>
        <div class="receipt-row"><span class="muted">${t("receipt.scheduled")}</span><strong>${escapeHtml(order.date)} ${escapeHtml(order.time)}</strong></div>
      </div>
      <div class="receipt-divider"></div>
      <div class="receipt-money">
        <div class="receipt-row"><span class="muted">${t("receipt.price")}</span><strong>${price.toLocaleString("ru-RU")} ${t("services.currency")}</strong></div>
        <div class="receipt-row"><span class="muted">${t("receipt.advance")}</span><strong>${advance.toLocaleString("ru-RU")} ${t("services.currency")}</strong></div>
        <div class="receipt-row receipt-row-total"><span>${t("receipt.remaining")}</span><strong>${remaining.toLocaleString("ru-RU")} ${t("services.currency")}</strong></div>
      </div>
      <div class="receipt-status" style="background:${payColor}">${payLabel}</div>
      <div class="receipt-foot"><p>${t("receipt.thanks")}</p></div>
    </div>
  `;
}

function printReceipt() {
  if (!_currentReceiptOrderId) return;
  const order = getAllOrders().find(o => o.id === _currentReceiptOrderId);
  if (!order) return;
  const html = buildReceiptHtml(order);
  const win = window.open("", "_blank", "width=500,height=800");
  win.document.write(`
    <html><head><title>${t("receipt.title")} #${order.id.slice(-6)}</title>
    <link rel="stylesheet" href="style.css"/>
    <style>body{padding:20px;background:#fff}</style>
    </head><body>${html}</body></html>
  `);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

/* =========================================================
   ТУРНИКЕТ — приход/уход
========================================================= */
function wOpenArrive() { openTurnstile("check_in"); }
function wOpenLeave() { openTurnstile("check_out"); }

function openTurnstile(type) {
  _tsType = type;
  _tsPhotoDataUrl = null;
  _tsGeo = null;

  const titleEl = document.getElementById("turnstileTitle");
  const subEl = document.getElementById("turnstileSubtitle");
  if (titleEl) titleEl.textContent = type === "check_in" ? t("ts.checkInTitle") : t("ts.checkOutTitle");
  if (subEl) subEl.textContent = type === "check_in" ? t("ts.checkInDesc") : t("ts.checkOutDesc");

  document.getElementById("tsPreview").style.display = "none";
  document.getElementById("tsVideo").style.display = "block";
  document.getElementById("tsCamError").style.display = "none";
  document.getElementById("tsGeoStatus").style.display = "none";
  document.getElementById("tsError").style.display = "none";
  document.getElementById("tsCaptureBtn").style.display = "inline-flex";
  document.getElementById("tsRetakeBtn").style.display = "none";
  document.getElementById("tsSubmitBtn").style.display = "none";
  setTsStep(1);

  document.getElementById("turnstileModal").classList.add("open");

  navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
    .then(stream => {
      _tsStream = stream;
      const v = document.getElementById("tsVideo");
      v.srcObject = stream;
    })
    .catch(err => {
      console.warn("Camera error:", err);
      document.getElementById("tsCamError").style.display = "flex";
      document.getElementById("tsVideo").style.display = "none";
      document.getElementById("tsCaptureBtn").style.display = "none";
    });
}

function stopTurnstileCamera() {
  if (_tsStream) {
    _tsStream.getTracks().forEach(t => t.stop());
    _tsStream = null;
  }
}

function tsCapturePhoto() {
  const v = document.getElementById("tsVideo");
  const c = document.getElementById("tsCanvas");
  c.width = v.videoWidth || 640;
  c.height = v.videoHeight || 480;
  const ctx = c.getContext("2d");
  ctx.translate(c.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(v, 0, 0, c.width, c.height);
  _tsPhotoDataUrl = c.toDataURL("image/jpeg", 0.75);
  document.getElementById("tsPreview").src = _tsPhotoDataUrl;
  document.getElementById("tsPreview").style.display = "block";
  document.getElementById("tsVideo").style.display = "none";
  document.getElementById("tsCaptureBtn").style.display = "none";
  document.getElementById("tsRetakeBtn").style.display = "inline-flex";
  document.getElementById("tsSubmitBtn").style.display = "inline-flex";
  stopTurnstileCamera();
  setTsStep(2);
  fetchTurnstileGeo();
}

function tsRetakePhoto() {
  _tsPhotoDataUrl = null;
  _tsGeo = null;
  document.getElementById("tsPreview").style.display = "none";
  document.getElementById("tsVideo").style.display = "block";
  document.getElementById("tsGeoStatus").style.display = "none";
  document.getElementById("tsCaptureBtn").style.display = "inline-flex";
  document.getElementById("tsRetakeBtn").style.display = "none";
  document.getElementById("tsSubmitBtn").style.display = "none";
  setTsStep(1);
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
    .then(stream => { _tsStream = stream; document.getElementById("tsVideo").srcObject = stream; })
    .catch(() => {});
}

function setTsStep(n) {
  document.querySelectorAll(".ts-step").forEach(el => {
    const k = parseInt(el.dataset.step);
    el.classList.toggle("ts-step-active", k <= n);
  });
}

function fetchTurnstileGeo() {
  const statusEl = document.getElementById("tsGeoStatus");
  const titleEl = document.getElementById("tsGeoTitle");
  const subEl = document.getElementById("tsGeoSub");
  statusEl.style.display = "flex";
  titleEl.textContent = t("ts.geoLocating");
  subEl.textContent = t("ts.geoAllow");
  _tsGeoLoading = true;

  if (!navigator.geolocation) {
    _tsGeoLoading = false;
    titleEl.textContent = t("ts.geoFail");
    subEl.textContent = t("ts.geoUnavailable");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      _tsGeo = { lat, lng, accuracy: pos.coords.accuracy };
      try {
        const lang = getCurrentLang();
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=${lang}`;
        titleEl.textContent = t("ts.geoFindingAddr");
        const resp = await fetch(url, { headers: { "Accept": "application/json" } });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.display_name) {
            _tsGeo.address = data.display_name;
            titleEl.textContent = t("ts.geoOk", { acc: Math.round(pos.coords.accuracy) });
            subEl.textContent = data.display_name;
            _tsGeoLoading = false;
            setTsStep(3);
            return;
          }
        }
      } catch (e) { console.warn("Reverse geo fail", e); }
      titleEl.textContent = t("ts.geoOk", { acc: Math.round(pos.coords.accuracy) });
      subEl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      _tsGeoLoading = false;
      setTsStep(3);
    },
    err => {
      _tsGeoLoading = false;
      titleEl.textContent = t("ts.geoFail");
      let msg = t("ts.geoFailDesc");
      if (err.code === 1) msg = t("ts.geoDenied");
      else if (err.code === 3) msg = t("ts.geoTimeout");
      subEl.textContent = msg;
      _tsGeo = null;
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function tsSubmit() {
  const errBox = document.getElementById("tsError");
  errBox.style.display = "none";
  if (!_tsPhotoDataUrl) {
    errBox.textContent = t("ts.errNoPhoto");
    errBox.style.display = "block";
    return;
  }
  if (_tsGeoLoading) {
    errBox.textContent = t("ts.errWaitGeo");
    errBox.style.display = "block";
    return;
  }

  const record = {
    login: session.login,
    fullName: session.fullName,
    role: session.role,
    type: _tsType,
    photo: _tsPhotoDataUrl,
    lat: _tsGeo ? _tsGeo.lat : null,
    lng: _tsGeo ? _tsGeo.lng : null,
    accuracy: _tsGeo ? _tsGeo.accuracy : null,
    address: _tsGeo ? _tsGeo.address : null,
  };
  const res = addAttendance(record);
  if (!res.ok) {
    errBox.textContent = res.error || t("common.error");
    errBox.style.display = "block";
    return;
  }

  showToast("success",
    _tsType === "check_in" ? t("ts.successIn") : t("ts.successOut"),
    t("ts.successDesc"));
  closeTurnstile();

  // После прихода — показать кнопку «Ушёл»
  refreshArriveLeaveButtons();
  renderStats();
}

function closeTurnstile() {
  stopTurnstileCamera();
  document.getElementById("turnstileModal").classList.remove("open");
  _tsPhotoDataUrl = null;
  _tsGeo = null;
}

function refreshArriveLeaveButtons() {
  // Если есть запись check_in без последующего check_out — показать «Ушёл»
  const list = getAttendance().filter(a => a.login === session.login).sort((a, b) =>
    new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
  const lastIn = list.find(a => a.type === "check_in");
  const lastOut = list.find(a => a.type === "check_out");
  const inTime = lastIn ? new Date(lastIn.timestamp || lastIn.createdAt) : null;
  const outTime = lastOut ? new Date(lastOut.timestamp || lastOut.createdAt) : null;
  const isAtWork = inTime && (!outTime || inTime > outTime);
  const leaveBtn = document.getElementById("workerLeaveBtn");
  if (leaveBtn) leaveBtn.style.display = isAtWork ? "inline-flex" : "none";
}

/* =========================================================
   ХЕЛПЕРЫ
========================================================= */
function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function showToast(type, title, text) {
  const root = document.getElementById("toastRoot");
  if (!root) return;
  const div = document.createElement("div");
  div.className = `toast toast-${type}`;
  const icon = type === "success" ? "fa-check" : type === "error" ? "fa-xmark" : "fa-info";
  div.innerHTML = `
    <div class="toast-icon"><i class="fa-solid ${icon}"></i></div>
    <div class="toast-body"><div class="toast-title">${escapeHtml(title || "")}</div><div class="toast-text">${escapeHtml(text || "")}</div></div>
  `;
  root.appendChild(div);
  setTimeout(() => { div.classList.add("toast-out"); }, 3000);
  setTimeout(() => { div.remove(); }, 3500);
}

function paymentLabel(p) {
  return p === "paid" ? t("order.paid") : p === "draft" ? t("order.draft") : t("order.unpaid");
}

function roleLabel(r) {
  return r === "director" ? t("role.director") : r === "accountant" ? t("role.accountant") : t("role.worker");
}

// Закрытие модалок по клику на оверлей
document.querySelectorAll(".modal").forEach(m => {
  m.addEventListener("click", e => { if (e.target === m) m.classList.remove("open"); });
});

// При загрузке — обновить состояние кнопок турникета
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (session) refreshArriveLeaveButtons();
  }, 600);
});
