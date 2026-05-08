/* =========================================================
   AUTH MODULE — авторизация, роли, сессия, логи, услуги
   ---------------------------------------------------------
   Подключается на ВСЕХ страницах: index.html, director.html
   Хранит данные в localStorage.
========================================================= */

const AUTH_KEYS = {
  USERS: "kus_users",
  SESSION: "kus_session",
  LOGS: "kus_action_logs",
  CHATS: "kus_chats",
  CLIENTS: "kus_clients_db",
  ORDERS: "kus_all_orders",
  HEARTBEAT: "kus_heartbeat",
  SERVICES: "kus_services_v2",     // редактируемые услуги
  SETTINGS: "kus_settings",         // общие настройки сайта
  ATTENDANCE: "kus_attendance",     // турникет: фото + геолокация
};

/* =========================================================
   ДЕФОЛТНЫЕ УСЛУГИ (используются только при первом запуске)
========================================================= */
const DEFAULT_SERVICES = [
  { id:"svc_1", title:"Двор",       description:"Уборка двора и территории",      price:15000, icon:"fa-tree",          unit:"м²", order:1, active:true },
  { id:"svc_2", title:"Квартира",   description:"Генеральная уборка квартиры",    price:15000, icon:"fa-house",         unit:"м²", order:2, active:true },
  { id:"svc_3", title:"Школа",      description:"Уборка учебных заведений",        price:15000, icon:"fa-school",        unit:"м²", order:3, active:true },
  { id:"svc_4", title:"Офис",       description:"Уборка офисных помещений",        price:15000, icon:"fa-building",      unit:"м²", order:4, active:true },
  { id:"svc_5", title:"Магазин",    description:"Уборка торговых площадей",        price:15000, icon:"fa-shop",          unit:"м²", order:5, active:true },
  { id:"svc_6", title:"Ресторан",   description:"Уборка кафе и ресторанов",        price:15000, icon:"fa-utensils",      unit:"м²", order:6, active:true },
  { id:"svc_7", title:"Окна",       description:"Профессиональное мытьё окон",     price:15000, icon:"fa-window-maximize",unit:"шт", order:7, active:true },
  { id:"svc_8", title:"Ковры",      description:"Глубокая чистка ковров",          price:15000, icon:"fa-rug",           unit:"м²", order:8, active:true },
];

/* =========================================================
   ИНИЦИАЛИЗАЦИЯ
========================================================= */
async function initAuthSystem() {
  const users = getUsers();
  if (users.length === 0) {
    const hashedPw = window.hashPassword
      ? await window.hashPassword("admin123")
      : "admin123"; // fallback, если firebase-sync не загружен
    const defaultDirector = {
      id: "u_" + Date.now(),
      login: "director",
      password: hashedPw,
      passwordHashed: true,
      fullName: "Директор",
      role: "director",
      phone: "",
      createdAt: new Date().toISOString(),
      createdBy: "system",
    };
    localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify([defaultDirector]));
    addLog("system", "Система инициализирована. Создан директор (login: director / pass: admin123)");
  }

  // Инициализация услуг
  if (!localStorage.getItem(AUTH_KEYS.SERVICES)) {
    localStorage.setItem(AUTH_KEYS.SERVICES, JSON.stringify(DEFAULT_SERVICES));
  }

  // Инициализация настроек
  if (!localStorage.getItem(AUTH_KEYS.SETTINGS)) {
    localStorage.setItem(AUTH_KEYS.SETTINGS, JSON.stringify({
      companyName: "KOMFORT",
      companyTagline: "Уборка премиум-класса",
      callCenter: "+998 (90) 185-66-99",
      currency: "Сум",
    }));
  }
}

/* =========================================================
   НАСТРОЙКИ
========================================================= */
function getSettings() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.SETTINGS)) || {}; }
  catch { return {}; }
}

function saveSettings(patch, byLogin) {
  const cur = getSettings();
  const merged = { ...cur, ...patch };
  localStorage.setItem(AUTH_KEYS.SETTINGS, JSON.stringify(merged));
  addLog(byLogin || "system", "Настройки сайта обновлены");
  return merged;
}

/* =========================================================
   УСЛУГИ — редактируемые
========================================================= */
function getServices() {
  try {
    const arr = JSON.parse(localStorage.getItem(AUTH_KEYS.SERVICES)) || [];
    return arr.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch { return []; }
}

function getActiveServices() {
  return getServices().filter(s => s.active !== false);
}

function getServiceById(id) {
  return getServices().find(s => s.id === id) || null;
}

function saveService(service, byLogin) {
  const list = getServices();
  const idx = list.findIndex(s => s.id === service.id);
  const isNew = idx === -1;

  if (isNew) {
    service.id = service.id || ("svc_" + Date.now());
    service.order = service.order || (list.length + 1);
    list.push(service);
  } else {
    list[idx] = { ...list[idx], ...service };
  }
  localStorage.setItem(AUTH_KEYS.SERVICES, JSON.stringify(list));
  addLog(byLogin || "director", `${isNew ? "Создана" : "Обновлена"} услуга: ${service.title}`);
  return { ok: true, service };
}

function deleteService(id, byLogin) {
  const list = getServices();
  const target = list.find(s => s.id === id);
  if (!target) return { ok: false, error: "Услуга не найдена" };
  const filtered = list.filter(s => s.id !== id);
  localStorage.setItem(AUTH_KEYS.SERVICES, JSON.stringify(filtered));
  addLog(byLogin || "director", `Удалена услуга: ${target.title}`);
  return { ok: true };
}

function reorderServices(orderedIds, byLogin) {
  const list = getServices();
  orderedIds.forEach((id, idx) => {
    const s = list.find(x => x.id === id);
    if (s) s.order = idx + 1;
  });
  localStorage.setItem(AUTH_KEYS.SERVICES, JSON.stringify(list));
  addLog(byLogin || "director", "Порядок услуг изменён");
}

/* =========================================================
   ПОЛЬЗОВАТЕЛИ
========================================================= */
function getUsers() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.USERS)) || []; }
  catch { return []; }
}

function saveUsers(users) {
  localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));
}

async function createUser(userData, createdByLogin) {
  const users = getUsers();
  if (users.some(u => u.login === userData.login)) {
    return { ok: false, error: "Логин уже существует" };
  }
  const hashedPw = window.hashPassword
    ? await window.hashPassword(userData.password)
    : userData.password;
  const newUser = {
    id: "u_" + Date.now(),
    login: userData.login.trim(),
    password: hashedPw,
    passwordHashed: !!window.hashPassword,
    fullName: userData.fullName || userData.login,
    role: userData.role || "worker",
    phone: userData.phone || "",
    createdAt: new Date().toISOString(),
    createdBy: createdByLogin,
  };
  users.push(newUser);
  saveUsers(users);
  addLog(createdByLogin, `Создан аккаунт: ${newUser.login} (${roleLabel(newUser.role)})`);
  return { ok: true, user: newUser };
}

function deleteUser(login, byLogin) {
  let users = getUsers();
  const target = users.find(u => u.login === login);
  if (!target) return { ok: false, error: "Пользователь не найден" };
  if (target.role === "director" && users.filter(u => u.role === "director").length === 1) {
    return { ok: false, error: "Нельзя удалить единственного директора" };
  }
  users = users.filter(u => u.login !== login);
  saveUsers(users);
  addLog(byLogin, `Удалён аккаунт: ${login}`);
  return { ok: true };
}

async function updateUserPassword(login, newPassword, byLogin) {
  const users = getUsers();
  const u = users.find(x => x.login === login);
  if (!u) return { ok: false, error: "Пользователь не найден" };
  u.password = window.hashPassword
    ? await window.hashPassword(newPassword)
    : newPassword;
  u.passwordHashed = !!window.hashPassword;
  saveUsers(users);
  addLog(byLogin, `Изменён пароль пользователя: ${login}`);
  return { ok: true };
}

function roleLabel(role) {
  const map = { director: "Директор", accountant: "Бухгалтер", worker: "Сотрудник" };
  return map[role] || role;
}

/* =========================================================
   ВХОД / ВЫХОД / СЕССИЯ
========================================================= */
async function login(loginStr, password) {
  const users = getUsers();
  const trimmedLogin = loginStr.trim();
  const u = users.find(x => x.login === trimmedLogin);
  if (!u) return { ok: false, error: "Неверный логин или пароль" };

  // Сценарий 1: пароль уже хешированный — сравниваем хеши
  // Сценарий 2: пароль ещё plain (старая запись) — сравниваем напрямую и мигрируем
  let matched = false;
  if (u.passwordHashed && window.hashPassword) {
    const hashedInput = await window.hashPassword(password);
    matched = (u.password === hashedInput);
  } else {
    matched = (u.password === password);
    // Авто-миграция: если совпало в plain и доступен hash API — обновим запись
    if (matched && window.hashPassword) {
      u.password = await window.hashPassword(password);
      u.passwordHashed = true;
      saveUsers(users);
    }
  }

  if (!matched) return { ok: false, error: "Неверный логин или пароль" };

  const session = {
    login: u.login,
    role: u.role,
    fullName: u.fullName,
    loginAt: new Date().toISOString(),
  };
  localStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify(session));
  updateHeartbeat(u.login);
  addLog(u.login, `Вход в систему (${roleLabel(u.role)})`);
  return { ok: true, session };
}

function logout() {
  const s = getSession();
  if (s) {
    addLog(s.login, "Выход из системы");
    setLastSeen(s.login);
  }
  localStorage.removeItem(AUTH_KEYS.SESSION);
}

function getSession() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.SESSION)); }
  catch { return null; }
}

function requireAuth(allowedRoles) {
  const s = getSession();
  if (!s) {
    window.location.href = "login.html";
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(s.role)) {
    alert("Нет доступа к этой странице");
    window.location.href = "index.html";
    return null;
  }
  return s;
}

/* =========================================================
   BOOTSTRAP — ждёт Firebase + проверяет авторизацию
   Используйте в начале app.js / director.js:
     bootstrapApp({ allowedRoles: ['director'] }, (session) => { ... });
========================================================= */
async function bootstrapApp(opts, callback) {
  opts = opts || {};
  // Ждём пока firebase-sync загрузит данные из облака
  if (window.FB && !window.FB.isReady()) {
    await window.FB.waitReady();
  }
  const session = requireAuth(opts.allowedRoles);
  if (!session) return;
  callback(session);
}

/* =========================================================
   HEARTBEAT
========================================================= */
function updateHeartbeat(login) {
  if (!login) {
    const s = getSession();
    if (!s) return;
    login = s.login;
  }
  let hb = {};
  try { hb = JSON.parse(localStorage.getItem(AUTH_KEYS.HEARTBEAT)) || {}; } catch {}
  hb[login] = Date.now();
  localStorage.setItem(AUTH_KEYS.HEARTBEAT, JSON.stringify(hb));
}

function setLastSeen(login) {
  let hb = {};
  try { hb = JSON.parse(localStorage.getItem(AUTH_KEYS.HEARTBEAT)) || {}; } catch {}
  hb[login] = Date.now();
  localStorage.setItem(AUTH_KEYS.HEARTBEAT, JSON.stringify(hb));
}

function getHeartbeats() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.HEARTBEAT)) || {}; }
  catch { return {}; }
}

function isOnline(login) {
  const hb = getHeartbeats();
  if (!hb[login]) return false;
  return (Date.now() - hb[login]) < 60 * 1000;
}

function formatLastSeen(login) {
  const hb = getHeartbeats();
  if (!hb[login]) return "никогда не заходил";
  const diff = Date.now() - hb[login];
  if (diff < 60 * 1000) return "в сети";
  if (diff < 60 * 60 * 1000) return `был(а) ${Math.floor(diff / 60000)} мин назад`;
  if (diff < 24 * 60 * 60 * 1000) return `был(а) ${Math.floor(diff / 3600000)} ч назад`;
  const d = new Date(hb[login]);
  return `был(а) ${d.toLocaleDateString("ru-RU")} в ${d.toLocaleTimeString("ru-RU", {hour:"2-digit", minute:"2-digit"})}`;
}

function startHeartbeatLoop() {
  const ping = () => {
    const s = getSession();
    if (s) updateHeartbeat(s.login);
  };
  ping();
  setInterval(ping, 20 * 1000);
  window.addEventListener("beforeunload", () => {
    const s = getSession();
    if (s) setLastSeen(s.login);
  });
}

/* =========================================================
   ЛОГИ
========================================================= */
function addLog(actorLogin, message) {
  let logs = [];
  try { logs = JSON.parse(localStorage.getItem(AUTH_KEYS.LOGS)) || []; } catch {}
  logs.unshift({
    id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    actor: actorLogin,
    message,
    timestamp: new Date().toISOString(),
  });
  if (logs.length > 500) logs = logs.slice(0, 500);
  localStorage.setItem(AUTH_KEYS.LOGS, JSON.stringify(logs));
}

function getLogs() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.LOGS)) || []; }
  catch { return []; }
}

function clearLogs(byLogin) {
  localStorage.setItem(AUTH_KEYS.LOGS, JSON.stringify([]));
  addLog(byLogin, "Журнал действий очищен");
}

/* =========================================================
   ЧАТ
========================================================= */
function getChats() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.CHATS)) || {}; }
  catch { return {}; }
}

function chatKey(loginA, loginB) {
  return [loginA, loginB].sort().join("__");
}

function sendMessage(fromLogin, toLogin, text) {
  if (!text || !text.trim()) return;
  const chats = getChats();
  const k = chatKey(fromLogin, toLogin);
  if (!chats[k]) chats[k] = [];
  chats[k].push({
    id: "msg_" + Date.now(),
    from: fromLogin,
    to: toLogin,
    text: text.trim(),
    timestamp: new Date().toISOString(),
    read: false,
  });
  localStorage.setItem(AUTH_KEYS.CHATS, JSON.stringify(chats));
  addLog(fromLogin, `Отправил(а) сообщение → ${toLogin}: "${text.trim().slice(0, 60)}${text.length>60?'...':''}"`);
}

function getMessagesBetween(loginA, loginB) {
  const chats = getChats();
  return chats[chatKey(loginA, loginB)] || [];
}

function markMessagesRead(myLogin, fromLogin) {
  const chats = getChats();
  const k = chatKey(myLogin, fromLogin);
  if (!chats[k]) return;
  let changed = false;
  chats[k].forEach(m => {
    if (m.to === myLogin && !m.read) { m.read = true; changed = true; }
  });
  if (changed) localStorage.setItem(AUTH_KEYS.CHATS, JSON.stringify(chats));
}

function getUnreadCount(myLogin, fromLogin) {
  const msgs = getMessagesBetween(myLogin, fromLogin);
  return msgs.filter(m => m.to === myLogin && !m.read).length;
}

/* =========================================================
   КЛИЕНТЫ
========================================================= */
function getClients() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.CLIENTS)) || []; }
  catch { return []; }
}

function addClientFromOrder(order, byLogin) {
  if (!order || !order.phone) return;
  const clients = getClients();
  const existing = clients.find(c => c.phone === order.phone);
  if (existing) {
    existing.ordersCount = (existing.ordersCount || 1) + 1;
    existing.lastOrderAt = new Date().toISOString();
    if (order.address) existing.address = order.address;
    localStorage.setItem(AUTH_KEYS.CLIENTS, JSON.stringify(clients));
    return;
  }
  clients.push({
    id: "cl_" + Date.now(),
    name: order.name || "—",
    phone: order.phone,
    address: order.address || "",
    firstOrderAt: new Date().toISOString(),
    lastOrderAt: new Date().toISOString(),
    ordersCount: 1,
    addedBy: byLogin || "system",
  });
  localStorage.setItem(AUTH_KEYS.CLIENTS, JSON.stringify(clients));
  addLog(byLogin || "system", `Новый клиент в базе: ${order.name} (${order.phone})`);
}

function deleteClient(clientId, byLogin) {
  let clients = getClients();
  const target = clients.find(c => c.id === clientId);
  clients = clients.filter(c => c.id !== clientId);
  localStorage.setItem(AUTH_KEYS.CLIENTS, JSON.stringify(clients));
  if (target) addLog(byLogin, `Удалён клиент: ${target.name} (${target.phone})`);
}

/* =========================================================
   ЗАКАЗЫ
========================================================= */
function getAllOrders() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.ORDERS)) || []; }
  catch { return []; }
}

function saveOrder(order, byLogin) {
  const orders = getAllOrders();
  const newOrder = {
    id: order.id || ("ord_" + Date.now()),
    ...order,
    payment: order.payment || "unpaid",
    createdAt: order.createdAt || new Date().toISOString(),
    createdBy: byLogin,
    takenBy: order.takenBy || null,
  };
  const idx = orders.findIndex(o => o.id === newOrder.id);
  if (idx >= 0) orders[idx] = newOrder;
  else orders.unshift(newOrder);
  localStorage.setItem(AUTH_KEYS.ORDERS, JSON.stringify(orders));
  addClientFromOrder(newOrder, byLogin);
  addLog(byLogin, `${idx >= 0 ? "Обновлён" : "Создан"} заказ #${newOrder.id.slice(-6)} (${paymentLabel(newOrder.payment)})`);
  return newOrder;
}

function updateOrderPayment(orderId, payment, byLogin) {
  const orders = getAllOrders();
  const o = orders.find(x => x.id === orderId);
  if (!o) return;
  const old = o.payment;
  o.payment = payment;
  localStorage.setItem(AUTH_KEYS.ORDERS, JSON.stringify(orders));
  addLog(byLogin, `Заказ #${orderId.slice(-6)}: статус оплаты ${paymentLabel(old)} → ${paymentLabel(payment)}`);
}

function takeOrder(orderId, workerLogin) {
  const orders = getAllOrders();
  const o = orders.find(x => x.id === orderId);
  if (!o) return { ok: false, error: "Заказ не найден" };
  if (o.takenBy && o.takenBy !== workerLogin) {
    return { ok: false, error: "Заказ уже взял другой сотрудник" };
  }
  o.takenBy = workerLogin;
  o.takenAt = new Date().toISOString();
  localStorage.setItem(AUTH_KEYS.ORDERS, JSON.stringify(orders));
  addLog(workerLogin, `Взял(а) заказ #${orderId.slice(-6)}`);
  return { ok: true };
}

function paymentLabel(p) {
  return p === "paid" ? "Оплачен" : p === "draft" ? "Черновик" : "Не оплачен";
}

/* =========================================================
   ТУРНИКЕТ — отметки прихода/ухода с фото и геолокацией
========================================================= */
function getAttendance() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.ATTENDANCE)) || []; }
  catch { return []; }
}

function saveAttendanceList(list) {
  // Ограничиваем размер — храним последние 500 записей чтобы не переполнить localStorage
  if (list.length > 500) {
    list = list.slice(list.length - 500);
  }
  try {
    localStorage.setItem(AUTH_KEYS.ATTENDANCE, JSON.stringify(list));
    return { ok: true };
  } catch (e) {
    // QuotaExceeded — почистим самые старые и попробуем ещё раз
    if (list.length > 50) {
      const trimmed = list.slice(list.length - 100);
      try {
        localStorage.setItem(AUTH_KEYS.ATTENDANCE, JSON.stringify(trimmed));
        return { ok: true, trimmed: true };
      } catch (e2) {
        return { ok: false, error: "Не хватает места в браузере. Очистите старые записи." };
      }
    }
    return { ok: false, error: "Не хватает места в браузере для фото." };
  }
}

function addAttendance(record) {
  const list = getAttendance();
  const entry = {
    id: "att_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    login: record.login,
    fullName: record.fullName || record.login,
    role: record.role || "worker",
    type: record.type || "check_in",     // check_in | check_out
    photo: record.photo || null,          // base64 dataURL (jpeg)
    timestamp: new Date().toISOString(),
    lat: record.lat == null ? null : Number(record.lat),
    lng: record.lng == null ? null : Number(record.lng),
    accuracy: record.accuracy == null ? null : Math.round(Number(record.accuracy)),
    address: record.address || null,
    note: record.note || "",
  };
  list.push(entry);
  const res = saveAttendanceList(list);
  if (res.ok) {
    const typeLabel = entry.type === "check_in" ? "Пришёл на работу" : "Ушёл с работы";
    addLog(entry.login, `Турникет: ${typeLabel}${entry.address ? " (" + entry.address + ")" : ""}`);
  }
  return { ok: res.ok, error: res.error, entry };
}

function getAttendanceFiltered({ login, dateFrom, dateTo, type } = {}) {
  let list = getAttendance();
  if (login) list = list.filter(e => e.login === login);
  if (type) list = list.filter(e => e.type === type);
  if (dateFrom) {
    const fromTs = new Date(dateFrom + "T00:00:00").getTime();
    list = list.filter(e => new Date(e.timestamp).getTime() >= fromTs);
  }
  if (dateTo) {
    const toTs = new Date(dateTo + "T23:59:59").getTime();
    list = list.filter(e => new Date(e.timestamp).getTime() <= toTs);
  }
  // Сортировка: сначала свежие
  list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return list;
}

function deleteAttendance(id, byLogin) {
  const list = getAttendance();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) return { ok: false, error: "Запись не найдена" };
  const removed = list[idx];
  list.splice(idx, 1);
  saveAttendanceList(list);
  addLog(byLogin || "director", `Удалена запись турникета сотрудника ${removed.login}`);
  return { ok: true };
}

function clearAllAttendance(byLogin) {
  localStorage.setItem(AUTH_KEYS.ATTENDANCE, JSON.stringify([]));
  addLog(byLogin || "director", "Очищены все записи турникета");
}

function getLastAttendanceForUser(login) {
  const list = getAttendance();
  // Самая свежая запись пользователя
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].login === login) return list[i];
  }
  return null;
}

/* =========================================================
   АВТО-ИНИЦИАЛИЗАЦИЯ
   Ждём Firebase (если есть) чтобы не создавать дефолтного директора
   когда в облаке уже есть данные.
========================================================= */
(async function () {
  if (window.FB && !window.FB.isReady()) {
    try { await window.FB.waitReady(); } catch (e) { /* ignore */ }
  }
  initAuthSystem();
})();
