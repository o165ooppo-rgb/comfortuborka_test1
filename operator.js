/* =========================================================
   OPERATOR.JS — рабочее место оператора
   Только: список сотрудников + чат с фото. Ничего больше.
========================================================= */

let opSession = null;
let _opActiveLogin = null;       // с кем сейчас открыт диалог
let _opPollTimer = null;

/* Экранирование HTML (на этой странице app.js не подключён) */
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

bootstrapApp({ allowedRoles: ["operator"] }, function (s) {
  opSession = s;
  applyI18n();

  const chip = document.getElementById("opUserChip");
  if (chip) chip.textContent = s.fullName || s.login;

  opRenderList();
  _opPollTimer = setInterval(opTick, 3000);

  // обновляемся, когда чаты/сотрудники прилетели с другого устройства
  window.addEventListener("storage", (e) => {
    if (e.key === "kus_chats" || e.key === "kus_users") opTick();
  });
  window.addEventListener("lang-changed", () => { applyI18n(); opRenderList(); if (_opActiveLogin) opRenderMessages(); });

  // логотип компании, если задан
  (async function () {
    if (window.FB && !window.FB.isReady()) { try { await window.FB.waitReady(); } catch (e) {} }
    try { applyCompanyLogo(); } catch (e) {}
  })();
});

function opLogout() {
  (async () => {
    try { if (typeof deleteCurrentDevice === "function") await deleteCurrentDevice(); } catch (e) {}
    try { logout(); } catch (e) {}
    try { if (window.sb && window.sb.auth) await window.sb.auth.signOut(); } catch (e) {}
    window.location.href = "login.html";
  })();
}

/* Сотрудники, которых обслуживает оператор */
function opEmployees() {
  return getUsers().filter(u => u.role === "worker" || u.role === "supervisor");
}

function opTick() {
  opRenderList();
  if (_opActiveLogin) opRenderMessages();
}

/* === Список сотрудников (как список чатов) === */
function opRenderList() {
  const box = document.getElementById("opList");
  if (!box) return;
  const q = (document.getElementById("opSearch")?.value || "").toLowerCase().trim();
  let users = opEmployees();
  if (q) users = users.filter(u => (u.fullName || u.login).toLowerCase().includes(q) || u.login.toLowerCase().includes(q));

  // сортируем: сначала с непрочитанными, потом по последнему сообщению
  const enriched = users.map(u => {
    const msgs = getMessagesBetween(opSession.login, u.login);
    const last = msgs[msgs.length - 1];
    const unread = getUnreadCount(opSession.login, u.login);
    return { u, last, unread, lastTs: last ? new Date(last.timestamp || last.createdAt).getTime() : 0 };
  }).sort((a, b) => (b.unread > 0) - (a.unread > 0) || b.lastTs - a.lastTs);

  if (enriched.length === 0) {
    box.innerHTML = `<div class="op-empty muted">${escapeHtml(t("op.noEmployees") || "Сотрудников пока нет")}</div>`;
    return;
  }

  box.innerHTML = enriched.map(({ u, last, unread }) => {
    const initials = (u.fullName || u.login).slice(0, 2).toUpperCase();
    const av = u.avatar
      ? `<img src="${escapeHtml(u.avatar)}" class="op-li-av" alt=""/>`
      : `<div class="op-li-av op-li-av-empty">${escapeHtml(initials)}</div>`;
    let preview = t("op.noMessages") || "Нет сообщений";
    if (last) preview = last.image ? "📷 " + (t("op.photo") || "Фото") : last.text;
    const online = isOnline(u.login);
    const active = u.login === _opActiveLogin ? "op-li-active" : "";
    return `
      <button class="op-li ${active}" onclick="opOpen('${escapeHtml(u.login)}')">
        <div class="op-li-av-wrap">${av}${online ? '<span class="online-dot"></span>' : ''}</div>
        <div class="op-li-main">
          <div class="op-li-name">${escapeHtml(u.fullName || u.login)}</div>
          <div class="op-li-preview muted">${escapeHtml((preview || "").slice(0, 38))}</div>
        </div>
        ${unread > 0 ? `<span class="op-li-badge">${unread}</span>` : ''}
      </button>`;
  }).join("");
}

/* === Открыть диалог === */
function opOpen(login) {
  _opActiveLogin = login;
  const u = getUsers().find(x => x.login === login);

  document.getElementById("opThreadEmpty").style.display = "none";
  document.getElementById("opThread").style.display = "flex";
  document.body.classList.add("op-thread-open");   // мобильный режим: показать диалог

  const nameEl = document.getElementById("opThreadName");
  const subEl = document.getElementById("opThreadSub");
  const avEl = document.getElementById("opThreadAv");
  if (nameEl) nameEl.textContent = u ? (u.fullName || u.login) : login;
  if (subEl) subEl.textContent = isOnline(login) ? (t("common.online") || "в сети") : (t("op.offline") || "не в сети");
  if (avEl) {
    const initials = (u?.fullName || login).slice(0, 2).toUpperCase();
    avEl.innerHTML = u?.avatar ? `<img src="${escapeHtml(u.avatar)}" alt=""/>` : escapeHtml(initials);
  }

  markMessagesRead(opSession.login, login);
  opRenderMessages();
  opRenderList();
}

function opCloseThread() {
  document.body.classList.remove("op-thread-open");
  _opActiveLogin = null;
  document.getElementById("opThread").style.display = "none";
  document.getElementById("opThreadEmpty").style.display = "flex";
  opRenderList();
}

function opRenderMessages() {
  const wrap = document.getElementById("opMessages");
  if (!wrap || !_opActiveLogin) return;
  const messages = getMessagesBetween(opSession.login, _opActiveLogin);
  markMessagesRead(opSession.login, _opActiveLogin);

  if (messages.length === 0) {
    wrap.innerHTML = `<div class="staff-chat-empty"><i class="fa-regular fa-comments"></i><p>${escapeHtml(t("op.startHint") || "Начните переписку — ответьте сотруднику на его вопрос.")}</p></div>`;
    return;
  }
  const lang = getCurrentLang();
  wrap.innerHTML = messages.map(m => {
    const mine = m.from === opSession.login;
    const ts = m.timestamp || m.createdAt;
    const time = new Date(ts).toLocaleTimeString(lang === "uz" ? "uz-UZ" : (lang === "en" ? "en-US" : "ru-RU"), { hour: "2-digit", minute: "2-digit" });
    let body = "";
    if (m.image) body += `<img class="msg-photo" data-imgpath="${escapeHtml(m.image)}" alt="фото" style="display:none"/><div class="msg-photo-loading" data-imgloading="${escapeHtml(m.image)}"><i class="fa-solid fa-image"></i></div>`;
    if (m.text) body += `<div class="msg-text">${escapeHtml(m.text).replace(/\n/g, "<br>")}</div>`;
    return `<div class="msg ${mine ? "msg-mine" : "msg-theirs"}"><div class="msg-bubble">${body}</div><div class="msg-time muted">${escapeHtml(time)}</div></div>`;
  }).join("");
  opHydrateImages(wrap);
  setTimeout(() => { wrap.scrollTop = wrap.scrollHeight; }, 10);
}

async function opHydrateImages(root) {
  const imgs = root.querySelectorAll("img[data-imgpath]");
  for (const img of imgs) {
    const path = img.getAttribute("data-imgpath");
    if (!path || img.src) continue;
    const url = (typeof getChatImageUrl === "function") ? await getChatImageUrl(path) : null;
    if (url) {
      img.src = url; img.style.display = "block";
      img.onclick = () => window.open(url, "_blank");
      const loader = root.querySelector(`[data-imgloading="${CSS.escape(path)}"]`);
      if (loader) loader.style.display = "none";
    }
  }
}

function opSend() {
  const input = document.getElementById("opInput");
  if (!input || !_opActiveLogin) return;
  const text = input.value.trim();
  if (!text) return;
  sendMessage(opSession.login, _opActiveLogin, text);
  input.value = "";
  opRenderMessages();
  opRenderList();
}

async function opSendPhoto(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if (!file || !_opActiveLogin) return;
  if (!file.type.startsWith("image/")) { showToast("error", t("common.error"), "Только изображения"); return; }
  if (file.size > 12 * 1024 * 1024) { showToast("error", t("common.error"), "Фото слишком большое"); return; }
  showToast("info", t("op.sending") || "Отправка…", t("op.photoUploading") || "Загружаю фото…");
  const key = chatKey(opSession.login, _opActiveLogin);
  const path = (typeof uploadChatImage === "function") ? await uploadChatImage(file, key) : null;
  if (!path) { showToast("error", t("common.error"), t("op.photoFail") || "Не удалось отправить фото"); return; }
  sendMessage(opSession.login, _opActiveLogin, "", path);
  opRenderMessages();
  opRenderList();
}

/* Тосты (на случай если из app.js недоступны) */
function showToast(type, title, text) {
  const root = document.getElementById("toastRoot");
  if (!root) return;
  const icons = { success: "fa-circle-check", error: "fa-circle-xmark", info: "fa-circle-info" };
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><div class="toast-body"><div class="toast-title">${escapeHtml(title)}</div><div class="toast-text">${escapeHtml(text)}</div></div>`;
  root.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3000);
}
