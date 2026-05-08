/* =========================================================
   APP.JS — главная страница (клиенты и сотрудники)
   Услуги берутся из getServices() (редактируются директором)
========================================================= */

let currentService = null;

// Состояние плавающего чата с директором (для сотрудников/бухгалтеров)
let _staffChatOpen = false;
let _staffChatDirectorLogin = null;
let _staffChatPollTimer = null;

// Сессия — заполняется в bootstrap. До этого все async-кнопки заблокированы.
let session = null;

bootstrapApp({}, function (s) {
  session = s;
  startHeartbeatLoop();
  applySettings();
  renderNav();
  renderServices();
  renderOrderHistory();
  renderSessionBanner();

  // Инициализируем чат для сотрудников/бухгалтеров (директор использует свою панель)
  if (session.role === "worker" || session.role === "accountant") {
    initStaffChat();
  }

  // Авто-обновление при изменении (storage event эмулируется firebase-sync)
  window.addEventListener("storage", e => {
    if (e.key === "kus_services_v2") renderServices();
    if (e.key === "kus_settings") applySettings();
    if (e.key === "kus_all_orders") renderOrderHistory();
    if (e.key === "kus_chats") refreshStaffChat();
    if (e.key === "kus_users") refreshArriveLeaveButtons();
  });
});

/* =========================================================
   НАСТРОЙКИ САЙТА
========================================================= */
function applySettings() {
  const s = getSettings();
  // Обновим название бренда
  document.querySelectorAll(".brand-text span").forEach(el => {
    el.textContent = s.companyName || "KOMFORT";
  });
  // Обновим телефон call-center
  const cc = document.querySelector(".call-center");
  if (cc) cc.textContent = "Call Center " + (s.callCenter || "");
  // Заголовок страницы
  if (s.companyName) document.title = `${s.companyName} — ${s.companyTagline || "Услуги"}`;
}

/* =========================================================
   НАВИГАЦИЯ ПО РОЛЯМ
========================================================= */
function renderNav() {
  const navRight = document.getElementById("navRight");
  if (!navRight) return;

  const role = session.role;

  if (role === "worker") {
    navRight.innerHTML = `
      <span class="user-chip"><i class="fa-solid fa-user"></i> ${escapeHtml(session.fullName)}</span>
      <button onclick="openTurnstile('check_in')" class="nav-button nav-button-arrive" id="navArriveBtn">
        <i class="fa-solid fa-right-to-bracket"></i><span class="btn-text">Я пришёл</span>
      </button>
      <button onclick="openTurnstile('check_out')" class="nav-button nav-button-leave" id="navLeaveBtn">
        <i class="fa-solid fa-right-from-bracket"></i><span class="btn-text">Я ушёл</span>
      </button>
      <button onclick="toggleStaffChat()" class="nav-button nav-button-chat" id="navChatBtn">
        <i class="fa-solid fa-comments"></i><span class="btn-text">Чат</span>
        <span id="navChatBadge" class="nav-chat-badge" style="display:none">0</span>
      </button>
      <button onclick="doLogout()" class="nav-button nav-button-danger">
        <i class="fa-solid fa-right-from-bracket"></i><span class="btn-text">Выйти</span>
      </button>
    `;
    refreshArriveLeaveButtons();
    return;
  }

  if (role === "accountant") {
    navRight.innerHTML = `
      <span class="user-chip"><i class="fa-solid fa-calculator"></i> ${escapeHtml(session.fullName)}</span>
      <button onclick="openTurnstile('check_in')" class="nav-button nav-button-arrive" id="navArriveBtn">
        <i class="fa-solid fa-right-to-bracket"></i><span class="btn-text">Я пришёл</span>
      </button>
      <button onclick="openTurnstile('check_out')" class="nav-button nav-button-leave" id="navLeaveBtn">
        <i class="fa-solid fa-right-from-bracket"></i><span class="btn-text">Я ушёл</span>
      </button>
      <button onclick="toggleStaffChat()" class="nav-button nav-button-chat" id="navChatBtn">
        <i class="fa-solid fa-comments"></i><span class="btn-text">Чат</span>
        <span id="navChatBadge" class="nav-chat-badge" style="display:none">0</span>
      </button>
      <button onclick="window.location.href='accountant.html'" class="nav-button">
        <i class="fa-solid fa-calculator"></i><span class="btn-text">Бухгалтер</span>
      </button>
      <button onclick="doLogout()" class="nav-button nav-button-danger">
        <i class="fa-solid fa-right-from-bracket"></i><span class="btn-text">Выйти</span>
      </button>
    `;
    refreshArriveLeaveButtons();
    return;
  }

  // Директор
  navRight.innerHTML = `
    <span class="user-chip user-chip-dir"><i class="fa-solid fa-shield-halved"></i> ${escapeHtml(session.fullName)}</span>
    <button onclick="window.location.href='director.html'" class="nav-button nav-button-dark">
      <i class="fa-solid fa-shield-halved"></i><span class="btn-text">Панель директора</span>
    </button>
    <button onclick="doLogout()" class="nav-button nav-button-danger">
      <i class="fa-solid fa-right-from-bracket"></i><span class="btn-text">Выйти</span>
    </button>
  `;
}

function renderSessionBanner() {
  const el = document.getElementById("sessionBanner");
  if (!el) return;
  const roleColor = session.role === "director" ? "var(--blue)"
                  : session.role === "accountant" ? "#0ea5e9" : "#00b87a";
  el.innerHTML = `
    <div class="session-info">
      <span class="dot" style="background:${roleColor}"></span>
      Вы вошли как <strong>${escapeHtml(session.fullName)}</strong>
      <span class="role-tag" style="border-color:${roleColor};color:${roleColor}">${roleLabel(session.role)}</span>
    </div>
  `;
}

function doLogout() {
  if (!confirm("Выйти из аккаунта?")) return;
  logout();
  window.location.href = "login.html";
}

/* =========================================================
   ТОСТЫ
========================================================= */
function showToast(type, title, text) {
  const root = document.getElementById("toastRoot");
  if (!root) return;
  const icons = { success:"fa-circle-check", error:"fa-circle-xmark", info:"fa-circle-info" };
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info}"></i>
    <div class="toast-body">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-text">${escapeHtml(text)}</div>
    </div>`;
  root.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3500);
}

/* =========================================================
   РЕНДЕР УСЛУГ (из редактируемой базы)
========================================================= */
function renderServices() {
  const grid = document.querySelector(".service-grid");
  if (!grid) return;

  const services = getActiveServices();
  grid.innerHTML = "";

  if (services.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <i class="fa-solid fa-broom"></i>
        <p>Услуги пока не добавлены. Директор может добавить их в панели управления.</p>
      </div>`;
    return;
  }

  services.forEach((s, i) => {
    const card = document.createElement("div");
    card.className = "service-card";
    card.style.setProperty("--i", i);
    const unit = s.unit || "м²";
    card.innerHTML = `
      <div class="service-icon"><i class="fa-solid ${escapeHtml(s.icon || "fa-broom")}"></i></div>
      <h3>${escapeHtml(s.title)}</h3>
      <p class="muted">${escapeHtml(s.description || "")}</p>
      <div class="service-price">${(s.price || 0).toLocaleString("ru-RU")} Сум <span style="font-size:13px;color:var(--muted);font-weight:500">/ ${escapeHtml(unit)}</span></div>
      <button class="primary" onclick="openServiceModal('${s.id}')">
        <i class="fa-solid fa-cart-shopping"></i> Заказать
      </button>
    `;
    grid.appendChild(card);
  });
}

/* =========================================================
   МОДАЛКИ ЗАКАЗА
========================================================= */
function openServiceModal(id) {
  currentService = getServiceById(id);
  if (!currentService) {
    showToast("error", "Ошибка", "Услуга не найдена");
    return;
  }
  document.getElementById("serviceTitle").textContent = currentService.title;
  document.getElementById("serviceDescription").textContent = currentService.description || "";
  document.getElementById("servicePrice").textContent = (currentService.price || 0).toLocaleString("ru-RU");
  document.getElementById("squareMeters").value = 1;
  // Подпись единицы
  const ulabel = document.getElementById("quantityLabel");
  if (ulabel) ulabel.textContent = `Количество (${currentService.unit || "м²"})`;
  updateTotalPrice();
  document.getElementById("modal").classList.add("open");
}

function closeModal() {
  document.getElementById("modal").classList.remove("open");
}

function updateTotalPrice() {
  const qty = parseInt(document.getElementById("squareMeters").value) || 1;
  const total = (currentService?.price || 0) * qty;
  document.getElementById("totalServicePrice").textContent = total.toLocaleString("ru-RU");
}

function addToOrder() {
  closeModal();
  const total = (currentService.price * (parseInt(document.getElementById("squareMeters").value) || 1));
  document.getElementById("orderService").textContent = currentService.title;
  document.getElementById("orderTotal").textContent = total.toLocaleString("ru-RU") + " Сум";

  const payBlock = document.getElementById("paymentStatusBlock");
  if (session.role === "director" || session.role === "worker") {
    payBlock.style.display = "block";
  } else {
    payBlock.style.display = "none";
  }

  document.getElementById("orderFormModal").classList.add("open");
}

function closeOrderForm() {
  document.getElementById("orderFormModal").classList.remove("open");
}

function confirmOrder() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const address = document.getElementById("address").value.trim();
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;

  if (!name || !phone || !address || !date || !time) {
    showToast("error", "Заполните все поля", "Имя, телефон, адрес, дата и время обязательны");
    return;
  }

  const qty = parseInt(document.getElementById("squareMeters").value) || 1;
  const total = currentService.price * qty;

  let payment = "unpaid";
  const payRadio = document.querySelector('input[name="payment"]:checked');
  if (payRadio && (session.role === "director" || session.role === "worker")) {
    payment = payRadio.value;
  }

  const order = {
    name, phone, address, date, time,
    serviceKey: currentService.id,
    serviceTitle: currentService.title,
    quantity: qty,
    total,
    payment,
  };

  const saved = saveOrder(order, session.login);

  if (session.role === "worker") {
    takeOrder(saved.id, session.login);
  }

  closeOrderForm();
  showToast("success", "Заказ создан", `Заказ #${saved.id.slice(-6)} (${paymentLabel(payment)})`);
  renderOrderHistory();
}

/* =========================================================
   ИСТОРИЯ ЗАКАЗОВ
========================================================= */
function renderOrderHistory() {
  const wrap = document.getElementById("orderHistory");
  if (!wrap) return;

  let orders = getAllOrders();
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  orders = orders.filter(o => new Date(o.createdAt).getTime() > dayAgo);

  if (session.role === "worker") {
    orders = orders.filter(o => !o.takenBy || o.takenBy === session.login);
  }

  if (orders.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>Пока нет заказов</p></div>`;
    return;
  }

  wrap.innerHTML = orders.map(o => {
    const payClass = o.payment === "paid" ? "pay-paid" : o.payment === "draft" ? "pay-draft" : "pay-unpaid";
    const payIcon = o.payment === "paid" ? "fa-check" : o.payment === "draft" ? "fa-pen-ruler" : "fa-xmark";
    const isWorker = session.role === "worker";
    const canTake = isWorker && !o.takenBy;
    const takenBadge = o.takenBy
      ? `<span class="badge"><i class="fa-solid fa-user-check"></i> ${escapeHtml(o.takenBy)}</span>`
      : '<span class="badge badge-free"><i class="fa-solid fa-circle-dot"></i> свободен</span>';

    return `
      <div class="order-card">
        <div class="order-card-head">
          <div>
            <div class="order-id">#${o.id.slice(-6)}</div>
            <div class="order-service">${escapeHtml(o.serviceTitle || "—")}</div>
          </div>
          <div class="pay-pill ${payClass}"><i class="fa-solid ${payIcon}"></i> ${paymentLabel(o.payment)}</div>
        </div>
        <div class="order-meta">
          <div><i class="fa-solid fa-user"></i> ${escapeHtml(o.name)}</div>
          <div><i class="fa-solid fa-phone"></i> ${escapeHtml(o.phone)}</div>
          <div><i class="fa-solid fa-location-dot"></i> ${escapeHtml(o.address)}</div>
          <div><i class="fa-solid fa-calendar"></i> ${escapeHtml(o.date)} ${escapeHtml(o.time)}</div>
        </div>
        <div class="order-card-foot">
          <strong>${(o.total || 0).toLocaleString("ru-RU")} Сум</strong>
          ${takenBadge}
          ${canTake ? `<button class="primary small" onclick="handleTakeOrder('${o.id}')"><i class="fa-solid fa-hand"></i> Взять</button>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function handleTakeOrder(orderId) {
  const res = takeOrder(orderId, session.login);
  if (!res.ok) showToast("error", "Не получилось", res.error);
  else { showToast("success", "Заказ взят", "Удачи в работе!"); renderOrderHistory(); }
}

/* =========================================================
   УТИЛИТЫ
========================================================= */
function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

document.querySelectorAll(".modal").forEach(m => {
  m.addEventListener("click", e => { if (e.target === m) m.classList.remove("open"); });
});

/* =========================================================
   ЧАТ С ДИРЕКТОРОМ (для сотрудников и бухгалтеров)
   Плавающая кнопка + окно как мессенджер
========================================================= */
function getDirectorLogin() {
  // Берём первого активного директора. Если их несколько — все сообщения от любого директора будут показаны.
  const users = getUsers();
  const dir = users.find(u => u.role === "director");
  return dir ? dir.login : null;
}

function initStaffChat() {
  _staffChatDirectorLogin = getDirectorLogin();
  const bubble = document.getElementById("chatBubble");

  // Показываем плавающую кнопку всегда (даже если директор не найден — кнопка остаётся, чтобы было видно интерфейс)
  if (bubble) {
    bubble.style.display = "flex";
  }

  // Если директора в системе нет — отключим попытку отрисовать сообщения, но интерфейс оставим
  refreshStaffChat();

  // Опрос новых сообщений каждые 3 сек (на случай если storage event не сработал — например, в одной вкладке)
  _staffChatPollTimer = setInterval(refreshStaffChat, 3000);
}

function toggleStaffChat() {
  const panel = document.getElementById("staffChatPanel");
  if (!panel) return;

  // Если директор ещё не найден — попробуем найти ещё раз
  if (!_staffChatDirectorLogin) {
    _staffChatDirectorLogin = getDirectorLogin();
  }

  _staffChatOpen = !_staffChatOpen;
  panel.style.display = _staffChatOpen ? "flex" : "none";

  if (_staffChatOpen) {
    // При открытии помечаем сообщения от директора как прочитанные
    if (_staffChatDirectorLogin) {
      markMessagesRead(session.login, _staffChatDirectorLogin);
    }
    renderStaffChatMessages();
    refreshStaffChatBadge();
    // Скролл вниз
    setTimeout(() => {
      const msgs = document.getElementById("staffChatMessages");
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
      const inp = document.getElementById("staffChatInput");
      if (inp) inp.focus();
    }, 50);
  }
}

function refreshStaffChat() {
  if (!_staffChatDirectorLogin) {
    _staffChatDirectorLogin = getDirectorLogin();
  }
  refreshStaffChatBadge();
  if (_staffChatOpen && _staffChatDirectorLogin) {
    renderStaffChatMessages();
    markMessagesRead(session.login, _staffChatDirectorLogin);
    refreshStaffChatBadge();
  }
}

function refreshStaffChatBadge() {
  const bubbleBadge = document.getElementById("chatBubbleBadge");
  const navBadge = document.getElementById("navChatBadge");
  if (!_staffChatDirectorLogin) {
    if (bubbleBadge) bubbleBadge.style.display = "none";
    if (navBadge) navBadge.style.display = "none";
    return;
  }
  const unread = getUnreadCount(session.login, _staffChatDirectorLogin);
  const display = unread > 99 ? "99+" : String(unread);
  if (unread > 0) {
    if (bubbleBadge) {
      bubbleBadge.textContent = display;
      bubbleBadge.style.display = "inline-flex";
    }
    if (navBadge) {
      navBadge.textContent = display;
      navBadge.style.display = "inline-flex";
    }
  } else {
    if (bubbleBadge) bubbleBadge.style.display = "none";
    if (navBadge) navBadge.style.display = "none";
  }
}

function renderStaffChatMessages() {
  const wrap = document.getElementById("staffChatMessages");
  if (!wrap || !_staffChatDirectorLogin) return;

  const msgs = getMessagesBetween(session.login, _staffChatDirectorLogin);

  if (msgs.length === 0) {
    wrap.innerHTML = `
      <div class="staff-chat-empty">
        <i class="fa-regular fa-comment-dots"></i>
        <p>Здесь будут сообщения от директора.<br/>Напишите первым — он получит уведомление в панели.</p>
      </div>
    `;
    return;
  }

  // Группировка по датам
  let lastDate = "";
  let html = "";
  msgs.forEach(m => {
    const d = new Date(m.timestamp);
    const dateStr = d.toLocaleDateString("ru-RU", { day:"numeric", month:"long" });
    if (dateStr !== lastDate) {
      html += `<div class="staff-chat-date">${dateStr}</div>`;
      lastDate = dateStr;
    }
    const isMe = m.from === session.login;
    const time = d.toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" });
    html += `
      <div class="staff-msg ${isMe ? "staff-msg-me" : "staff-msg-them"}">
        <div class="staff-msg-bubble">
          <div class="staff-msg-text">${escapeHtml(m.text)}</div>
          <div class="staff-msg-time">${time}${isMe && m.read ? ' <i class="fa-solid fa-check-double"></i>' : isMe ? ' <i class="fa-solid fa-check"></i>' : ''}</div>
        </div>
      </div>
    `;
  });

  wrap.innerHTML = html;
  wrap.scrollTop = wrap.scrollHeight;
}

function staffSendMessage() {
  const inp = document.getElementById("staffChatInput");
  if (!inp || !_staffChatDirectorLogin) return;
  const text = inp.value.trim();
  if (!text) return;

  sendMessage(session.login, _staffChatDirectorLogin, text);
  inp.value = "";
  renderStaffChatMessages();
  refreshStaffChatBadge();
}

/* =========================================================
   ТУРНИКЕТ — отметка прихода/ухода с фото и геолокацией
========================================================= */
let _tsType = "check_in";       // check_in | check_out
let _tsStream = null;           // активный медиапоток камеры
let _tsPhotoDataUrl = null;     // снимок (base64 jpeg)
let _tsGeo = null;              // { lat, lng, accuracy, address }
let _tsGeoLoading = false;

function refreshArriveLeaveButtons() {
  // Подсказывает что доступно — приход или уход (по последней записи)
  const arriveBtn = document.getElementById("navArriveBtn");
  const leaveBtn = document.getElementById("navLeaveBtn");
  if (!arriveBtn || !leaveBtn) return;

  const last = getLastAttendanceForUser(session.login);
  // Если последняя запись — приход в течение последних 16 часов, показываем "Уход" как активную
  if (last && last.type === "check_in") {
    const hoursSince = (Date.now() - new Date(last.timestamp).getTime()) / 3600000;
    if (hoursSince < 16) {
      arriveBtn.classList.add("nav-button-disabled");
      leaveBtn.classList.add("nav-button-pulse");
      arriveBtn.setAttribute("title", "Вы уже отметили приход сегодня");
      return;
    }
  }
  arriveBtn.classList.remove("nav-button-disabled");
  leaveBtn.classList.remove("nav-button-pulse");
  arriveBtn.removeAttribute("title");
}

function openTurnstile(type) {
  _tsType = type === "check_out" ? "check_out" : "check_in";
  _tsPhotoDataUrl = null;
  _tsGeo = null;
  _tsGeoLoading = false;

  // Заголовки
  document.getElementById("turnstileTitle").textContent =
    _tsType === "check_in" ? "Отметка прихода" : "Отметка ухода";
  document.getElementById("turnstileSubtitle").textContent =
    _tsType === "check_in"
      ? "Сделайте селфи и подтвердите место — отчёт уйдёт директору"
      : "Сделайте селфи перед уходом и подтвердите место";

  // Сбрасываем UI
  setTsStep(1);
  const video = document.getElementById("tsVideo");
  const preview = document.getElementById("tsPreview");
  const camErr = document.getElementById("tsCamError");
  const errBox = document.getElementById("tsError");
  const geoStatus = document.getElementById("tsGeoStatus");

  preview.style.display = "none";
  preview.removeAttribute("src");
  video.style.display = "block";
  camErr.style.display = "none";
  geoStatus.style.display = "none";
  errBox.style.display = "none";
  errBox.textContent = "";

  document.getElementById("tsCaptureBtn").style.display = "inline-flex";
  document.getElementById("tsRetakeBtn").style.display = "none";
  document.getElementById("tsSubmitBtn").style.display = "none";

  document.getElementById("turnstileModal").classList.add("open");

  // Запускаем камеру
  startTurnstileCamera();
}

async function startTurnstileCamera() {
  const video = document.getElementById("tsVideo");
  const camErr = document.getElementById("tsCamError");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    camErr.style.display = "flex";
    camErr.querySelector("p").textContent = "Ваш браузер не поддерживает камеру. Откройте сайт в Chrome или Safari.";
    video.style.display = "none";
    document.getElementById("tsCaptureBtn").style.display = "none";
    return;
  }

  try {
    // Просим фронтальную (selfie) камеру с разумным разрешением
    _tsStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = _tsStream;
    video.style.display = "block";
    camErr.style.display = "none";
  } catch (err) {
    console.error("Camera error:", err);
    video.style.display = "none";
    camErr.style.display = "flex";
    document.getElementById("tsCaptureBtn").style.display = "none";
  }
}

function stopTurnstileCamera() {
  if (_tsStream) {
    _tsStream.getTracks().forEach(t => t.stop());
    _tsStream = null;
  }
  const video = document.getElementById("tsVideo");
  if (video) video.srcObject = null;
}

function tsCapturePhoto() {
  const video = document.getElementById("tsVideo");
  const canvas = document.getElementById("tsCanvas");
  const preview = document.getElementById("tsPreview");
  if (!video || !video.videoWidth) {
    showToast("error", "Нет видео", "Подождите пока камера загрузится");
    return;
  }

  // Делаем снимок в квадрат
  const size = Math.min(video.videoWidth, video.videoHeight);
  const sx = (video.videoWidth - size) / 2;
  const sy = (video.videoHeight - size) / 2;
  canvas.width = 480;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");

  // Зеркалим (как в селфи), чтобы фото выглядело так же как на видео
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  _tsPhotoDataUrl = canvas.toDataURL("image/jpeg", 0.78);

  // Показываем превью, останавливаем поток
  preview.src = _tsPhotoDataUrl;
  preview.style.display = "block";
  video.style.display = "none";
  stopTurnstileCamera();

  document.getElementById("tsCaptureBtn").style.display = "none";
  document.getElementById("tsRetakeBtn").style.display = "inline-flex";
  document.getElementById("tsSubmitBtn").style.display = "inline-flex";

  setTsStep(2);
  // Сразу запрашиваем геолокацию
  fetchTurnstileGeo();
}

function tsRetakePhoto() {
  _tsPhotoDataUrl = null;
  _tsGeo = null;
  const video = document.getElementById("tsVideo");
  const preview = document.getElementById("tsPreview");
  preview.style.display = "none";
  preview.removeAttribute("src");
  video.style.display = "block";

  document.getElementById("tsCaptureBtn").style.display = "inline-flex";
  document.getElementById("tsRetakeBtn").style.display = "none";
  document.getElementById("tsSubmitBtn").style.display = "none";
  document.getElementById("tsGeoStatus").style.display = "none";
  document.getElementById("tsError").style.display = "none";

  setTsStep(1);
  startTurnstileCamera();
}

function setTsStep(n) {
  document.querySelectorAll(".ts-step").forEach(el => {
    const step = parseInt(el.dataset.step, 10);
    el.classList.toggle("ts-step-active", step === n);
    el.classList.toggle("ts-step-done", step < n);
  });
}

function fetchTurnstileGeo() {
  const status = document.getElementById("tsGeoStatus");
  const title = document.getElementById("tsGeoTitle");
  const sub = document.getElementById("tsGeoSub");
  status.style.display = "flex";
  status.classList.remove("ts-geo-ok", "ts-geo-err");
  title.textContent = "Определяем местоположение...";
  sub.textContent = "Нажмите «Разрешить» во всплывающем окне браузера";
  _tsGeoLoading = true;

  if (!navigator.geolocation) {
    _tsGeoLoading = false;
    status.classList.add("ts-geo-err");
    title.textContent = "Геолокация недоступна";
    sub.textContent = "Можно отправить отчёт без координат";
    _tsGeo = null;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = pos.coords.accuracy;
      _tsGeo = { lat, lng, accuracy: acc, address: null };

      title.textContent = `Координаты получены (точность ~${Math.round(acc)} м)`;
      sub.textContent = "Определяем адрес...";

      // Reverse geocoding через бесплатный OpenStreetMap Nominatim
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=ru`;
        const resp = await fetch(url, { headers: { "Accept": "application/json" } });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.display_name) {
            _tsGeo.address = data.display_name;
            sub.textContent = data.display_name;
          } else {
            sub.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          }
        } else {
          sub.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
      } catch (e) {
        sub.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }

      status.classList.add("ts-geo-ok");
      setTsStep(3);
      _tsGeoLoading = false;
    },
    err => {
      console.warn("Geo error:", err);
      _tsGeoLoading = false;
      status.classList.add("ts-geo-err");
      title.textContent = "Не удалось определить место";
      let msg = "Можно отправить отчёт без координат, но директору будет сложнее проверить.";
      if (err.code === 1) msg = "Доступ к геолокации запрещён. Разрешите в настройках браузера.";
      else if (err.code === 3) msg = "Превышено время ожидания. Попробуйте ещё раз или отправьте без координат.";
      sub.textContent = msg;
      _tsGeo = null;
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function tsSubmit() {
  const errBox = document.getElementById("tsError");
  errBox.style.display = "none";
  errBox.textContent = "";

  if (!_tsPhotoDataUrl) {
    errBox.textContent = "Сначала сделайте снимок";
    errBox.style.display = "block";
    return;
  }
  if (_tsGeoLoading) {
    errBox.textContent = "Подождите — определяем местоположение...";
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
    errBox.textContent = res.error || "Не удалось сохранить отчёт";
    errBox.style.display = "block";
    return;
  }

  closeTurnstile();
  showToast(
    "success",
    _tsType === "check_in" ? "Приход отмечен" : "Уход отмечен",
    "Отчёт отправлен директору"
  );
  refreshArriveLeaveButtons();
}

function closeTurnstile() {
  stopTurnstileCamera();
  document.getElementById("turnstileModal").classList.remove("open");
  _tsPhotoDataUrl = null;
  _tsGeo = null;
}
