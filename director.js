/* =========================================================
   DIRECTOR.JS — Панель директора
   Управление: услуги, сотрудники, чат, заказы, клиенты, логи
========================================================= */

let dirSession = null;
let activeTab = "dashboard";
let chatPartner = null;
let chatRefreshInterval = null;
let dashboardRefreshInterval = null;
let currentOrdersFilter = "all";
let editingServiceId = null;

bootstrapApp({ allowedRoles: ["director"] }, function (s) {
  dirSession = s;
  startHeartbeatLoop();
  initDirector();
});

function initDirector() {
  document.getElementById("dirUserName").textContent = dirSession.fullName;

  // Табы
  document.querySelectorAll(".dir-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Фильтры заказов
  document.querySelectorAll(".filters .chip-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filters .chip-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentOrdersFilter = btn.dataset.filter;
      renderDirOrders();
    });
  });

  // Стартовый рендер
  renderDashboard();
  startDashboardRefresh();

  // Слушаем обновления из других вкладок
  window.addEventListener("storage", e => {
    if (activeTab === "dashboard") renderDashboard();
    if (activeTab === "employees" && e.key === "kus_users") renderEmployees();
    if (activeTab === "chat" && e.key === "kus_chats") {
      renderChatList();
      if (chatPartner) renderChatMessages();
    }
    if (activeTab === "orders" && e.key === "kus_all_orders") renderDirOrders();
    if (activeTab === "clients" && e.key === "kus_clients_db") renderClients();
    if (activeTab === "services" && e.key === "kus_services_v2") renderServicesEditor();
    if (activeTab === "attendance" && e.key === "kus_attendance") renderAttendance();
    if (activeTab === "logs" && e.key === "kus_action_logs") renderFullLogs();
  });
}

/* =========================================================
   ТАБЫ
========================================================= */
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".dir-nav-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".dir-tab").forEach(s => s.classList.toggle("active", s.dataset.tab === tab));

  if (tab === "dashboard") renderDashboard();
  else if (tab === "employees") renderEmployees();
  else if (tab === "chat") { renderChatList(); }
  else if (tab === "orders") renderDirOrders();
  else if (tab === "clients") renderClients();
  else if (tab === "services") renderServicesEditor();
  else if (tab === "attendance") renderAttendance();
  else if (tab === "settings") renderSettingsTab();
  else if (tab === "logs") renderFullLogs();
}

function startDashboardRefresh() {
  if (dashboardRefreshInterval) clearInterval(dashboardRefreshInterval);
  dashboardRefreshInterval = setInterval(() => {
    if (activeTab === "dashboard") renderDashboard();
  }, 15000);
}

/* =========================================================
   DASHBOARD
========================================================= */
function renderDashboard() {
  const users = getUsers();
  const onlineUsers = users.filter(u => isOnline(u.login));
  const orders = getAllOrders();
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayOrders = orders.filter(o => new Date(o.createdAt) >= todayStart);
  const revenue = todayOrders.filter(o => o.payment === "paid").reduce((s, o) => s + (o.total || 0), 0);

  document.getElementById("statEmployees").textContent = users.length;
  document.getElementById("statOnline").textContent = onlineUsers.length;
  document.getElementById("statOrders").textContent = todayOrders.length;
  document.getElementById("statRevenue").textContent = revenue.toLocaleString("ru-RU");

  // Последние действия
  const recent = getLogs().slice(0, 8);
  const recentEl = document.getElementById("recentLogs");
  if (recentEl) {
    if (recent.length === 0) {
      recentEl.innerHTML = `<div class="empty-state-mini">Пока пусто</div>`;
    } else {
      recentEl.innerHTML = recent.map(l => `
        <div class="log-row">
          <div class="log-actor"><i class="fa-solid fa-user"></i> ${escapeHtml(l.actor)}</div>
          <div class="log-msg">${escapeHtml(l.message)}</div>
          <div class="log-time">${formatTime(l.timestamp)}</div>
        </div>
      `).join("");
    }
  }

  // Кто онлайн
  const onlineEl = document.getElementById("onlineList");
  if (onlineEl) {
    if (onlineUsers.length === 0) {
      onlineEl.innerHTML = `<div class="empty-state-mini">Никто не в сети</div>`;
    } else {
      onlineEl.innerHTML = onlineUsers.map(u => `
        <div class="online-item">
          <div class="avatar avatar-sm">
            ${escapeHtml((u.fullName || u.login).slice(0, 2).toUpperCase())}
            <span class="online-dot"></span>
          </div>
          <div>
            <div class="online-name">${escapeHtml(u.fullName)}</div>
            <div class="online-role">${roleLabel(u.role)}</div>
          </div>
        </div>
      `).join("");
    }
  }
}

/* =========================================================
   СОТРУДНИКИ
========================================================= */
function renderEmployees() {
  const grid = document.getElementById("employeesGrid");
  if (!grid) return;

  const users = getUsers();
  if (users.length === 0) {
    grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-users-slash"></i><p>Нет сотрудников</p></div>`;
    return;
  }

  grid.innerHTML = users.map(u => {
    const online = isOnline(u.login);
    const lastSeen = formatLastSeen(u.login);
    const initials = (u.fullName || u.login).slice(0, 2).toUpperCase();
    return `
      <div class="employee-card">
        <div class="employee-head">
          <div class="avatar avatar-lg">
            ${escapeHtml(initials)}
            ${online ? '<span class="online-dot"></span>' : ''}
          </div>
          <div class="employee-meta">
            <div class="employee-name">${escapeHtml(u.fullName)}</div>
            <div class="employee-login">@${escapeHtml(u.login)}</div>
            <span class="employee-role role-${u.role}">${roleLabel(u.role)}</span>
          </div>
        </div>
        <div class="employee-body">
          ${u.phone ? `<div><i class="fa-solid fa-phone"></i> ${escapeHtml(u.phone)}</div>` : ''}
          <div><i class="fa-solid fa-circle ${online ? 'st-online' : 'st-offline'}"></i> ${online ? 'В сети' : escapeHtml(lastSeen)}</div>
        </div>
        <div class="employee-actions">
          <button class="ghost-btn" onclick="dirChangePassword('${escapeHtml(u.login)}')">
            <i class="fa-solid fa-key"></i> Пароль
          </button>
          <button class="danger-btn" onclick="dirDeleteUser('${escapeHtml(u.login)}')">
            <i class="fa-solid fa-trash"></i> Удалить
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function openCreateUserModal() {
  document.getElementById("newFullName").value = "";
  document.getElementById("newLogin").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("newPhone").value = "";
  document.getElementById("newRole").value = "worker";
  document.getElementById("createUserError").textContent = "";
  document.getElementById("createUserModal").classList.add("open");
}
function closeCreateUserModal() { document.getElementById("createUserModal").classList.remove("open"); }

async function dirCreateUser() {
  const fullName = document.getElementById("newFullName").value.trim();
  const login = document.getElementById("newLogin").value.trim();
  const password = document.getElementById("newPassword").value;
  const phone = document.getElementById("newPhone").value.trim();
  const role = document.getElementById("newRole").value;
  const errEl = document.getElementById("createUserError");

  if (!fullName || !login || !password) {
    errEl.textContent = "Заполните ФИО, логин и пароль";
    return;
  }
  if (login.length < 3 || password.length < 4) {
    errEl.textContent = "Логин — от 3 символов, пароль — от 4";
    return;
  }

  const res = await createUser({ fullName, login, password, phone, role }, dirSession.login);
  if (!res.ok) { errEl.textContent = res.error; return; }
  closeCreateUserModal();
  showToast("success", "Аккаунт создан", `${fullName} (${roleLabel(role)})`);
  renderEmployees();
  renderDashboard();
}

async function dirChangePassword(login) {
  const np = prompt(`Новый пароль для ${login}:`);
  if (!np) return;
  if (np.length < 4) { showToast("error", "Слишком короткий", "Минимум 4 символа"); return; }
  const res = await updateUserPassword(login, np, dirSession.login);
  if (!res.ok) showToast("error", "Ошибка", res.error);
  else showToast("success", "Готово", "Пароль изменён");
}

function dirDeleteUser(login) {
  if (login === dirSession.login) {
    showToast("error", "Нельзя", "Нельзя удалить себя");
    return;
  }
  if (!confirm(`Удалить ${login}?`)) return;
  const res = deleteUser(login, dirSession.login);
  if (!res.ok) showToast("error", "Ошибка", res.error);
  else { showToast("success", "Удалён", login); renderEmployees(); renderDashboard(); }
}

/* =========================================================
   ЧАТ
========================================================= */
function renderChatList() {
  const wrap = document.getElementById("chatList");
  if (!wrap) return;

  const others = getUsers().filter(u => u.login !== dirSession.login);
  if (others.length === 0) {
    wrap.innerHTML = `<div class="empty-state-mini">Нет сотрудников</div>`;
    return;
  }

  wrap.innerHTML = others.map(u => {
    const unread = getUnreadCount(dirSession.login, u.login);
    const online = isOnline(u.login);
    const initials = (u.fullName || u.login).slice(0, 2).toUpperCase();
    const isActive = chatPartner === u.login ? "active" : "";
    return `
      <div class="chat-list-item ${isActive}" onclick="dirOpenChat('${escapeHtml(u.login)}')">
        <div class="avatar avatar-sm">
          ${escapeHtml(initials)}
          ${online ? '<span class="online-dot"></span>' : ''}
        </div>
        <div class="chat-list-meta">
          <div class="chat-list-name">${escapeHtml(u.fullName)}</div>
          <div class="chat-list-sub">${roleLabel(u.role)} · ${online ? 'в сети' : 'не в сети'}</div>
        </div>
        ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
      </div>
    `;
  }).join("");

  updateChatBadge();
}

function updateChatBadge() {
  const others = getUsers().filter(u => u.login !== dirSession.login);
  const total = others.reduce((sum, u) => sum + getUnreadCount(dirSession.login, u.login), 0);
  const badge = document.getElementById("chatBadge");
  if (badge) {
    if (total > 0) { badge.style.display = "inline-flex"; badge.textContent = total; }
    else badge.style.display = "none";
  }
}

function dirOpenChat(login) {
  chatPartner = login;
  const u = getUsers().find(x => x.login === login);
  if (!u) return;

  document.getElementById("chatHeader").innerHTML = `
    <div class="chat-header-info">
      <div class="avatar avatar-md">${escapeHtml((u.fullName || u.login).slice(0, 2).toUpperCase())}${isOnline(u.login) ? '<span class="online-dot"></span>' : ''}</div>
      <div>
        <div class="chat-header-name">${escapeHtml(u.fullName)}</div>
        <div class="chat-header-sub">${formatLastSeen(u.login)}</div>
      </div>
    </div>
  `;

  document.getElementById("chatInput").disabled = false;
  document.getElementById("chatSendBtn").disabled = false;

  markMessagesRead(dirSession.login, login);
  renderChatMessages();
  renderChatList();

  if (chatRefreshInterval) clearInterval(chatRefreshInterval);
  chatRefreshInterval = setInterval(() => {
    if (activeTab === "chat" && chatPartner === login) {
      markMessagesRead(dirSession.login, login);
      renderChatMessages();
    }
  }, 3000);

  document.getElementById("chatInput").onkeypress = (e) => {
    if (e.key === "Enter") dirSendMessage();
  };
}

function renderChatMessages() {
  const wrap = document.getElementById("chatMessages");
  if (!wrap || !chatPartner) return;
  const msgs = getMessagesBetween(dirSession.login, chatPartner);
  if (msgs.length === 0) {
    wrap.innerHTML = `<div class="chat-empty"><i class="fa-regular fa-comments"></i><p>Начните диалог</p></div>`;
    return;
  }
  wrap.innerHTML = msgs.map(m => {
    const me = m.from === dirSession.login;
    return `
      <div class="msg ${me ? 'msg-me' : 'msg-them'}">
        <div class="msg-bubble">${escapeHtml(m.text)}</div>
        <div class="msg-time">${formatTime(m.timestamp)}</div>
      </div>
    `;
  }).join("");
  wrap.scrollTop = wrap.scrollHeight;
}

function dirSendMessage() {
  const inp = document.getElementById("chatInput");
  const text = inp.value.trim();
  if (!text || !chatPartner) return;
  sendMessage(dirSession.login, chatPartner, text);
  inp.value = "";
  renderChatMessages();
}

/* =========================================================
   ЗАКАЗЫ
========================================================= */
function renderDirOrders() {
  const grid = document.getElementById("dirOrdersGrid");
  if (!grid) return;
  let orders = getAllOrders();
  if (currentOrdersFilter !== "all") orders = orders.filter(o => o.payment === currentOrdersFilter);

  if (orders.length === 0) {
    grid.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>Заказов пока нет</p></div>`;
    return;
  }

  grid.innerHTML = orders.map(o => {
    const payClass = o.payment === "paid" ? "pay-paid" : o.payment === "draft" ? "pay-draft" : "pay-unpaid";
    const payIcon = o.payment === "paid" ? "fa-check" : o.payment === "draft" ? "fa-pen-ruler" : "fa-xmark";
    return `
      <div class="dir-order-card">
        <div class="dir-order-head">
          <div>
            <div class="order-id">#${o.id.slice(-6)}</div>
            <div class="order-service">${escapeHtml(o.serviceTitle || "—")}</div>
          </div>
          <div class="pay-pill ${payClass}"><i class="fa-solid ${payIcon}"></i> ${paymentLabel(o.payment)}</div>
        </div>
        <div class="order-meta">
          <div><i class="fa-solid fa-user"></i> ${escapeHtml(o.name)} · ${escapeHtml(o.phone)}</div>
          <div><i class="fa-solid fa-location-dot"></i> ${escapeHtml(o.address)}</div>
          <div><i class="fa-solid fa-calendar"></i> ${escapeHtml(o.date)} ${escapeHtml(o.time)}</div>
          <div><i class="fa-solid fa-user-check"></i> ${o.takenBy ? escapeHtml(o.takenBy) : 'не взят'}</div>
        </div>
        <div class="dir-order-foot">
          <strong>${(o.total || 0).toLocaleString("ru-RU")} Сум</strong>
          <select onchange="dirChangePayment('${o.id}', this.value)">
            <option value="paid"   ${o.payment==='paid'?'selected':''}>Оплачен</option>
            <option value="unpaid" ${o.payment==='unpaid'?'selected':''}>Не оплачен</option>
            <option value="draft"  ${o.payment==='draft'?'selected':''}>Черновик</option>
          </select>
        </div>
      </div>
    `;
  }).join("");
}

function dirChangePayment(orderId, newPayment) {
  updateOrderPayment(orderId, newPayment, dirSession.login);
  showToast("success", "Готово", `Статус: ${paymentLabel(newPayment)}`);
  renderDirOrders();
}

/* =========================================================
   КЛИЕНТЫ
========================================================= */
function renderClients() {
  const grid = document.getElementById("clientsGrid");
  if (!grid) return;
  const search = (document.getElementById("clientSearch")?.value || "").toLowerCase();
  let clients = getClients();
  if (search) {
    clients = clients.filter(c =>
      (c.name || "").toLowerCase().includes(search) ||
      (c.phone || "").toLowerCase().includes(search)
    );
  }

  if (clients.length === 0) {
    grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-address-book"></i><p>Клиентов пока нет</p></div>`;
    return;
  }

  grid.innerHTML = clients.map(c => `
    <div class="client-card">
      <div class="client-avatar">${escapeHtml((c.name || "?").slice(0,1).toUpperCase())}</div>
      <div class="client-name">${escapeHtml(c.name)}</div>
      <div class="client-phone"><i class="fa-solid fa-phone"></i> ${escapeHtml(c.phone)}</div>
      ${c.address ? `<div class="client-addr"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(c.address)}</div>` : ''}
      <div class="client-stats">
        <span><i class="fa-solid fa-clipboard-list"></i> ${c.ordersCount || 1} заказ(ов)</span>
      </div>
      <button class="danger-btn small" onclick="dirDeleteClient('${c.id}')"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join("");
}

function dirDeleteClient(id) {
  if (!confirm("Удалить клиента из базы?")) return;
  deleteClient(id, dirSession.login);
  showToast("success", "Удалён", "Клиент удалён");
  renderClients();
}

/* =========================================================
   УСЛУГИ — РЕДАКТОР (НОВОЕ!)
========================================================= */
const POPULAR_ICONS = [
  "fa-broom","fa-house","fa-tree","fa-school","fa-building","fa-shop",
  "fa-utensils","fa-window-maximize","fa-rug","fa-soap","fa-spray-can-sparkles",
  "fa-bath","fa-bed","fa-couch","fa-toilet","fa-faucet","fa-shower",
  "fa-car","fa-warehouse","fa-industry","fa-hospital","fa-store",
  "fa-mug-saucer","fa-wine-glass","fa-bowl-food","fa-pizza-slice",
  "fa-tshirt","fa-shirt","fa-vest","fa-hat-cowboy",
  "fa-leaf","fa-seedling","fa-cloud","fa-droplet","fa-fire-extinguisher",
  "fa-toolbox","fa-screwdriver-wrench","fa-paint-roller","fa-trowel",
  "fa-trash","fa-recycle","fa-temperature-arrow-down","fa-snowflake",
  "fa-briefcase","fa-clipboard-check","fa-star","fa-crown","fa-gem"
];

function renderServicesEditor() {
  const grid = document.getElementById("servicesEditorGrid");
  if (!grid) return;

  const services = getServices();

  let html = `
    <div class="services-toolbar">
      <button class="primary" onclick="openServiceEditor()">
        <i class="fa-solid fa-plus"></i> Добавить услугу
      </button>
      <span class="muted" style="margin-left:auto">Всего: ${services.length}</span>
    </div>
  `;

  if (services.length === 0) {
    html += `<div class="empty-state"><i class="fa-solid fa-broom"></i><p>Услуг пока нет. Нажмите «Добавить услугу».</p></div>`;
  } else {
    html += `<div class="services-editor-grid">`;
    services.forEach(s => {
      const inactive = s.active === false ? 'svc-inactive' : '';
      html += `
        <div class="svc-edit-card ${inactive}">
          <div class="svc-edit-icon"><i class="fa-solid ${escapeHtml(s.icon || 'fa-broom')}"></i></div>
          <div class="svc-edit-body">
            <div class="svc-edit-title">${escapeHtml(s.title)}</div>
            <div class="svc-edit-desc">${escapeHtml(s.description || '')}</div>
            <div class="svc-edit-price">${(s.price || 0).toLocaleString("ru-RU")} Сум / ${escapeHtml(s.unit || 'м²')}</div>
            ${s.active === false ? '<span class="badge" style="background:var(--pay-draft-bg);color:var(--pay-draft-fg)"><i class="fa-solid fa-eye-slash"></i> Скрыта</span>' : ''}
          </div>
          <div class="svc-edit-actions">
            <button class="ghost-btn small" onclick="openServiceEditor('${s.id}')" title="Редактировать">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="ghost-btn small" onclick="toggleServiceActive('${s.id}')" title="${s.active === false ? 'Показать' : 'Скрыть'}">
              <i class="fa-solid ${s.active === false ? 'fa-eye' : 'fa-eye-slash'}"></i>
            </button>
            <button class="danger-btn small" onclick="dirDeleteService('${s.id}')" title="Удалить">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  grid.innerHTML = html;
}

function openServiceEditor(serviceId) {
  editingServiceId = serviceId || null;
  const isEdit = !!serviceId;
  const s = isEdit ? getServiceById(serviceId) : { title:"", description:"", price:15000, icon:"fa-broom", unit:"м²", active:true };

  document.getElementById("svcEditorTitle").textContent = isEdit ? "Редактировать услугу" : "Новая услуга";
  document.getElementById("svcTitle").value = s.title || "";
  document.getElementById("svcDescription").value = s.description || "";
  document.getElementById("svcPrice").value = s.price || 0;
  document.getElementById("svcUnit").value = s.unit || "м²";
  document.getElementById("svcActive").checked = s.active !== false;
  document.getElementById("svcIconInput").value = s.icon || "fa-broom";

  // Рендер иконок
  renderIconPicker(s.icon || "fa-broom");

  document.getElementById("serviceEditorModal").classList.add("open");
}

function closeServiceEditor() {
  document.getElementById("serviceEditorModal").classList.remove("open");
  editingServiceId = null;
}

function renderIconPicker(selected) {
  const wrap = document.getElementById("iconPicker");
  if (!wrap) return;
  wrap.innerHTML = POPULAR_ICONS.map(ic => `
    <button type="button" class="icon-pick ${ic === selected ? 'selected' : ''}"
            onclick="selectIcon('${ic}')" title="${ic}">
      <i class="fa-solid ${ic}"></i>
    </button>
  `).join("");
}

function selectIcon(ic) {
  document.getElementById("svcIconInput").value = ic;
  document.querySelectorAll(".icon-pick").forEach(b => b.classList.remove("selected"));
  // Найти по data
  const all = document.querySelectorAll(".icon-pick");
  all.forEach(btn => {
    if (btn.querySelector("i").className.includes(ic)) btn.classList.add("selected");
  });
  // Превью
  const prev = document.getElementById("svcIconPreview");
  if (prev) prev.className = "fa-solid " + ic;
}

function dirSaveService() {
  const title = document.getElementById("svcTitle").value.trim();
  const description = document.getElementById("svcDescription").value.trim();
  const price = parseInt(document.getElementById("svcPrice").value) || 0;
  const unit = document.getElementById("svcUnit").value.trim() || "м²";
  const icon = document.getElementById("svcIconInput").value.trim() || "fa-broom";
  const active = document.getElementById("svcActive").checked;

  const errEl = document.getElementById("svcError");
  errEl.textContent = "";

  if (!title) { errEl.textContent = "Введите название услуги"; return; }
  if (price < 0) { errEl.textContent = "Цена не может быть отрицательной"; return; }

  const data = {
    id: editingServiceId,
    title, description, price, unit, icon, active,
  };

  saveService(data, dirSession.login);
  showToast("success", editingServiceId ? "Сохранено" : "Создано", title);
  closeServiceEditor();
  renderServicesEditor();
}

function toggleServiceActive(id) {
  const s = getServiceById(id);
  if (!s) return;
  s.active = s.active === false ? true : false;
  saveService(s, dirSession.login);
  renderServicesEditor();
  showToast("info", "Готово", s.active ? "Услуга показана" : "Услуга скрыта");
}

function dirDeleteService(id) {
  const s = getServiceById(id);
  if (!s) return;
  if (!confirm(`Удалить услугу «${s.title}»?\nЭто действие нельзя отменить.`)) return;
  const res = deleteService(id, dirSession.login);
  if (!res.ok) showToast("error", "Ошибка", res.error);
  else { showToast("success", "Удалено", s.title); renderServicesEditor(); }
}

/* =========================================================
   НАСТРОЙКИ САЙТА
========================================================= */
function renderSettingsTab() {
  const wrap = document.getElementById("settingsBody");
  if (!wrap) return;
  const s = getSettings();
  wrap.innerHTML = `
    <div class="settings-card">
      <h3><i class="fa-solid fa-store"></i> Информация о компании</h3>
      <label class="label">Название компании (отображается в шапке)</label>
      <input type="text" id="setCompanyName" value="${escapeHtml(s.companyName || '')}"/>
      <label class="label">Слоган / описание</label>
      <input type="text" id="setTagline" value="${escapeHtml(s.companyTagline || '')}"/>
      <label class="label">Телефон Call Center</label>
      <input type="text" id="setCallCenter" value="${escapeHtml(s.callCenter || '')}"/>
      <button class="primary" style="margin-top:16px" onclick="dirSaveSettings()">
        <i class="fa-solid fa-floppy-disk"></i> Сохранить
      </button>
    </div>
  `;
}

function dirSaveSettings() {
  const patch = {
    companyName: document.getElementById("setCompanyName").value.trim(),
    companyTagline: document.getElementById("setTagline").value.trim(),
    callCenter: document.getElementById("setCallCenter").value.trim(),
  };
  saveSettings(patch, dirSession.login);
  showToast("success", "Сохранено", "Настройки применены ко всем страницам");
}

/* =========================================================
   ЛОГИ
========================================================= */
function renderFullLogs() {
  const wrap = document.getElementById("fullLogs");
  if (!wrap) return;
  const logs = getLogs();
  if (logs.length === 0) {
    wrap.innerHTML = `<div class="empty-state-mini">Журнал пуст</div>`;
    return;
  }
  wrap.innerHTML = logs.map(l => `
    <div class="log-row">
      <div class="log-actor"><i class="fa-solid fa-user"></i> ${escapeHtml(l.actor)}</div>
      <div class="log-msg">${escapeHtml(l.message)}</div>
      <div class="log-time">${formatTime(l.timestamp)}</div>
    </div>
  `).join("");
}

function dirClearLogs() {
  if (!confirm("Очистить весь журнал действий?")) return;
  clearLogs(dirSession.login);
  showToast("info", "Очищено", "Журнал действий очищен");
  renderFullLogs();
}

/* =========================================================
   УТИЛИТЫ
========================================================= */
function dirLogout() {
  if (!confirm("Выйти из аккаунта?")) return;
  logout();
  window.location.href = "login.html";
}

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

function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "сейчас";
  if (diff < 3600000) return `${Math.floor(diff/60000)} мин`;
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" });
  }
  return d.toLocaleDateString("ru-RU", { day:"2-digit", month:"2-digit" }) + " " +
         d.toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" });
}

document.querySelectorAll(".modal").forEach(m => {
  m.addEventListener("click", e => { if (e.target === m) m.classList.remove("open"); });
});

/* =========================================================
   ВКЛАДКА «ПОСЕЩАЕМОСТЬ» (ТУРНИКЕТ)
========================================================= */

function renderAttendance() {
  fillAttendanceUserFilter();
  renderAttendanceTodaySummary();
  renderAttendanceGrid();
}

function fillAttendanceUserFilter() {
  const select = document.getElementById("attFilterUser");
  if (!select) return;
  const currentValue = select.value;

  // Получаем уникальные login'ы из записей
  const records = getAttendance();
  const seen = new Map();
  records.forEach(r => {
    if (!seen.has(r.login)) seen.set(r.login, r.fullName || r.login);
  });

  // Также показываем всех сотрудников из системы (даже если они ещё не отмечались)
  const users = getUsers();
  users.forEach(u => {
    if (u.role === "worker" || u.role === "accountant") {
      if (!seen.has(u.login)) seen.set(u.login, u.fullName || u.login);
    }
  });

  const opts = ['<option value="">Все сотрудники</option>'];
  Array.from(seen.entries())
    .sort((a, b) => a[1].localeCompare(b[1], "ru"))
    .forEach(([login, name]) => {
      opts.push(`<option value="${escapeHtml(login)}">${escapeHtml(name)} (${escapeHtml(login)})</option>`);
    });
  select.innerHTML = opts.join("");
  select.value = currentValue;
}

function renderAttendanceTodaySummary() {
  const wrap = document.getElementById("attTodaySummary");
  if (!wrap) return;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayRecords = getAttendanceFiltered({ dateFrom: todayStr, dateTo: todayStr });

  // Считаем уникальных пришедших и ушедших
  const arrivedSet = new Set();
  const leftSet = new Set();
  todayRecords.forEach(r => {
    if (r.type === "check_in") arrivedSet.add(r.login);
    if (r.type === "check_out") leftSet.add(r.login);
  });

  // Сейчас на работе = пришли но ещё не ушли
  const onShiftSet = new Set();
  arrivedSet.forEach(login => { if (!leftSet.has(login)) onShiftSet.add(login); });

  // Получаем общее количество сотрудников
  const allStaff = getUsers().filter(u => u.role === "worker" || u.role === "accountant").length;

  wrap.innerHTML = `
    <div class="att-summary-card att-summary-1">
      <div class="att-summary-icon"><i class="fa-solid fa-user-check"></i></div>
      <div class="att-summary-num">${arrivedSet.size}</div>
      <div class="att-summary-label">Пришли сегодня</div>
      <div class="att-summary-sub">из ${allStaff} сотрудников</div>
    </div>
    <div class="att-summary-card att-summary-2">
      <div class="att-summary-icon"><i class="fa-solid fa-business-time"></i></div>
      <div class="att-summary-num">${onShiftSet.size}</div>
      <div class="att-summary-label">Сейчас на работе</div>
      <div class="att-summary-sub">не отметили уход</div>
    </div>
    <div class="att-summary-card att-summary-3">
      <div class="att-summary-icon"><i class="fa-solid fa-door-open"></i></div>
      <div class="att-summary-num">${leftSet.size}</div>
      <div class="att-summary-label">Ушли сегодня</div>
      <div class="att-summary-sub">отметили уход</div>
    </div>
    <div class="att-summary-card att-summary-4">
      <div class="att-summary-icon"><i class="fa-solid fa-list-check"></i></div>
      <div class="att-summary-num">${todayRecords.length}</div>
      <div class="att-summary-label">Всего отметок</div>
      <div class="att-summary-sub">за сегодня</div>
    </div>
  `;
}

function renderAttendanceGrid() {
  const grid = document.getElementById("attendanceGrid");
  if (!grid) return;

  const filters = {
    login: document.getElementById("attFilterUser")?.value || "",
    type: document.getElementById("attFilterType")?.value || "",
    dateFrom: document.getElementById("attFilterFrom")?.value || "",
    dateTo: document.getElementById("attFilterTo")?.value || "",
  };

  const records = getAttendanceFiltered(filters);

  if (records.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <i class="fa-regular fa-folder-open"></i>
        <p>Нет записей по выбранным фильтрам</p>
      </div>`;
    return;
  }

  grid.innerHTML = records.map(r => {
    const date = new Date(r.timestamp);
    const dateStr = date.toLocaleDateString("ru-RU", { day:"numeric", month:"long", year:"numeric" });
    const timeStr = date.toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" });

    const typeBadge = r.type === "check_in"
      ? '<span class="att-badge att-badge-in"><i class="fa-solid fa-right-to-bracket"></i> Приход</span>'
      : '<span class="att-badge att-badge-out"><i class="fa-solid fa-right-from-bracket"></i> Уход</span>';

    const photoHtml = r.photo
      ? `<img src="${r.photo}" alt="селфи" class="att-photo"/>`
      : '<div class="att-no-photo"><i class="fa-solid fa-user"></i></div>';

    const addressHtml = r.address
      ? `<div class="att-address"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(truncate(r.address, 90))}</div>`
      : (r.lat != null
          ? `<div class="att-address att-address-coords"><i class="fa-solid fa-map-pin"></i> ${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}</div>`
          : '<div class="att-address att-no-loc"><i class="fa-solid fa-circle-question"></i> Геолокация не указана</div>');

    return `
      <div class="att-card" onclick="openAttendanceDetail('${r.id}')">
        <div class="att-card-photo">
          ${photoHtml}
          ${typeBadge}
        </div>
        <div class="att-card-body">
          <div class="att-card-name">${escapeHtml(r.fullName)}</div>
          <div class="att-card-login muted">@${escapeHtml(r.login)}</div>
          <div class="att-card-time">
            <i class="fa-regular fa-clock"></i> ${timeStr}
            <span class="att-card-date">${dateStr}</span>
          </div>
          ${addressHtml}
        </div>
      </div>
    `;
  }).join("");
}

function dirRefreshAttendance() {
  renderAttendance();
  showToast("info", "Обновлено", "Список перезагружен");
}

function dirClearAttendance() {
  if (!confirm("Удалить ВСЕ записи турникета? Это действие нельзя отменить.")) return;
  if (!confirm("Точно удалить все записи?")) return;
  clearAllAttendance(session.login);
  renderAttendance();
  showToast("success", "Удалено", "Все записи турникета очищены");
}

function openAttendanceDetail(id) {
  const records = getAttendance();
  const r = records.find(x => x.id === id);
  if (!r) {
    showToast("error", "Ошибка", "Запись не найдена");
    return;
  }

  const date = new Date(r.timestamp);
  const dateStr = date.toLocaleDateString("ru-RU", { day:"numeric", month:"long", year:"numeric", weekday:"long" });
  const timeStr = date.toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
  const typeLabel = r.type === "check_in" ? "Приход на работу" : "Уход с работы";
  const typeIcon = r.type === "check_in" ? "fa-right-to-bracket" : "fa-right-from-bracket";
  const typeColor = r.type === "check_in" ? "#10b981" : "#f59e0b";

  document.getElementById("attDetailTitle").textContent = typeLabel;

  // Карта (OpenStreetMap embed без API ключа)
  let mapHtml = '<div class="att-detail-no-map"><i class="fa-solid fa-map"></i> Геолокация не была указана</div>';
  if (r.lat != null && r.lng != null) {
    const delta = 0.003;
    const bbox = `${r.lng - delta},${r.lat - delta},${r.lng + delta},${r.lat + delta}`;
    const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${r.lat},${r.lng}`;
    const externalUrl = `https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=18/${r.lat}/${r.lng}`;
    mapHtml = `
      <iframe class="att-detail-map" src="${mapUrl}" loading="lazy"></iframe>
      <a href="${externalUrl}" target="_blank" class="att-detail-map-link">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> Открыть в OpenStreetMap
      </a>
    `;
  }

  const photoHtml = r.photo
    ? `<img src="${r.photo}" alt="селфи" class="att-detail-photo"/>`
    : '<div class="att-detail-no-photo"><i class="fa-solid fa-user"></i><p>Фото не сохранено</p></div>';

  document.getElementById("attDetailBody").innerHTML = `
    <div class="att-detail-grid">
      <div class="att-detail-left">
        ${photoHtml}
      </div>
      <div class="att-detail-right">
        <div class="att-detail-row">
          <span class="att-detail-icon" style="background:${typeColor}"><i class="fa-solid ${typeIcon}"></i></span>
          <div>
            <div class="att-detail-label">Тип</div>
            <div class="att-detail-value"><strong>${typeLabel}</strong></div>
          </div>
        </div>

        <div class="att-detail-row">
          <span class="att-detail-icon"><i class="fa-solid fa-user"></i></span>
          <div>
            <div class="att-detail-label">Сотрудник</div>
            <div class="att-detail-value"><strong>${escapeHtml(r.fullName)}</strong> <span class="muted">@${escapeHtml(r.login)}</span></div>
          </div>
        </div>

        <div class="att-detail-row">
          <span class="att-detail-icon"><i class="fa-solid fa-calendar"></i></span>
          <div>
            <div class="att-detail-label">Дата</div>
            <div class="att-detail-value">${dateStr}</div>
          </div>
        </div>

        <div class="att-detail-row">
          <span class="att-detail-icon"><i class="fa-solid fa-clock"></i></span>
          <div>
            <div class="att-detail-label">Время</div>
            <div class="att-detail-value"><strong>${timeStr}</strong></div>
          </div>
        </div>

        <div class="att-detail-row">
          <span class="att-detail-icon"><i class="fa-solid fa-location-dot"></i></span>
          <div>
            <div class="att-detail-label">Адрес</div>
            <div class="att-detail-value">${r.address ? escapeHtml(r.address) : '<span class="muted">Не определён</span>'}</div>
            ${r.lat != null ? `<div class="muted" style="font-size:12px;margin-top:4px">${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}${r.accuracy ? ` (точность ~${r.accuracy} м)` : ""}</div>` : ""}
          </div>
        </div>
      </div>
    </div>

    <div class="att-detail-map-wrap">
      ${mapHtml}
    </div>

    <div class="att-detail-footer">
      <button class="danger-btn" onclick="dirDeleteAttendanceRecord('${r.id}')">
        <i class="fa-solid fa-trash"></i> <span>Удалить запись</span>
      </button>
    </div>
  `;

  document.getElementById("attDetailModal").classList.add("open");
}

function closeAttendanceDetail() {
  document.getElementById("attDetailModal").classList.remove("open");
}

function dirDeleteAttendanceRecord(id) {
  if (!confirm("Удалить эту запись турникета?")) return;
  const res = deleteAttendance(id, session.login);
  if (!res.ok) {
    showToast("error", "Ошибка", res.error);
    return;
  }
  closeAttendanceDetail();
  renderAttendance();
  showToast("success", "Удалено", "Запись удалена");
}

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}
