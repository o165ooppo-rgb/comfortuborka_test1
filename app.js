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

  // Работник не должен видеть главную с услугами — у него отдельная страница
  if (session.role === "worker") {
    window.location.href = "worker.html";
    return;
  }

  startHeartbeatLoop();
  applySettings();
  renderNav();
  renderServices();
  renderOrderHistory();
  renderSessionBanner();

  // Инициализируем чат для бухгалтеров (директор использует свою панель)
  if (session.role === "accountant") {
    initStaffChat();
    initMyTasks();
  }

  // Авто-обновление при изменении (storage event эмулируется firebase-sync)
  window.addEventListener("storage", e => {
    if (e.key === "kus_services_v2") renderServices();
    if (e.key === "kus_settings") applySettings();
    if (e.key === "kus_all_orders") renderOrderHistory();
    if (e.key === "kus_chats") refreshStaffChat();
    if (e.key === "kus_users") refreshArriveLeaveButtons();
    if (e.key === "kus_tasks" && session.role === "accountant") {
      renderMyTasks();
      refreshMyTasksBadge();
    }
  });

  // Перерисовка интерфейса при смене языка
  window.addEventListener("lang-changed", () => {
    applyI18n();
    renderNav();
    renderServices();
    renderOrderHistory();
    renderSessionBanner();
    applySettings();
    if (session.role === "accountant") renderMyTasks();
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
  if (cc) cc.textContent = t("brand.callcenter") + " " + (s.callCenter || "");
  // Заголовок страницы
  if (s.companyName) document.title = `${s.companyName} — ${s.companyTagline || t("services.title")}`;
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
        <i class="fa-solid fa-right-to-bracket"></i><span class="btn-text">${t("nav.arrive")}</span>
      </button>
      <button onclick="openTurnstile('check_out')" class="nav-button nav-button-leave" id="navLeaveBtn">
        <i class="fa-solid fa-right-from-bracket"></i><span class="btn-text">${t("nav.leave")}</span>
      </button>
      <button onclick="toggleStaffChat()" class="nav-button nav-button-chat" id="navChatBtn">
        <i class="fa-solid fa-comments"></i><span class="btn-text">${t("nav.chat")}</span>
        <span id="navChatBadge" class="nav-chat-badge" style="display:none">0</span>
      </button>
      <button onclick="doLogout()" class="nav-button nav-button-danger">
        <i class="fa-solid fa-right-from-bracket"></i><span class="btn-text">${t("nav.logout")}</span>
      </button>
    `;
    refreshArriveLeaveButtons();
    return;
  }

  if (role === "accountant") {
    navRight.innerHTML = `
      <span class="user-chip"><i class="fa-solid fa-calculator"></i> ${escapeHtml(session.fullName)}</span>
      <button onclick="openTurnstile('check_in')" class="nav-button nav-button-arrive" id="navArriveBtn">
        <i class="fa-solid fa-right-to-bracket"></i><span class="btn-text">${t("nav.arrive")}</span>
      </button>
      <button onclick="openTurnstile('check_out')" class="nav-button nav-button-leave" id="navLeaveBtn">
        <i class="fa-solid fa-right-from-bracket"></i><span class="btn-text">${t("nav.leave")}</span>
      </button>
      <button onclick="toggleStaffChat()" class="nav-button nav-button-chat" id="navChatBtn">
        <i class="fa-solid fa-comments"></i><span class="btn-text">${t("nav.chat")}</span>
        <span id="navChatBadge" class="nav-chat-badge" style="display:none">0</span>
      </button>
      <button onclick="window.location.href='accountant.html'" class="nav-button">
        <i class="fa-solid fa-calculator"></i><span class="btn-text">${t("nav.accountant")}</span>
      </button>
      <button onclick="doLogout()" class="nav-button nav-button-danger">
        <i class="fa-solid fa-right-from-bracket"></i><span class="btn-text">${t("nav.logout")}</span>
      </button>
    `;
    refreshArriveLeaveButtons();
    return;
  }

  // Директор
  navRight.innerHTML = `
    <span class="user-chip user-chip-dir"><i class="fa-solid fa-shield-halved"></i> ${escapeHtml(session.fullName)}</span>
    <button onclick="window.location.href='director.html'" class="nav-button nav-button-dark">
      <i class="fa-solid fa-shield-halved"></i><span class="btn-text">${t("nav.directorPanel")}</span>
    </button>
    <button onclick="doLogout()" class="nav-button nav-button-danger">
      <i class="fa-solid fa-right-from-bracket"></i><span class="btn-text">${t("nav.logout")}</span>
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
      ${t("session.loggedAs")} <strong>${escapeHtml(session.fullName)}</strong>
      <span class="role-tag" style="border-color:${roleColor};color:${roleColor}">${roleLabel(session.role)}</span>
    </div>
  `;
}

function doLogout() {
  if (!confirm(t("session.logoutConfirm"))) return;
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
   РЕНДЕР УСЛУГ (без цены)
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
        <p>${escapeHtml(t("services.empty"))}</p>
      </div>`;
    return;
  }

  services.forEach((s, i) => {
    const card = document.createElement("div");
    card.className = "service-card service-card-simple";
    card.style.setProperty("--i", i);
    const title = tService(s, "title");
    const description = tService(s, "description");
    card.innerHTML = `
      <div class="service-icon"><i class="fa-solid ${escapeHtml(s.icon || "fa-broom")}"></i></div>
      <h3>${escapeHtml(title)}</h3>
      <p class="muted">${escapeHtml(description)}</p>
      <button class="primary" onclick="openOrderForm('${s.id}')">
        <i class="fa-solid fa-cart-shopping"></i> ${t("services.order")}
      </button>
    `;
    grid.appendChild(card);
  });
}

/* =========================================================
   ОФОРМЛЕНИЕ ЗАКАЗА (новая логика — без модалки услуги)
========================================================= */
function canCreateOrder() {
  return session && (session.role === "director" || session.role === "accountant");
}

function openOrderForm(serviceId) {
  currentService = getServiceById(serviceId);
  if (!currentService) {
    showToast("error", t("common.error"), t("dir.att.notFound"));
    return;
  }

  // Только директор / бухгалтер могут оформлять заказы
  if (!canCreateOrder()) {
    showToast("error", t("common.error"), t("order.errNotAllowed"));
    return;
  }

  // Сброс полей
  document.getElementById("name").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("address").value = "";
  document.getElementById("orderPrice").value = "";
  document.getElementById("orderAdvance").value = "";
  document.getElementById("orderRemaining").textContent = "0 " + t("services.currency");
  document.getElementById("orderError").style.display = "none";
  document.getElementById("addressStatus").style.display = "none";

  // Авто-заполнение даты/времени
  const now = new Date();
  document.getElementById("date").value = now.toISOString().slice(0, 10);
  document.getElementById("time").value = now.toTimeString().slice(0, 5);

  // Подпись услуги
  document.getElementById("orderFormService").textContent = tService(currentService, "title");

  // Блоки оплаты — только директор/бухгалтер
  document.getElementById("paymentStatusBlock").style.display = "block";
  document.getElementById("orderPriceInfo").style.display = "none";

  // Слушаем изменение цены/аванса для пересчёта "к доплате"
  document.getElementById("orderPrice").oninput = updateRemaining;
  document.getElementById("orderAdvance").oninput = updateRemaining;

  // По умолчанию unpaid
  const unpaidRadio = document.querySelector('input[name="payment"][value="unpaid"]');
  if (unpaidRadio) unpaidRadio.checked = true;

  applyI18n();
  document.getElementById("orderFormModal").classList.add("open");

  // Авто-запуск определения адреса
  orderDetectLocation();
}

function closeOrderForm() {
  document.getElementById("orderFormModal").classList.remove("open");
}

function updateRemaining() {
  const price = parseInt(document.getElementById("orderPrice").value) || 0;
  const advance = parseInt(document.getElementById("orderAdvance").value) || 0;
  const remaining = Math.max(0, price - advance);
  document.getElementById("orderRemaining").textContent =
    remaining.toLocaleString("ru-RU") + " " + t("services.currency");
}

/* ===== Геолокация для адреса заказа ===== */
let _orderGeo = null;

function orderDetectLocation() {
  const statusEl = document.getElementById("addressStatus");
  const addressInput = document.getElementById("address");
  const btn = document.getElementById("addressDetectBtn");

  if (!navigator.geolocation) {
    statusEl.style.display = "flex";
    statusEl.className = "address-status address-status-err";
    statusEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${t("order.locationFail")}`;
    return;
  }

  statusEl.style.display = "flex";
  statusEl.className = "address-status address-status-loading";
  statusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t("order.locating")}`;
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      _orderGeo = { lat, lng, accuracy: pos.coords.accuracy };
      try {
        const lang = getCurrentLang();
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=${lang}`;
        const resp = await fetch(url, { headers: { "Accept": "application/json" } });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.display_name) {
            addressInput.value = data.display_name;
            _orderGeo.address = data.display_name;
            statusEl.className = "address-status address-status-ok";
            statusEl.innerHTML = `<i class="fa-solid fa-check"></i> ${escapeHtml(data.display_name)}`;
            btn.disabled = false;
            return;
          }
        }
        // Если адрес не найден — координаты
        addressInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        statusEl.className = "address-status address-status-ok";
        statusEl.innerHTML = `<i class="fa-solid fa-check"></i> ${addressInput.value}`;
      } catch (e) {
        addressInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        statusEl.className = "address-status address-status-ok";
        statusEl.innerHTML = `<i class="fa-solid fa-check"></i> ${addressInput.value}`;
      }
      btn.disabled = false;
    },
    err => {
      console.warn("Order geo error:", err);
      _orderGeo = null;
      statusEl.className = "address-status address-status-err";
      statusEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${t("order.locationFail")}`;
      btn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

function confirmOrder() {
  const errEl = document.getElementById("orderError");
  errEl.style.display = "none";

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const address = document.getElementById("address").value.trim();
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;

  if (!name || !phone || !address || !date || !time) {
    errEl.style.display = "block";
    errEl.textContent = t("order.errFieldsDesc");
    return;
  }

  if (!canCreateOrder()) {
    errEl.style.display = "block";
    errEl.textContent = t("order.errNotAllowed");
    return;
  }

  const price = parseInt(document.getElementById("orderPrice").value) || 0;
  const advanceStr = document.getElementById("orderAdvance").value;
  const advance = advanceStr === "" ? -1 : parseInt(advanceStr);

  if (price <= 0) {
    errEl.style.display = "block";
    errEl.textContent = t("order.errPrice");
    return;
  }
  if (advance < 0) {
    errEl.style.display = "block";
    errEl.textContent = t("order.errAdvance");
    return;
  }
  if (advance > price) {
    errEl.style.display = "block";
    errEl.textContent = t("order.errAdvanceHigh");
    return;
  }

  let payment = "unpaid";
  const payRadio = document.querySelector('input[name="payment"]:checked');
  if (payRadio) payment = payRadio.value;

  const order = {
    name, phone, address, date, time,
    serviceKey: currentService.id,
    serviceTitle: tService(currentService, "title"),
    serviceTitleRu: currentService.titleRu || currentService.title || "",
    serviceTitleUz: currentService.titleUz || currentService.title || "",
    serviceTitleEn: currentService.titleEn || currentService.title || "",
    price,
    advance,
    total: price,                // для обратной совместимости
    remaining: Math.max(0, price - advance),
    payment,
    geo: _orderGeo ? { lat: _orderGeo.lat, lng: _orderGeo.lng, accuracy: _orderGeo.accuracy } : null,
  };

  const saved = saveOrder(order, session.login);
  closeOrderForm();
  showToast("success", t("order.created"), `#${saved.id.slice(-6)} (${paymentLabel(payment)})`);
  renderOrderHistory();
  _orderGeo = null;
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
    wrap.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>${escapeHtml(t("order.empty"))}</p></div>`;
    return;
  }

  wrap.innerHTML = orders.map(o => {
    const payClass = o.payment === "paid" ? "pay-paid" : o.payment === "draft" ? "pay-draft" : "pay-unpaid";
    const payIcon = o.payment === "paid" ? "fa-check" : o.payment === "draft" ? "fa-pen-ruler" : "fa-xmark";
    const isWorker = session.role === "worker";
    const canTake = isWorker && !o.takenBy;
    const takenBadge = o.takenBy
      ? `<span class="badge"><i class="fa-solid fa-user-check"></i> ${escapeHtml(o.takenBy)}</span>`
      : `<span class="badge badge-free"><i class="fa-solid fa-circle-dot"></i> ${t("order.free")}</span>`;

    // Заголовок: пытаемся взять перевод услуги если есть
    let serviceTitle = o.serviceTitle || "—";
    const lang = getCurrentLang();
    if (lang === "ru" && o.serviceTitleRu) serviceTitle = o.serviceTitleRu;
    else if (lang === "uz" && o.serviceTitleUz) serviceTitle = o.serviceTitleUz;
    else if (lang === "en" && o.serviceTitleEn) serviceTitle = o.serviceTitleEn;

    const price = o.price || o.total || 0;
    const advance = o.advance || 0;
    const remaining = Math.max(0, price - advance);

    return `
      <div class="order-card">
        <div class="order-card-head">
          <div>
            <div class="order-id">#${o.id.slice(-6)}</div>
            <div class="order-service">${escapeHtml(serviceTitle)}</div>
          </div>
          <div class="pay-pill ${payClass}"><i class="fa-solid ${payIcon}"></i> ${paymentLabel(o.payment)}</div>
        </div>
        <div class="order-meta">
          <div><i class="fa-solid fa-user"></i> ${escapeHtml(o.name)}</div>
          <div><i class="fa-solid fa-phone"></i> ${escapeHtml(o.phone)}</div>
          <div><i class="fa-solid fa-location-dot"></i> ${escapeHtml(o.address)}</div>
          <div><i class="fa-solid fa-calendar"></i> ${escapeHtml(o.date)} ${escapeHtml(o.time)}</div>
        </div>
        <div class="order-card-money">
          <div class="order-money-item">
            <span class="muted">${t("receipt.price")}</span>
            <strong>${price.toLocaleString("ru-RU")}</strong>
          </div>
          <div class="order-money-item">
            <span class="muted">${t("receipt.advance")}</span>
            <strong>${advance.toLocaleString("ru-RU")}</strong>
          </div>
          <div class="order-money-item order-money-remaining">
            <span class="muted">${t("receipt.remaining")}</span>
            <strong>${remaining.toLocaleString("ru-RU")}</strong>
          </div>
        </div>
        <div class="order-card-foot">
          ${takenBadge}
          <div class="order-card-actions">
            <button class="ghost-btn small" onclick="openReceipt('${o.id}')">
              <i class="fa-solid fa-receipt"></i> ${t("receipt.show")}
            </button>
            ${canTake ? `<button class="primary small" onclick="handleTakeOrder('${o.id}')"><i class="fa-solid fa-hand"></i> ${t("order.take")}</button>` : ""}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function handleTakeOrder(orderId) {
  const res = takeOrder(orderId, session.login);
  if (!res.ok) showToast("error", t("order.takeFail"), res.error);
  else { showToast("success", t("order.taken"), t("order.takeOk")); renderOrderHistory(); }
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
    _tsType === "check_in" ? t("ts.checkInTitle") : t("ts.checkOutTitle");
  document.getElementById("turnstileSubtitle").textContent =
    _tsType === "check_in" ? t("ts.checkInDesc") : t("ts.checkOutDesc");

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
    camErr.querySelector("p").textContent = t("ts.camNotSupported");
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
    showToast("error", t("ts.errNoVideo"), t("ts.errNoVideoDesc"));
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
  title.textContent = t("ts.geoLocating");
  sub.textContent = t("ts.geoAllow");
  _tsGeoLoading = true;

  if (!navigator.geolocation) {
    _tsGeoLoading = false;
    status.classList.add("ts-geo-err");
    title.textContent = t("ts.geoUnavailable");
    sub.textContent = t("ts.geoFailDesc");
    _tsGeo = null;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = pos.coords.accuracy;
      _tsGeo = { lat, lng, accuracy: acc, address: null };

      title.textContent = t("ts.geoOk", { acc: Math.round(acc) });
      sub.textContent = t("ts.geoFindingAddr");

      // Reverse geocoding через бесплатный OpenStreetMap Nominatim
      try {
        const lang = (typeof getCurrentLang === "function") ? getCurrentLang() : "ru";
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=${lang}`;
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
      title.textContent = t("ts.geoFail");
      let msg = t("ts.geoFailDesc");
      if (err.code === 1) msg = t("ts.geoDenied");
      else if (err.code === 3) msg = t("ts.geoTimeout");
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
    errBox.textContent = res.error || t("ts.errSave");
    errBox.style.display = "block";
    return;
  }

  closeTurnstile();
  showToast(
    "success",
    _tsType === "check_in" ? t("ts.successIn") : t("ts.successOut"),
    t("ts.successDesc")
  );
  refreshArriveLeaveButtons();
}

function closeTurnstile() {
  stopTurnstileCamera();
  document.getElementById("turnstileModal").classList.remove("open");
  _tsPhotoDataUrl = null;
  _tsGeo = null;
}

/* =========================================================
   ЧЕК ЗАКАЗА
========================================================= */
let _currentReceiptOrderId = null;

function openReceipt(orderId) {
  const order = getAllOrders().find(o => o.id === orderId);
  if (!order) {
    showToast("error", t("common.error"), t("dir.att.notFound"));
    return;
  }
  _currentReceiptOrderId = orderId;
  document.getElementById("receiptBody").innerHTML = buildReceiptHtml(order);

  // Кнопка отправки сотруднику — только для директора/бухгалтера
  const sendBtn = document.getElementById("receiptSendBtn");
  if (sendBtn) {
    sendBtn.style.display = canCreateOrder() ? "inline-flex" : "none";
  }

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
  if (order.payment === "paid") {
    payLabel = t("receipt.paid"); payColor = "#00b87a";
  } else if (order.payment === "draft") {
    payLabel = t("receipt.draft"); payColor = "#f59e0b";
  } else {
    payLabel = t("receipt.unpaid"); payColor = "#ef4444";
  }

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

      <div class="receipt-status" style="background:${payColor}">
        ${payLabel}
      </div>

      <div class="receipt-foot">
        <p>${t("receipt.thanks")}</p>
      </div>
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

/* ===== Отправка чека сотруднику ===== */
function openSendReceiptModal() {
  if (!_currentReceiptOrderId) return;
  const users = getUsers().filter(u => u.role === "worker" || u.role === "accountant");
  const list = document.getElementById("receiptStaffList");

  if (users.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>${escapeHtml(t("receipt.noStaff"))}</p></div>`;
  } else {
    list.innerHTML = users.map(u => `
      <label class="staff-pick-item">
        <input type="checkbox" class="staff-pick-cb" data-login="${escapeHtml(u.login)}"/>
        <div class="staff-pick-avatar"><i class="fa-solid ${u.role === 'accountant' ? 'fa-calculator' : 'fa-user'}"></i></div>
        <div class="staff-pick-info">
          <div class="staff-pick-name">${escapeHtml(u.fullName || u.login)}</div>
          <div class="staff-pick-role muted">${roleLabel(u.role)}</div>
        </div>
        <i class="fa-solid fa-check staff-pick-check"></i>
      </label>
    `).join("");
  }

  document.getElementById("sendReceiptModal").classList.add("open");
}

function closeSendReceiptModal() {
  document.getElementById("sendReceiptModal").classList.remove("open");
}

function sendReceiptToStaff() {
  if (!_currentReceiptOrderId) return;
  const checked = document.querySelectorAll("#receiptStaffList .staff-pick-cb:checked");
  if (checked.length === 0) {
    showToast("error", t("common.error"), t("dir.tasks.errNobody"));
    return;
  }
  const toLogins = Array.from(checked).map(cb => cb.dataset.login);
  const order = getAllOrders().find(o => o.id === _currentReceiptOrderId);
  if (!order) return;

  const lang = getCurrentLang();
  let serviceTitle = order.serviceTitle || "—";
  if (lang === "ru" && order.serviceTitleRu) serviceTitle = order.serviceTitleRu;
  else if (lang === "uz" && order.serviceTitleUz) serviceTitle = order.serviceTitleUz;
  else if (lang === "en" && order.serviceTitleEn) serviceTitle = order.serviceTitleEn;

  const price = order.price || order.total || 0;

  const taskText = `${t("receipt.chatLabel")}\n\n${t("receipt.service")}: ${serviceTitle}\n${t("receipt.client")}: ${order.name}\n${t("receipt.phone")}: ${order.phone}\n${t("receipt.address")}: ${order.address}\n${t("receipt.scheduled")}: ${order.date} ${order.time}\n${t("receipt.price")}: ${price.toLocaleString("ru-RU")} ${t("services.currency")}`;

  const res = createTask(taskText, session.login, toLogins, { receiptOrderId: order.id });
  if (!res.ok) {
    showToast("error", t("common.error"), res.error || "");
    return;
  }
  closeSendReceiptModal();
  closeReceipt();
  showToast("success", t("receipt.sent"), t("receipt.sentTo", { n: toLogins.length }));
}

/* =========================================================
   МОИ ЗАДАНИЯ (сотрудник)
========================================================= */
let _myTasksOpen = false;

function initMyTasks() {
  const bubble = document.getElementById("myTasksBubble");
  if (bubble) bubble.style.display = "flex";
  renderMyTasks();
  refreshMyTasksBadge();
  // обновлять каждые 5 сек
  setInterval(refreshMyTasksBadge, 5000);
}

function refreshMyTasksBadge() {
  const badge = document.getElementById("myTasksBadge");
  if (!badge) return;
  const n = countNewTasksForUser(session.login);
  if (n > 0) {
    badge.textContent = n;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
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
  }
}
