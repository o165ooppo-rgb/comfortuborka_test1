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
  TASKS: "kus_tasks",               // задания директора → сотрудникам
  CLIENT_PREFS: "kus_client_prefs", // настройки клиентов (скидки), ключ = нормализованный телефон
  ADVANCES: "kus_salary_advances",  // авансы сотрудников (долг, отрабатывается сменами)
  TURNSTILE_PERMITS: "kus_turnstile_permits", // допуск к турникету (кого директор взял на смену), по датам
};

/* =========================================================
   ДЕФОЛТНЫЕ УСЛУГИ (используются только при первом запуске)
========================================================= */
const DEFAULT_SERVICES = [
  { id:"svc_1", titleRu:"Двор",     titleUz:"Hovli",     titleEn:"Yard",       descriptionRu:"Уборка двора и территории",   descriptionUz:"Hovli va hududni tozalash",      descriptionEn:"Yard and area cleaning",          title:"Hovli",     description:"Hovli va hududni tozalash",       icon:"fa-tree",          order:1, active:true },
  { id:"svc_2", titleRu:"Квартира", titleUz:"Kvartira",  titleEn:"Apartment",  descriptionRu:"Генеральная уборка квартиры", descriptionUz:"Kvartirani umumiy tozalash",     descriptionEn:"Deep apartment cleaning",         title:"Kvartira",  description:"Kvartirani umumiy tozalash",      icon:"fa-house",         order:2, active:true },
  { id:"svc_3", titleRu:"Школа",    titleUz:"Maktab",    titleEn:"School",     descriptionRu:"Уборка учебных заведений",    descriptionUz:"Ta'lim muassasalarini tozalash", descriptionEn:"Educational institution cleaning",title:"Maktab",    description:"Ta'lim muassasalarini tozalash",  icon:"fa-school",        order:3, active:true },
  { id:"svc_4", titleRu:"Офис",     titleUz:"Ofis",      titleEn:"Office",     descriptionRu:"Уборка офисных помещений",    descriptionUz:"Ofis xonalarini tozalash",       descriptionEn:"Office space cleaning",           title:"Ofis",      description:"Ofis xonalarini tozalash",        icon:"fa-building",      order:4, active:true },
  { id:"svc_5", titleRu:"Магазин",  titleUz:"Do'kon",    titleEn:"Shop",       descriptionRu:"Уборка торговых площадей",    descriptionUz:"Savdo joylarini tozalash",       descriptionEn:"Retail space cleaning",           title:"Do'kon",    description:"Savdo joylarini tozalash",        icon:"fa-shop",          order:5, active:true },
  { id:"svc_6", titleRu:"Ресторан", titleUz:"Restoran",  titleEn:"Restaurant", descriptionRu:"Уборка кафе и ресторанов",    descriptionUz:"Kafe va restoranlarni tozalash", descriptionEn:"Cafe and restaurant cleaning",    title:"Restoran",  description:"Kafe va restoranlarni tozalash",  icon:"fa-utensils",      order:6, active:true },
  { id:"svc_7", titleRu:"Окна",     titleUz:"Derazalar", titleEn:"Windows",    descriptionRu:"Профессиональное мытьё окон", descriptionUz:"Derazalarni professional yuvish", descriptionEn:"Professional window cleaning",   title:"Derazalar", description:"Derazalarni professional yuvish", icon:"fa-window-maximize",order:7, active:true },
  { id:"svc_8", titleRu:"Ковры",    titleUz:"Gilamlar",  titleEn:"Carpets",    descriptionRu:"Глубокая чистка ковров",      descriptionUz:"Gilamlarni chuqur tozalash",     descriptionEn:"Deep carpet cleaning",            title:"Gilamlar",  description:"Gilamlarni chuqur tozalash",      icon:"fa-rug",           order:8, active:true },
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
   ЛОГОТИП КОМПАНИИ
   ---------------------------------------------------------
   Хранится в settings.logoBase64 (Data URL картинки).
   Если задан — заменяет иконку метлы во всех брендах.
========================================================= */
function getCompanyLogo() {
  try {
    const s = getSettings();
    return s.logoBase64 || null;
  } catch { return null; }
}

function saveCompanyLogo(base64DataUrl, byLogin) {
  saveSettings({ logoBase64: base64DataUrl }, byLogin);
}

function removeCompanyLogo(byLogin) {
  const cur = getSettings();
  delete cur.logoBase64;
  localStorage.setItem(AUTH_KEYS.SETTINGS, JSON.stringify(cur));
  addLog(byLogin || "system", "Логотип компании удалён");
}

/**
 * Заменяет все элементы <i class="fa-broom"></i> (в шапке/брендах) на тег <img>
 * с логотипом из настроек. Вызывать после рендера шапки и после изменений настроек.
 * Дополнительно: меняет favicon страницы.
 */
function applyCompanyLogo() {
  const logo = getCompanyLogo();
  // 1) Бренды в шапке — заменить .brand-mark / .brand-text / .dir-brand содержимое (иконка)
  document.querySelectorAll('[data-brand-icon], .brand-text > i.fa-broom, .brand-mark > i.fa-broom, .dir-brand > i.fa-shield-halved, .login-brand .brand-mark > i.fa-broom').forEach(icon => {
    const parent = icon.parentElement;
    if (!parent) return;
    // Если уже подменили — убираем старый img
    const existingImg = parent.querySelector('.brand-mark-img');
    if (existingImg) existingImg.remove();

    if (logo) {
      icon.style.display = 'none';
      const img = document.createElement('img');
      img.src = logo;
      img.alt = 'logo';
      img.className = 'brand-mark-img';
      parent.insertBefore(img, icon);
    } else {
      icon.style.display = '';
    }
  });
  // 2) Favicon — подменяем если есть логотип
  if (logo) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = logo;
  }
}

/* =========================================================
   QR-КОД ЧЕКА
   ---------------------------------------------------------
   Хранится в settings.receiptQr = { url, caption, image }.
   url   — ссылка/текст внутри QR (QR генерируется из неё через window.KusQR)
   image — заранее загруженная картинка QR (Data URL), запасной вариант
   caption — подпись под QR на чеке
========================================================= */
function getReceiptQr() {
  try {
    const s = getSettings();
    const q = s.receiptQr || {};
    return { url: q.url || "", caption: q.caption || "", image: q.image || "" };
  } catch { return { url: "", caption: "", image: "" }; }
}

function saveReceiptQr(qr, byLogin) {
  const data = {
    url: (qr && qr.url) ? String(qr.url).trim() : "",
    caption: (qr && qr.caption) ? String(qr.caption).trim() : "",
    image: (qr && qr.image) ? qr.image : "",
  };
  saveSettings({ receiptQr: data }, byLogin);
  addLog(byLogin || "director", "QR-код чека сохранён");
  return { ok: true, receiptQr: data };
}

function removeReceiptQr(byLogin) {
  const cur = getSettings();
  delete cur.receiptQr;
  localStorage.setItem(AUTH_KEYS.SETTINGS, JSON.stringify(cur));
  addLog(byLogin || "director", "QR-код чека удалён");
  return { ok: true };
}

/* =========================================================
   ПРАВА РОЛЕЙ
   ---------------------------------------------------------
   Централизованная проверка что разрешено каждой роли.
========================================================= */
const ROLE_PERMISSIONS = {
  director: {
    canCreateOrder: true,
    canSeeFinance: true,
    canEditOrder: true,
    canDeleteOrder: true,
    canSeePrice: true,
    canManageUsers: true,
    canManageServices: true,
    canManageSettings: true,
    canAccessDirectorPanel: true,
    canAccessAccountant: true,
    canAccessArchive: true,
    canTakeOrder: false,
  },
  accountant: {
    canCreateOrder: true,
    canSeeFinance: true,
    canEditOrder: true,
    canDeleteOrder: false,
    canSeePrice: true,
    canManageUsers: false,
    canManageServices: false,
    canManageSettings: false,
    canAccessDirectorPanel: false,
    canAccessAccountant: true,
    canAccessArchive: true,
    canTakeOrder: false,
  },
  supervisor: {
    canCreateOrder: true,
    canSeeFinance: false,
    canEditOrder: true,
    canDeleteOrder: false,
    canSeePrice: true,
    canManageUsers: false,
    canManageServices: false,
    canManageSettings: false,
    canAccessDirectorPanel: false,
    canAccessAccountant: false,
    canAccessArchive: true,
    canTakeOrder: true,
  },
  worker: {
    canCreateOrder: false,
    canSeeFinance: false,
    canEditOrder: false,
    canDeleteOrder: false,
    canSeePrice: false,
    canManageUsers: false,
    canManageServices: false,
    canManageSettings: false,
    canAccessDirectorPanel: false,
    canAccessAccountant: false,
    canAccessArchive: false,
    canTakeOrder: true,
  },
};

function rolePerm(role, key) {
  const p = ROLE_PERMISSIONS[role];
  return !!(p && p[key]);
}

function canRole(session, key) {
  if (!session) return false;
  return rolePerm(session.role, key);
}

/* =========================================================
   ЗАГРУЖЕННОСТЬ ДНЯ — сколько заказов уже создано на дату
========================================================= */
function getDayLoadThreshold() {
  const s = getSettings();
  return Number(s.dayLoadThreshold) || 4;
}

function countOrdersOnDate(dateStr) {
  if (!dateStr) return 0;
  try {
    const orders = getAllOrders() || [];
    return orders.filter(o => (o.date || "") === dateStr).length;
  } catch { return 0; }
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
  const login = (userData.login || "").trim().toLowerCase();
  if (users.some(u => u.login === login)) {
    return { ok: false, error: "Логин уже существует" };
  }
  const role = userData.role || "worker";
  const fullName = (userData.fullName && userData.fullName.trim()) || login;

  // Создаём аккаунт в Supabase (Auth + профиль). Пароль хранит Supabase.
  if (typeof createUserRemote === "function") {
    const res = await createUserRemote({
      login, password: userData.password, role, fullName,
      phone: userData.phone || "", byLogin: createdByLogin,
    });
    if (!res.ok) return { ok: false, error: res.error || "Не удалось создать в базе" };
  }

  // Локальная копия (без пароля) — чтобы список и getUsers работали сразу
  const newUser = {
    id: "u_" + Date.now(),
    login: login,
    fullName: fullName,
    role: role,
    phone: userData.phone || "",
    address: "",
    avatar: "",
    lat: null,
    lng: null,
    profileComplete: role === "director",
    createdAt: new Date().toISOString(),
    createdBy: createdByLogin,
  };
  users.push(newUser);
  saveUsers(users);
  addLog(createdByLogin, `Создан аккаунт: ${newUser.login} (${roleLabel(newUser.role)})`);
  return { ok: true, user: newUser };
}

/* =========================================================
   ПРОФИЛЬ СОТРУДНИКА — заполняется при первом входе
========================================================= */
function getUserByLogin(login) {
  return getUsers().find(u => u.login === login) || null;
}

function updateUserProfile(login, profile, byLogin) {
  const users = getUsers();
  let u = users.find(x => x.login === login);
  if (!u) {
    // Пользователь живёт в Supabase, но ещё не в localStorage — создаём локальную запись
    const sess = (typeof getSession === "function") ? getSession() : null;
    u = { login: login, role: (sess && sess.role) || "worker" };
    users.push(u);
  }

  if (profile.firstName != null) u.firstName = profile.firstName.trim();
  if (profile.lastName != null) u.lastName = profile.lastName.trim();
  // fullName собираем из имени и фамилии (если они переданы)
  if (profile.firstName != null || profile.lastName != null) {
    u.fullName = [u.firstName || "", u.lastName || ""].join(" ").trim();
  } else if (profile.fullName != null) {
    u.fullName = profile.fullName.trim();
  }
  if (profile.phone != null) u.phone = profile.phone.trim();
  if (profile.address != null) u.address = profile.address.trim();
  if (profile.birthDate != null) u.birthDate = profile.birthDate;
  if (profile.avatar != null) u.avatar = profile.avatar;
  if (profile.passport != null) u.passport = profile.passport;
  if (profile.lat != null) u.lat = profile.lat;
  if (profile.lng != null) u.lng = profile.lng;
  u.profileComplete = true;
  u.profileCompletedAt = new Date().toISOString();

  saveUsers(users);

  // Обновляем сессию (имя могло поменяться)
  const s = getSession();
  if (s && s.login === login) {
    s.fullName = u.fullName;
    s.profileComplete = true;
    localStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify(s));
  }

  // Сохраняем профиль в Supabase (фоном): поля + profile_complete = true
  if (typeof pushProfile === "function") pushProfile(login, u);

  addLog(byLogin || login, `Заполнен профиль: ${login}`);
  return { ok: true, user: u };
}

function isProfileComplete(login) {
  const u = getUserByLogin(login);
  if (!u) return true; // на всякий случай не блокируем
  // Директор всегда считается заполненным
  if (u.role === "director") return true;
  return u.profileComplete === true;
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
  if (typeof deleteUserRemote === "function") deleteUserRemote(login);
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
  const map = { director: "Директор", accountant: "Бухгалтер", worker: "Сотрудник", supervisor: "Супервайзер" };
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

  const profileComplete = (u.role === "director") ? true : (u.profileComplete === true);
  const session = {
    login: u.login,
    role: u.role,
    fullName: u.fullName,
    profileComplete: profileComplete,
    loginAt: new Date().toISOString(),
  };
  localStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify(session));
  updateHeartbeat(u.login);
  addLog(u.login, `Вход в систему (${roleLabel(u.role)})`);
  return { ok: true, session, needsProfile: !profileComplete };
}

/* Проверка пароля без создания новой сессии — для подтверждения опасных действий */
async function verifyPassword(loginStr, password) {
  const users = getUsers();
  const u = users.find(x => x.login === loginStr);
  if (!u) return false;
  if (u.passwordHashed && window.hashPassword) {
    const hashedInput = await window.hashPassword(password);
    return u.password === hashedInput;
  }
  return u.password === password;
}

function logout() {
  const s = getSession();
  if (s) {
    addLog(s.login, "Выход из системы");
    setLastSeen(s.login);
  }
  // Убираем это устройство из списка активных сеансов (best-effort)
  try { if (typeof deleteCurrentDevice === "function") deleteCurrentDevice(); } catch (e) {}
  // Выходим и из Supabase Auth, иначе сессия останется активной
  try { if (window.sb && window.sb.auth) window.sb.auth.signOut(); } catch (e) {}
  localStorage.removeItem(AUTH_KEYS.SESSION);
}

function getSession() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.SESSION)); }
  catch { return null; }
}

/* =========================================================
   ЦЕНТРАЛИЗОВАННЫЙ РЕДИРЕКТ ПО РОЛИ
   director  → director.html
   worker    → worker.html
   accountant→ index.html (видит услуги, оформляет заказы)
========================================================= */
function homePageForRole(role) {
  if (role === "director") return "director.html";
  if (role === "worker") return "worker.html";
  if (role === "accountant") return "accountant.html";
  if (role === "supervisor") return "index.html";
  return "index.html";
}

function redirectByRole(session) {
  if (!session) { window.location.href = "login.html"; return; }
  // Если профиль ещё не заполнен — сначала анкета
  if (session.role !== "director" && session.profileComplete !== true) {
    window.location.href = "profile.html";
    return;
  }
  window.location.href = homePageForRole(session.role);
}

function requireAuth(allowedRoles) {
  const s = getSession();
  if (!s) {
    window.location.href = "login.html";
    return null;
  }
  // Если профиль не заполнен — гоним на анкету (но не зацикливаемся на самой profile.html)
  const onProfilePage = /profile\.html$/i.test(window.location.pathname);
  if (!onProfilePage && s.role !== "director" && s.profileComplete !== true) {
    window.location.href = "profile.html";
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(s.role)) {
    // Не ругаемся, просто отправляем на правильную страницу
    window.location.href = homePageForRole(s.role);
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
  // Применяем логотип после рендера шапки колбэком
  try { applyCompanyLogo(); } catch (e) { /* noop */ }
  // Перерисовываем логотип при изменении настроек (через firebase sync)
  window.addEventListener("storage", e => {
    if (e.key === "kus_settings") {
      try { applyCompanyLogo(); } catch (_) {}
    }
  });
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
   КЛИЕНТЫ (CRM) — собираются АВТОМАТИЧЕСКИ из заказов
   ---------------------------------------------------------
   Список клиентов отдельно НЕ хранится, а вычисляется из всех
   заказов (kus_all_orders) по номеру телефона — поэтому число
   заказов и доход всегда точные (редактирование заказа не
   задваивает счётчик). Отдельно (kus_client_prefs) хранится
   только назначенная скидка по каждому клиенту.
========================================================= */
const CLIENT_DISCOUNT_THRESHOLD = 3;   // с какого по счёту заказа предлагать скидку

/* Нормализация телефона в ключ: только цифры */
function normPhone(p) { return String(p || "").replace(/\D/g, ""); }

/* Сколько денег реально поступило в компанию по заказу */
function orderIncome(o) {
  if (!o) return 0;
  if (o.payment === "paid") return Number(o.price || o.total || 0);
  if (o.payment === "unpaid") return Number(o.advance || 0);
  return 0; // черновик — деньги ещё не поступили
}

function getClientPrefs() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.CLIENT_PREFS)) || {}; }
  catch { return {}; }
}
function saveClientPrefs(prefs) {
  localStorage.setItem(AUTH_KEYS.CLIENT_PREFS, JSON.stringify(prefs));
}

/* Главная функция: собрать список клиентов из всех заказов */
function getClients() {
  const orders = getAllOrders() || [];
  const prefs = getClientPrefs();
  const byPhone = {};

  orders.forEach(o => {
    const key = normPhone(o.phone);
    if (!key) return; // без телефона клиента не идентифицировать
    const ts = new Date(o.createdAt).getTime() || 0;
    if (!byPhone[key]) {
      byPhone[key] = {
        key, phone: o.phone || "", name: o.name || "—", address: o.address || "",
        ordersCount: 0, totalIncome: 0, totalPrice: 0,
        firstTs: ts, lastTs: ts, firstOrderAt: o.createdAt, lastOrderAt: o.createdAt,
      };
    }
    const c = byPhone[key];
    c.ordersCount += 1;
    c.totalIncome += orderIncome(o);
    c.totalPrice += Number(o.price || o.total || 0);
    if (ts >= c.lastTs) {  // берём самую свежую информацию о клиенте
      c.lastTs = ts; c.lastOrderAt = o.createdAt;
      if (o.name) c.name = o.name;
      if (o.address) c.address = o.address;
      if (o.phone) c.phone = o.phone;
    }
    if (ts < c.firstTs) { c.firstTs = ts; c.firstOrderAt = o.createdAt; }
  });

  const list = Object.values(byPhone).map(c => {
    const pref = prefs[c.key] || {};
    return {
      id: "cl_" + c.key,
      key: c.key,
      name: c.name,
      phone: c.phone,
      address: c.address,
      ordersCount: c.ordersCount,
      totalIncome: c.totalIncome,
      totalPrice: c.totalPrice,
      firstOrderAt: c.firstOrderAt,
      lastOrderAt: c.lastOrderAt,
      discount: Math.max(0, Math.min(100, Number(pref.discount) || 0)),
      discountSetAt: pref.discountSetAt || null,
      eligibleForDiscount: c.ordersCount >= CLIENT_DISCOUNT_THRESHOLD,
    };
  });
  list.sort((a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt));
  return list;
}

/* Найти клиента по телефону (для авто-скидки в форме заказа) */
function getClientByPhone(phone) {
  const key = normPhone(phone);
  if (!key) return null;
  return getClients().find(c => c.key === key) || null;
}

/* Назначить/снять скидку клиенту (percent 0..100) */
function setClientDiscount(phone, percent, byLogin) {
  const key = normPhone(phone);
  if (!key) return { ok: false, error: "Нет телефона" };
  const prefs = getClientPrefs();
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  prefs[key] = { ...(prefs[key] || {}), discount: p, discountSetAt: new Date().toISOString() };
  saveClientPrefs(prefs);
  addLog(byLogin || "director", p > 0 ? `Клиенту ${phone} назначена скидка ${p}%` : `Скидка клиента ${phone} снята`);
  return { ok: true, discount: p };
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
  const nowISO = new Date().toISOString();
  const newOrder = {
    id: order.id || ("ord_" + Date.now()),
    ...order,
    payment: order.payment || "unpaid",
    createdAt: order.createdAt || nowISO,
    createdBy: byLogin,
    takenBy: order.takenBy || null,
  };
  const idx = orders.findIndex(o => o.id === newOrder.id);

  // === Фиксируем даты финансовых событий для бухгалтерии ===
  // Дата получения аванса — фиксируется при первом создании если advance > 0
  if (idx === -1) {
    if ((newOrder.advance || 0) > 0 && !newOrder.advanceAt) {
      newOrder.advanceAt = nowISO;
    }
    // Если сразу создан как paid — фиксируем дату оплаты
    if (newOrder.payment === "paid" && !newOrder.paidAt) {
      newOrder.paidAt = nowISO;
    }
  } else {
    // При обновлении сохраняем уже зафиксированные даты
    const prev = orders[idx];
    newOrder.advanceAt = newOrder.advanceAt || prev.advanceAt || ((newOrder.advance || 0) > 0 ? nowISO : null);
    newOrder.paidAt = newOrder.paidAt || prev.paidAt || (newOrder.payment === "paid" ? nowISO : null);
  }

  if (idx >= 0) orders[idx] = newOrder;
  else orders.unshift(newOrder);
  localStorage.setItem(AUTH_KEYS.ORDERS, JSON.stringify(orders));
  addLog(byLogin, `${idx >= 0 ? "Обновлён" : "Создан"} заказ #${newOrder.id.slice(-6)} (${paymentLabel(newOrder.payment)})`);

  // CRM: после сохранения вычисляем статус постоянного клиента.
  // Эти поля НЕ попадают в хранилище (заказ уже записан выше) — только для UI.
  try {
    const isNewOrder = idx === -1;
    const client = getClientByPhone(newOrder.phone);
    if (client) {
      newOrder._loyalty = {
        isNewOrder: isNewOrder,
        ordersCount: client.ordersCount,
        eligible: client.eligibleForDiscount,
        discount: client.discount,
        justReached: isNewOrder && client.ordersCount === CLIENT_DISCOUNT_THRESHOLD,
        needsDiscount: isNewOrder && client.eligibleForDiscount && client.discount === 0,
        name: client.name,
        phone: client.phone,
      };
    }
  } catch (e) { /* ignore */ }

  // Сохраняем заказ в Supabase (в фоне). localStorage уже обновлён выше,
  // поэтому интерфейс реагирует мгновенно.
  if (typeof pushOrder === "function") pushOrder(newOrder);

  return newOrder;
}

function updateOrderPayment(orderId, payment, byLogin) {
  const orders = getAllOrders();
  const o = orders.find(x => x.id === orderId);
  if (!o) return;
  const old = o.payment;
  o.payment = payment;
  // Если только что переключили в "оплачен" — фиксируем дату фактической оплаты
  if (payment === "paid" && !o.paidAt) {
    o.paidAt = new Date().toISOString();
  }
  // Если откатили обратно (paid → unpaid) — сбрасываем дату оплаты,
  // чтобы при следующем "paid" она встала на новый момент
  if (payment !== "paid" && o.paidAt) {
    o.paidAt = null;
  }
  localStorage.setItem(AUTH_KEYS.ORDERS, JSON.stringify(orders));
  if (typeof pushOrder === "function") pushOrder(o);
  addLog(byLogin, `Заказ #${orderId.slice(-6)}: статус оплаты ${paymentLabel(old)} → ${paymentLabel(payment)}`);
}

/* =========================================================
   УДАЛЕНИЕ ЗАКАЗА — также чистит связанные транзакции в бухгалтерии
========================================================= */
function deleteOrder(orderId, byLogin) {
  const orders = getAllOrders();
  const target = orders.find(o => o.id === orderId);
  if (!target) return { ok: false, error: "Заказ не найден" };
  const filtered = orders.filter(o => o.id !== orderId);
  localStorage.setItem(AUTH_KEYS.ORDERS, JSON.stringify(filtered));
  if (typeof deleteOrderRemote === "function") deleteOrderRemote(orderId);
  addLog(byLogin || "director", `Удалён заказ #${orderId.slice(-6)} (${target.name || ""})`);
  return { ok: true };
}

function takeOrder(orderId, workerLogin, opts) {
  opts = opts || {};
  const orders = getAllOrders();
  const o = orders.find(x => x.id === orderId);
  if (!o) return { ok: false, error: "Заказ не найден" };
  if (o.takenBy && o.takenBy !== workerLogin) {
    return { ok: false, error: "Заказ уже взял другой сотрудник" };
  }
  o.takenBy = workerLogin;
  o.takenAt = new Date().toISOString();
  // Когда сотрудник планирует фактически начать работу
  if (opts.startDate) o.startDate = opts.startDate;
  if (opts.startTime) o.startTime = opts.startTime;
  localStorage.setItem(AUTH_KEYS.ORDERS, JSON.stringify(orders));
  if (typeof pushOrder === "function") pushOrder(o);
  const startInfo = opts.startDate ? ` (начало: ${opts.startDate}${opts.startTime ? " " + opts.startTime : ""})` : "";
  addLog(workerLogin, `Взял(а) заказ #${orderId.slice(-6)}${startInfo}`);
  return { ok: true };
}

/* =========================================================
   РЕДАКТИРОВАНИЕ ЗАКАЗА — для архива
   ---------------------------------------------------------
   Принимает patch (объект с обновлёнными полями) и сохраняет
   историю изменений в _editHistory.
========================================================= */
function updateOrder(orderId, patch, byLogin) {
  const orders = getAllOrders();
  const o = orders.find(x => x.id === orderId);
  if (!o) return { ok: false, error: "Заказ не найден" };

  // Поля разрешённые к редактированию
  const allowed = ["name", "phone", "address", "date", "time", "price", "advance", "payment"];
  const changes = [];
  allowed.forEach(k => {
    if (Object.prototype.hasOwnProperty.call(patch, k) && patch[k] !== o[k]) {
      changes.push(`${k}: ${o[k]} → ${patch[k]}`);
      o[k] = patch[k];
    }
  });

  if (changes.length === 0) return { ok: true, changed: false };

  // Если изменился статус оплаты — обработка paidAt
  if (changes.some(c => c.startsWith("payment:"))) {
    if (o.payment === "paid" && !o.paidAt) o.paidAt = new Date().toISOString();
    if (o.payment !== "paid") o.paidAt = null;
  }
  // Если изменился аванс с 0 — добавим advanceAt
  if (changes.some(c => c.startsWith("advance:")) && (o.advance || 0) > 0 && !o.advanceAt) {
    o.advanceAt = new Date().toISOString();
  }
  // Пересчёт remaining
  o.remaining = Math.max(0, (Number(o.price) || 0) - (Number(o.advance) || 0));
  o.total = Number(o.price) || 0;

  // История правок
  if (!Array.isArray(o._editHistory)) o._editHistory = [];
  o._editHistory.push({
    by: byLogin,
    at: new Date().toISOString(),
    changes: changes,
  });

  localStorage.setItem(AUTH_KEYS.ORDERS, JSON.stringify(orders));
  if (typeof pushOrder === "function") pushOrder(o);
  addLog(byLogin || "system", `Отредактирован заказ #${orderId.slice(-6)}: ${changes.join("; ")}`);
  return { ok: true, changed: true };
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
  if (typeof deleteAttendanceRemote === "function") deleteAttendanceRemote(id, removed.photoUrl);
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
   ТУРНИКЕТ: ПАРОЛЬ + РАСЧЁТ ЗАРАБОТКА
   ---------------------------------------------------------
   - Пароль турникета (нужен при приходе и уходе)
   - Дневная ставка: начисляется за каждый завершённый день
     (есть и приход, и уход в эту дату)
========================================================= */
const TURNSTILE_PASSWORD = "6699";          // код подтверждения прихода/ухода
const DAILY_WAGE = 200000;                   // сум за отработанный день

function checkTurnstilePassword(pw) {
  return String(pw).trim() === TURNSTILE_PASSWORD;
}

/* Возвращает локальную дату записи в формате YYYY-MM-DD */
function _attDateKey(entry) {
  const d = new Date(entry.timestamp || entry.createdAt);
  // локальная дата (не UTC) чтобы не путать смены
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* Группирует записи турникета сотрудника по дням и считает:
   - первый приход, последний уход, отработанные часы, заработок
   Возвращает массив объектов-смен (по дате). */
function getWorkDaysForUser(login) {
  const list = getAttendance()
    .filter(a => a.login === login)
    .sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt));

  const byDate = {};
  list.forEach(a => {
    const key = _attDateKey(a);
    if (!byDate[key]) byDate[key] = { date: key, ins: [], outs: [] };
    if (a.type === "check_in") byDate[key].ins.push(a);
    else if (a.type === "check_out") byDate[key].outs.push(a);
  });

  const days = Object.values(byDate).map(d => {
    const firstIn = d.ins.length ? d.ins[0] : null;
    const lastOut = d.outs.length ? d.outs[d.outs.length - 1] : null;
    let hours = 0;
    if (firstIn && lastOut) {
      const ms = new Date(lastOut.timestamp) - new Date(firstIn.timestamp);
      hours = ms > 0 ? ms / (1000 * 60 * 60) : 0;
    }
    // День считается оплаченным если есть И приход И уход
    const completed = !!(firstIn && lastOut);
    return {
      date: d.date,
      checkIn: firstIn ? firstIn.timestamp : null,
      checkOut: lastOut ? lastOut.timestamp : null,
      hours: Math.round(hours * 10) / 10,
      completed: completed,
      earned: completed ? DAILY_WAGE : 0,
    };
  });

  // Свежие дни сверху
  days.sort((a, b) => (a.date < b.date ? 1 : -1));
  return days;
}

/* Сводка по сотруднику: всего заработано, отработано дней, заработок за сегодня */
function getWageSummaryForUser(login) {
  const days = getWorkDaysForUser(login);
  const todayKey = _attDateKey({ timestamp: new Date().toISOString() });
  let totalEarned = 0, daysWorked = 0, todayEarned = 0;
  days.forEach(d => {
    if (d.completed) {
      totalEarned += d.earned;
      daysWorked++;
      if (d.date === todayKey) todayEarned = d.earned;
    }
  });
  return { totalEarned, daysWorked, todayEarned, dailyWage: DAILY_WAGE };
}

/* =========================================================
   АВАНСЫ (долг сотрудника, который отрабатывается сменами)
   ---------------------------------------------------------
   Директор выдаёт аванс. Это долг: при ставке DAILY_WAGE
   аванс 1 000 000 = 5 рабочих дней «отработки».
   Гасится ТОЛЬКО сменами, отработанными ПОСЛЕ выдачи аванса
   (для этого в момент выдачи запоминаем baselineEarned —
   сколько сотрудник уже заработал к этому моменту).
   Когда долг = 0 — аванс отработан.
   Структура записи:
   {
     id, login, amount, date (когда выдан), note,
     baselineEarned (заработок сотрудника на момент выдачи),
     settled (true когда долг закрыт/архивирован), settledAt,
     createdAt, createdBy
   }
========================================================= */
function getAdvances() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.ADVANCES)) || []; }
  catch { return []; }
}

function saveAdvancesRaw(list) {
  localStorage.setItem(AUTH_KEYS.ADVANCES, JSON.stringify(list));
}

function getAdvancesForUser(login) {
  return getAdvances().filter(a => a.login === login);
}

/* Активные (ещё не закрытые) авансы сотрудника */
function getActiveAdvancesForUser(login) {
  return getAdvancesForUser(login).filter(a => !a.settled);
}

function addAdvance(login, amount, dateGiven, note, byLogin) {
  amount = Number(amount) || 0;
  if (!login) return { ok: false, error: "Не выбран сотрудник" };
  if (amount <= 0) return { ok: false, error: "Сумма аванса должна быть больше нуля" };

  // Сколько сотрудник заработал к моменту выдачи — точка отсчёта для погашения
  const baseline = (typeof getWageSummaryForUser === "function")
    ? (getWageSummaryForUser(login).totalEarned || 0) : 0;

  const list = getAdvances();
  list.unshift({
    id: "adv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    login: login,
    amount: amount,
    date: dateGiven || new Date().toISOString().slice(0, 10),
    note: (note || "").trim(),
    baselineEarned: baseline,
    settled: false,
    settledAt: null,
    createdAt: new Date().toISOString(),
    createdBy: byLogin || "director",
  });
  saveAdvancesRaw(list);
  addLog(byLogin || "director", `Выдан аванс ${amount.toLocaleString("ru-RU")} сум сотруднику ${login}`);
  return { ok: true };
}

function deleteAdvance(id, byLogin) {
  const list = getAdvances();
  const target = list.find(a => a.id === id);
  if (!target) return { ok: false, error: "Аванс не найден" };
  saveAdvancesRaw(list.filter(a => a.id !== id));
  addLog(byLogin || "director", `Удалён аванс ${Number(target.amount).toLocaleString("ru-RU")} сум (${target.login})`);
  return { ok: true };
}

/* Закрыть (архивировать) все активные авансы сотрудника —
   например, когда долг отработан или прощён. */
function settleAdvancesForUser(login, byLogin) {
  const list = getAdvances();
  let changed = 0;
  list.forEach(a => {
    if (a.login === login && !a.settled) {
      a.settled = true;
      a.settledAt = new Date().toISOString();
      changed++;
    }
  });
  if (changed === 0) return { ok: false, error: "Нет активных авансов" };
  saveAdvancesRaw(list);
  addLog(byLogin || "director", `Долг по авансу закрыт: ${login}`);
  return { ok: true, settled: changed };
}

/* Главный расчёт: сколько должен сотрудник и сколько дней доработать.
   Возвращает:
     status: 'none' | 'owing' | 'cleared'
     totalAdvanced — сумма активных авансов
     repaid        — сколько уже отработано (в деньгах)
     debt          — остаток долга
     daysTotal     — на сколько дней всего был аванс
     daysWorkedOff — сколько дней уже отработал
     daysRemaining — сколько дней осталось доработать
     progress      — % погашения
*/
function getAdvanceStatusForUser(login) {
  const active = getActiveAdvancesForUser(login);
  const dailyRate = (typeof DAILY_WAGE !== "undefined") ? DAILY_WAGE : 0;

  if (active.length === 0) {
    return { status: "none", totalAdvanced: 0, repaid: 0, debt: 0,
             daysTotal: 0, daysWorkedOff: 0, daysRemaining: 0, progress: 0, count: 0 };
  }

  const totalAdvanced = active.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  // Точка отсчёта — заработок на момент самого старого активного аванса
  const minBaseline = active.reduce((m, a) => Math.min(m, Number(a.baselineEarned) || 0), Infinity);
  const currentEarned = (typeof getWageSummaryForUser === "function")
    ? (getWageSummaryForUser(login).totalEarned || 0) : 0;

  const earnedSince = Math.max(0, currentEarned - (isFinite(minBaseline) ? minBaseline : 0));
  const repaid = Math.min(totalAdvanced, earnedSince);
  const debt = Math.max(0, totalAdvanced - earnedSince);

  const daysTotal = dailyRate > 0 ? Math.ceil(totalAdvanced / dailyRate) : 0;
  const daysRemaining = dailyRate > 0 ? Math.ceil(debt / dailyRate) : 0;
  const daysWorkedOff = Math.max(0, daysTotal - daysRemaining);
  const progress = totalAdvanced > 0 ? Math.min(100, Math.round((repaid / totalAdvanced) * 100)) : 0;

  return {
    status: debt <= 0 ? "cleared" : "owing",
    totalAdvanced, repaid, debt,
    daysTotal, daysWorkedOff, daysRemaining, progress,
    count: active.length,
  };
}

/* =========================================================
   ДОПУСК К ТУРНИКЕТУ (наряд на смену)
   ---------------------------------------------------------
   По умолчанию турникет ЗАКРЫТ для всех. Директор «допускает»
   конкретных сотрудников на КОНКРETНУЮ дату (обычно сегодня).
   Только допущенные могут отметить приход и заработать день.
   Допуск дневной: завтра нужно допускать заново.
   Хранилище: { login: "YYYY-MM-DD" } — дата, на которую допущен.
========================================================= */
function todayLocalKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTurnstilePermits() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.TURNSTILE_PERMITS)) || {}; }
  catch { return {}; }
}

function saveTurnstilePermits(map) {
  localStorage.setItem(AUTH_KEYS.TURNSTILE_PERMITS, JSON.stringify(map));
}

/* Допущен ли сотрудник к турникету на СЕГОДНЯ */
function isTurnstileAllowed(login, dateKey) {
  const day = dateKey || todayLocalKey();
  const permits = getTurnstilePermits();
  return permits[login] === day;
}

/* Допустить / снять допуск на сегодня */
function setTurnstilePermit(login, allowed, byLogin) {
  const permits = getTurnstilePermits();
  if (allowed) {
    permits[login] = todayLocalKey();
  } else {
    delete permits[login];
  }
  saveTurnstilePermits(permits);
  addLog(byLogin || "director",
    allowed ? `Допустил к смене: ${login}` : `Снял допуск к смене: ${login}`);
  return { ok: true };
}

/* Допустить всех переданных сотрудников на сегодня */
function allowTurnstileForAll(logins, byLogin) {
  const permits = getTurnstilePermits();
  const today = todayLocalKey();
  (logins || []).forEach(l => { permits[l] = today; });
  saveTurnstilePermits(permits);
  addLog(byLogin || "director", `Допустил к смене всех (${(logins || []).length})`);
  return { ok: true };
}

/* Снять допуск со всех (закрыть смену для всех) */
function clearAllTurnstilePermits(byLogin) {
  saveTurnstilePermits({});
  addLog(byLogin || "director", "Снял допуск к смене со всех");
  return { ok: true };
}

/* Список логинов, допущенных сегодня */
function getAllowedTodayLogins() {
  const permits = getTurnstilePermits();
  const today = todayLocalKey();
  return Object.keys(permits).filter(l => permits[l] === today);
}

/* =========================================================
   ЗАДАНИЯ (директор → сотрудники)
   ---------------------------------------------------------
   Структура task:
   {
     id: "tsk_...",
     text: "Завтра объект...",
     fromLogin: "director",
     toLogins: ["ali", "vali"],
     createdAt: "2026-...",
     statuses: { "ali": "pending"|"done", "vali": "pending" },
     // если задание создано из чека:
     receiptOrderId: "ord_..." | null
   }
========================================================= */
function getTasks() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.TASKS)) || []; }
  catch { return []; }
}
function saveTasksRaw(list) {
  localStorage.setItem(AUTH_KEYS.TASKS, JSON.stringify(list));
}
function createTask(text, fromLogin, toLogins, opts) {
  if (!text || !text.trim()) return { ok:false, error:"empty text" };
  if (!Array.isArray(toLogins) || toLogins.length === 0) return { ok:false, error:"no recipients" };
  const tasks = getTasks();
  const statuses = {};
  toLogins.forEach(l => statuses[l] = "pending");
  const task = {
    id: "tsk_" + Date.now(),
    text: text.trim(),
    fromLogin,
    toLogins: toLogins.slice(),
    createdAt: new Date().toISOString(),
    statuses,
    receiptOrderId: (opts && opts.receiptOrderId) || null,
  };
  tasks.unshift(task);
  saveTasksRaw(tasks);

  // Дублируем в чат — каждому получателю отдельное сообщение
  const chats = getChats();
  toLogins.forEach(toLogin => {
    const key = chatKey(fromLogin, toLogin);
    if (!chats[key]) chats[key] = [];
    chats[key].push({
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2,6),
      from: fromLogin,
      to: toLogin,
      text: (opts && opts.receiptOrderId)
        ? `📋 ${text}\n\n[receipt:${opts.receiptOrderId}]`
        : `📋 ${text}`,
      createdAt: new Date().toISOString(),
      taskId: task.id,
      read: false,
    });
  });
  localStorage.setItem(AUTH_KEYS.CHATS, JSON.stringify(chats));

  addLog(fromLogin, `Отправил задание ${toLogins.length} сотруднику(ам)`);
  return { ok:true, task };
}
function getTasksForUser(login) {
  return getTasks().filter(t => Array.isArray(t.toLogins) && t.toLogins.includes(login));
}
function markTaskDone(taskId, byLogin) {
  const tasks = getTasks();
  const t = tasks.find(x => x.id === taskId);
  if (!t) return { ok:false };
  if (!t.statuses) t.statuses = {};
  t.statuses[byLogin] = "done";
  saveTasksRaw(tasks);
  addLog(byLogin, `Выполнил задание ${taskId.slice(-6)}`);
  return { ok:true };
}
function countNewTasksForUser(login) {
  return getTasksForUser(login).filter(t => (t.statuses && t.statuses[login]) === "pending").length;
}


(async function () {
  if (window.FB && !window.FB.isReady()) {
    try { await window.FB.waitReady(); } catch (e) { /* ignore */ }
  }
  initAuthSystem();
})();
