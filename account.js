/* =========================================================
   ACCOUNT.JS — страница «Безопасность»
   • Список активных устройств + завершение сеансов
   • Двухэтапный код (включить / сменить / выключить)
========================================================= */

let _accUid = null;
let _accSession = null;

(async function initAccount() {
  applyI18n();

  // Должен быть вход
  _accSession = (typeof getSession === "function") ? getSession() : null;
  if (!_accSession) { window.location.href = "login.html"; return; }

  // Текущий uid из Supabase
  try {
    const { data: sess } = await window.sb.auth.getSession();
    if (!sess || !sess.session) { window.location.href = "login.html"; return; }
    _accUid = sess.session.user.id;
  } catch (e) { window.location.href = "login.html"; return; }

  await renderDevices();
  await renderTwoFA();

  window.addEventListener("lang-changed", () => { applyI18n(); renderDevices(); renderTwoFA(); });
})();

function accGoBack() {
  const s = (typeof getSession === "function") ? getSession() : null;
  if (s && typeof homePageForRole === "function") {
    window.location.href = homePageForRole(s.role);
  } else {
    history.back();
  }
}

/* ===== УСТРОЙСТВА ===== */
function _accFmtSeen(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("account.now") || "только что";
  if (min < 60) return `${min} ${t("account.minAgo") || "мин назад"}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ${t("account.hAgo") || "ч назад"}`;
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
         " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function _accDeviceIcon(platform) {
  const p = (platform || "").toLowerCase();
  if (p.includes("android") || p.includes("iphone") || p.includes("ipad")) return "fa-mobile-screen";
  if (p.includes("windows") || p.includes("mac") || p.includes("linux")) return "fa-laptop";
  return "fa-display";
}

async function renderDevices() {
  const box = document.getElementById("devList");
  if (!box || !window.sb) return;
  box.innerHTML = `<div class="muted" style="padding:14px 0">${escapeHtmlAcc(t("account.loading") || "Загрузка...")}</div>`;

  let data, error;
  try {
    ({ data, error } = await window.sb
      .from("user_devices").select("*").eq("user_id", _accUid)
      .order("last_seen", { ascending: false }));
  } catch (e) { error = e; }

  if (error) {
    box.innerHTML = `<div class="login-error" style="display:block">${escapeHtmlAcc(t("account.devErr") || "Не удалось загрузить устройства. Возможно, не выполнен SQL 03.")}</div>`;
    return;
  }
  const list = data || [];
  const myId = (typeof getDeviceId === "function") ? getDeviceId() : null;

  if (list.length === 0) {
    box.innerHTML = `<div class="muted" style="padding:14px 0">${escapeHtmlAcc(t("account.noDevices") || "Нет записей об устройствах")}</div>`;
    return;
  }

  box.innerHTML = list.map(d => {
    const isCurrent = d.id === myId;
    return `
      <div class="dev-item">
        <div class="dev-ico"><i class="fa-solid ${_accDeviceIcon(d.platform)}"></i></div>
        <div class="dev-main">
          <div class="dev-name">${escapeHtmlAcc(d.device_name || d.platform || "Устройство")}
            ${isCurrent ? `<span class="dev-current">${escapeHtmlAcc(t("account.thisDevice") || "это устройство")}</span>` : ""}
          </div>
          <div class="dev-meta">
            ${escapeHtmlAcc(t("account.lastSeen") || "Активность")}: ${escapeHtmlAcc(_accFmtSeen(d.last_seen))}
          </div>
        </div>
        ${isCurrent
          ? ""
          : `<button class="dev-revoke" onclick="accRevoke('${escapeHtmlAcc(d.id)}')">
               <i class="fa-solid fa-right-from-bracket"></i> ${escapeHtmlAcc(t("account.revoke") || "Завершить")}
             </button>`}
      </div>`;
  }).join("");
}

async function accRevoke(id) {
  if (!confirm(t("account.revokeConfirm") || "Завершить сеанс на этом устройстве?")) return;
  try {
    // Помечаем сеанс завершённым (устройство выйдет само при ближайшей проверке/онлайн).
    const { error } = await window.sb.from("user_devices").update({ revoked: true }).eq("id", id);
    if (error) { showToast("error", t("common.error") || "Ошибка", error.message); return; }
    // Подчищаем запись через секунду, чтобы не висела в списке.
    setTimeout(async () => { try { await window.sb.from("user_devices").delete().eq("id", id); await renderDevices(); } catch (e) {} }, 1200);
    showToast("success", t("common.success") || "Готово", t("account.revoked") || "Сеанс завершён");
    await renderDevices();
  } catch (e) {
    showToast("error", t("common.error") || "Ошибка", "—");
  }
}

/* ===== ДВУХЭТАПНЫЙ КОД ===== */
async function renderTwoFA() {
  const stateEl = document.getElementById("twofaState");
  const enableForm = document.getElementById("twofaEnableForm");
  const manage = document.getElementById("twofaManage");
  if (!stateEl) return;

  let on = false;
  try {
    const { data, error } = await window.sb.rpc("twofa_status");
    if (!error && data === true) on = true;
  } catch (e) {}

  if (on) {
    stateEl.textContent = t("account.on") || "Включён";
    stateEl.className = "twofa-state twofa-on";
    enableForm.style.display = "none";
    manage.style.display = "block";
  } else {
    stateEl.textContent = t("account.off") || "Выключен";
    stateEl.className = "twofa-state twofa-off";
    enableForm.style.display = "block";
    manage.style.display = "none";
    document.getElementById("twofaInput1").value = "";
    document.getElementById("twofaInput2").value = "";
  }
}

function accShowChange() {
  document.getElementById("twofaManage").style.display = "none";
  document.getElementById("twofaEnableForm").style.display = "block";
  document.getElementById("twofaInput1").value = "";
  document.getElementById("twofaInput2").value = "";
  document.getElementById("twofaInput1").focus();
}

function _accTwoFAError(msg) {
  const e = document.getElementById("twofaError");
  e.style.display = "block";
  e.textContent = msg;
}

async function accEnableTwoFA() {
  document.getElementById("twofaError").style.display = "none";
  const c1 = document.getElementById("twofaInput1").value.trim();
  const c2 = document.getElementById("twofaInput2").value.trim();

  if (c1.length < 4) { _accTwoFAError(t("account.errShort") || "Код должен быть минимум 4 символа"); return; }
  if (c1 !== c2) { _accTwoFAError(t("account.errMatch") || "Коды не совпадают"); return; }

  try {
    const { error } = await window.sb.rpc("set_twofa", { p_code: c1 });
    if (error) { _accTwoFAError(error.message); return; }
    showToast("success", t("common.success") || "Готово", t("account.twofaOn") || "Двухэтапный код включён");
    await renderTwoFA();
  } catch (e) {
    _accTwoFAError(t("common.error") || "Ошибка");
  }
}

async function accDisableTwoFA() {
  if (!confirm(t("account.disableConfirm") || "Выключить двухэтапный код?")) return;
  try {
    const { error } = await window.sb.rpc("disable_twofa");
    if (error) { showToast("error", t("common.error") || "Ошибка", error.message); return; }
    showToast("success", t("common.success") || "Готово", t("account.twofaOff") || "Двухэтапный код выключен");
    await renderTwoFA();
  } catch (e) {
    showToast("error", t("common.error") || "Ошибка", "—");
  }
}

/* ===== утилиты (на случай если из app.js недоступны) ===== */
function escapeHtmlAcc(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}
function showToast(type, title, text) {
  const root = document.getElementById("toastRoot");
  if (!root) { alert(title + ": " + text); return; }
  const icons = { success: "fa-circle-check", error: "fa-circle-xmark", info: "fa-circle-info" };
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i>
    <div class="toast-body"><div class="toast-title">${escapeHtmlAcc(title)}</div><div class="toast-text">${escapeHtmlAcc(text)}</div></div>`;
  root.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3200);
}
