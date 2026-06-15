/* =========================================================
   SUPABASE DATA LAYER — постепенный перенос данных на Supabase
   ---------------------------------------------------------
   Подключать ПОСЛЕ auth.js (и после supabase-client.js).
   Сейчас здесь ЗАКАЗЫ. Принцип:
     • при загрузке страницы тянем заказы из Supabase в localStorage
       и перерисовываем (pullOrders);
     • saveOrder пишет в localStorage (мгновенно) и в фоне в Supabase
       (pushOrder) — поэтому остальной код работает как раньше.
========================================================= */

/* ---- Сопоставление колонок: строка БД -> объект приложения ---- */
function mapOrderFromDB(r) {
  const ex = r.extra || {};
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    address: r.address,
    date: r.order_date,
    time: r.order_time,
    serviceKey: r.service_key,
    serviceTitle: r.service_title,
    serviceTitleRu: r.service_title_ru,
    serviceTitleUz: r.service_title_uz,
    serviceTitleEn: r.service_title_en,
    price: Number(r.price) || 0,
    advance: Number(r.advance) || 0,
    total: Number(r.total) || 0,
    remaining: Number(r.remaining) || 0,
    payment: r.payment || "unpaid",
    discountPercent: Number(r.discount_percent) || 0,
    geo: (r.geo_lat != null || r.geo_lng != null)
      ? { lat: r.geo_lat, lng: r.geo_lng, accuracy: r.geo_accuracy }
      : null,
    takenBy: r.taken_by || null,
    createdBy: r.created_by || null,
    advanceAt: r.advance_at || null,
    paidAt: r.paid_at || null,
    createdAt: r.created_at,
    takenAt: ex.takenAt || null,
    startDate: ex.startDate || null,
    startTime: ex.startTime || null,
    _editHistory: ex.editHistory || undefined,
  };
}

/* ---- Сопоставление: объект приложения -> строка БД ---- */
function mapOrderToDB(o) {
  return {
    id: o.id,
    name: o.name || null,
    phone: o.phone || null,
    address: o.address || null,
    order_date: o.date || null,
    order_time: o.time || null,
    service_key: o.serviceKey || null,
    service_title: o.serviceTitle || null,
    service_title_ru: o.serviceTitleRu || null,
    service_title_uz: o.serviceTitleUz || null,
    service_title_en: o.serviceTitleEn || null,
    price: o.price ?? 0,
    advance: o.advance ?? 0,
    total: o.total ?? o.price ?? 0,
    remaining: o.remaining ?? 0,
    payment: o.payment || "unpaid",
    discount_percent: o.discountPercent ?? 0,
    geo_lat: o.geo ? o.geo.lat : null,
    geo_lng: o.geo ? o.geo.lng : null,
    geo_accuracy: o.geo ? o.geo.accuracy : null,
    taken_by: o.takenBy || null,
    created_by: o.createdBy || null,
    advance_at: o.advanceAt || null,
    paid_at: o.paidAt || null,
    created_at: o.createdAt || new Date().toISOString(),
    extra: {
      takenAt: o.takenAt || null,
      startDate: o.startDate || null,
      startTime: o.startTime || null,
      editHistory: o._editHistory || null,
    },
  };
}

/* ---- Тянем все заказы из Supabase в localStorage ---- */
async function pullOrders() {
  if (!window.sb) return null;
  try {
    const { data, error } = await window.sb
      .from("orders").select("*").order("created_at", { ascending: false });
    if (error) { console.error("[supabase] pullOrders:", error.message); return null; }
    const mapped = (data || []).map(mapOrderFromDB);
    localStorage.setItem("kus_all_orders", JSON.stringify(mapped));
    return mapped;
  } catch (e) { console.error("[supabase] pullOrders:", e); return null; }
}

/* ---- Пишем один заказ в Supabase (upsert по id) ---- */
async function pushOrder(order) {
  if (!window.sb || !order || !order.id) return;
  try {
    // Проверяем, что есть активная сессия Supabase (иначе запрос уйдёт как аноним -> 401)
    const { data: sess } = await window.sb.auth.getSession();
    if (!sess || !sess.session) {
      console.error("[supabase] Заказ НЕ сохранён: НЕТ активной сессии Supabase. " +
        "Зайди в систему заново на том же адресе сайта (http://localhost/...) и повтори.");
      return;
    }
    const { error } = await window.sb
      .from("orders").upsert(mapOrderToDB(order), { onConflict: "id" });
    if (error) console.error("[supabase] pushOrder ОШИБКА:", error.message);
    else console.log("[supabase] заказ сохранён в базе ✓", order.id);
  } catch (e) { console.error("[supabase] pushOrder:", e); }
}

/* ---- Удаление заказа из Supabase ---- */
async function deleteOrderRemote(orderId) {
  if (!window.sb || !orderId) return;
  try {
    const { error } = await window.sb.from("orders").delete().eq("id", orderId);
    if (error) console.error("[supabase] deleteOrderRemote:", error.message);
  } catch (e) { console.error("[supabase] deleteOrderRemote:", e); }
}

/* =========================================================
   ПОСЕЩАЕМОСТЬ (турникет) — фото в Storage, метаданные в таблице
========================================================= */
function mapAttendanceFromDB(r) {
  return {
    id: r.id,
    login: r.login,
    fullName: r.full_name,
    role: r.role,
    type: r.type,
    photoUrl: r.photo_url || null,   // путь к фото в Storage (не base64)
    timestamp: r.created_at,
    lat: r.lat,
    lng: r.lng,
    accuracy: r.accuracy,
    address: r.address || null,
  };
}

/* Загрузка селфи в приватный бакет attendance, возвращает путь */
async function uploadAttendancePhoto(dataUrl, path) {
  if (!window.sb || !dataUrl) return null;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const { error } = await window.sb.storage.from("attendance")
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error) { console.error("[supabase] загрузка селфи:", error.message); return null; }
    return path;
  } catch (e) { console.error("[supabase] загрузка селфи:", e); return null; }
}

/* Подписанная ссылка для просмотра селфи (бакет приватный) */
async function getAttendanceSignedUrl(path) {
  if (!window.sb || !path) return null;
  try {
    const { data, error } = await window.sb.storage.from("attendance")
      .createSignedUrl(path, 3600);   // ссылка живёт 1 час
    if (error) { console.error("[supabase] подписанная ссылка:", error.message); return null; }
    return data.signedUrl;
  } catch (e) { return null; }
}

/* Отметка прихода/ухода: фото -> Storage, запись -> таблица attendance */
async function pushAttendance(record) {
  if (!window.sb) return { ok: false, error: "Нет подключения к базе" };
  try {
    const { data: sess } = await window.sb.auth.getSession();
    if (!sess || !sess.session) {
      return { ok: false, error: "Нет активной сессии. Зайдите в систему заново." };
    }
    const id = "att_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    const timestamp = new Date().toISOString();

    let photoUrl = null;
    if (record.photo) {
      photoUrl = await uploadAttendancePhoto(record.photo, `${record.login}/${id}.jpg`);
      if (!photoUrl) return { ok: false, error: "Не удалось загрузить фото" };
    }

    const row = {
      id,
      login: record.login,
      full_name: record.fullName || record.login,
      role: record.role || "worker",
      type: record.type || "check_in",
      photo_url: photoUrl,
      lat: record.lat == null ? null : Number(record.lat),
      lng: record.lng == null ? null : Number(record.lng),
      accuracy: record.accuracy == null ? null : Math.round(Number(record.accuracy)),
      address: record.address || null,
      created_at: timestamp,
    };
    const { error } = await window.sb.from("attendance").insert(row);
    if (error) { console.error("[supabase] pushAttendance:", error.message); return { ok: false, error: error.message }; }

    // Локально (без base64) — чтобы статистика и зарплата обновились сразу
    const entry = {
      id, login: row.login, fullName: row.full_name, role: row.role, type: row.type,
      photoUrl, timestamp, lat: row.lat, lng: row.lng, accuracy: row.accuracy, address: row.address,
    };
    try {
      const list = (typeof getAttendance === "function") ? getAttendance() : [];
      list.push(entry);
      if (typeof saveAttendanceList === "function") saveAttendanceList(list);
      else localStorage.setItem("kus_attendance", JSON.stringify(list));
    } catch (e) {}
    if (typeof addLog === "function") {
      addLog(entry.login, "Турникет: " + (entry.type === "check_in" ? "Пришёл на работу" : "Ушёл с работы") + (entry.address ? " (" + entry.address + ")" : ""));
    }
    console.log("[supabase] посещаемость сохранена ✓", id);
    return { ok: true, entry };
  } catch (e) {
    console.error("[supabase] pushAttendance:", e);
    return { ok: false, error: "Ошибка сохранения" };
  }
}

/* Тянем посещаемость из Supabase в localStorage */
async function pullAttendance() {
  if (!window.sb) return null;
  try {
    const { data, error } = await window.sb
      .from("attendance").select("*").order("created_at", { ascending: true });
    if (error) { console.error("[supabase] pullAttendance:", error.message); return null; }
    const mapped = (data || []).map(mapAttendanceFromDB);
    localStorage.setItem("kus_attendance", JSON.stringify(mapped));
    return mapped;
  } catch (e) { console.error("[supabase] pullAttendance:", e); return null; }
}

/* Удаление записи посещаемости (строка в таблице + фото в Storage) */
async function deleteAttendanceRemote(id, photoUrl) {
  if (!window.sb || !id) return;
  try {
    if (photoUrl) {
      await window.sb.storage.from("attendance").remove([photoUrl]);
    }
    const { error } = await window.sb.from("attendance").delete().eq("id", id);
    if (error) console.error("[supabase] deleteAttendanceRemote:", error.message);
  } catch (e) { console.error("[supabase] deleteAttendanceRemote:", e); }
}

/* =========================================================
   ПРОФИЛЬ сотрудника — сохранение в таблицу users (Supabase)
   (аватарка пока base64 в avatar_url; позже можно вынести в Storage)
========================================================= */
async function pushProfile(login, u) {
  if (!window.sb) return;
  try {
    const { data: sess } = await window.sb.auth.getSession();
    if (!sess || !sess.session) { console.error("[supabase] pushProfile: нет сессии"); return; }
    const uid = sess.session.user.id;   // обновляем профиль текущего пользователя
    const upd = {
      first_name: u.firstName || null,
      last_name: u.lastName || null,
      full_name: u.fullName || null,
      phone: u.phone || null,
      address: u.address || null,
      birth_date: u.birthDate || null,
      lat: u.lat == null ? null : Number(u.lat),
      lng: u.lng == null ? null : Number(u.lng),
      avatar_url: u.avatar || null,
      passport_url: u.passport || null,
      profile_complete: true,
    };
    const { error } = await window.sb.from("users").update(upd).eq("id", uid);
    if (error) console.error("[supabase] pushProfile:", error.message);
    else console.log("[supabase] профиль сохранён ✓");
  } catch (e) { console.error("[supabase] pushProfile:", e); }
}

/* =========================================================
   СОТРУДНИКИ (users) — список + создание
========================================================= */
function mapUserFromDB(r) {
  return {
    id: r.id,
    login: r.login,
    role: r.role,
    firstName: r.first_name || "",
    lastName: r.last_name || "",
    fullName: r.full_name || r.login,
    phone: r.phone || "",
    address: r.address || "",
    birthDate: r.birth_date || "",
    avatar: r.avatar_url || "",
    passport: r.passport_url || "",
    lat: r.lat,
    lng: r.lng,
    profileComplete: r.profile_complete === true,
    createdBy: r.created_by || "",
    createdAt: r.created_at,
  };
}

/* Тянем сотрудников из Supabase в localStorage */
async function pullUsers() {
  if (!window.sb) return null;
  try {
    const { data, error } = await window.sb
      .from("users").select("*").order("created_at", { ascending: true });
    if (error) { console.error("[supabase] pullUsers:", error.message); return null; }
    const mapped = (data || []).map(mapUserFromDB);
    localStorage.setItem("kus_users", JSON.stringify(mapped));
    return mapped;
  } catch (e) { console.error("[supabase] pullUsers:", e); return null; }
}

/* Создание сотрудника: регистрируем в Auth отдельным клиентом (чтобы не
   сбросить сессию директора), затем директор проставляет роль/имя/телефон. */
async function createUserRemote(opts) {
  if (!window.sb || typeof supabase === "undefined") {
    return { ok: false, error: "Нет подключения к базе" };
  }
  try {
    const login = (opts.login || "").trim().toLowerCase().split("@")[0];
    const email = login + "@" + (typeof KU_EMAIL_DOMAIN !== "undefined" ? KU_EMAIL_DOMAIN : "komfort.local");
    // Отдельный клиент без сохранения сессии — не сбивает вход директора
    const tmp = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "sb-temp-create" },
    });
    const { data, error } = await tmp.auth.signUp({ email, password: opts.password });
    if (error) {
      let msg = error.message || "Не удалось создать";
      if (/already registered|exists/i.test(msg)) msg = "Логин уже занят";
      if (/at least 6/i.test(msg)) msg = "Пароль минимум 6 символов";
      if (/signups? not allowed|disabled/i.test(msg)) msg = "В Supabase выключена регистрация (включи «Allow new users to sign up»)";
      if (/rate limit|too many|429/i.test(msg)) msg = "Слишком много регистраций подряд — подожди минуту или подними лимит в Authentication → Rate Limits";
      return { ok: false, error: msg };
    }
    const newId = data && data.user && data.user.id;
    if (!newId) return { ok: false, error: "Не удалось создать пользователя" };

    // Директор проставляет роль/имя/телефон в профиле
    const upd = {
      role: opts.role || "worker",
      full_name: opts.fullName || null,
      phone: opts.phone || null,
      created_by: opts.byLogin || null,
    };
    const { error: uErr } = await window.sb.from("users").update(upd).eq("id", newId);
    if (uErr) console.error("[supabase] createUserRemote (роль):", uErr.message);
    console.log("[supabase] сотрудник создан ✓", login);
    return { ok: true, id: newId, login };
  } catch (e) {
    console.error("[supabase] createUserRemote:", e);
    return { ok: false, error: "Ошибка создания" };
  }
}

/* Удаление сотрудника: удаляем профиль из users.
   (Запись в Auth остаётся — без профиля войти нельзя; полное удаление
   требует серверных прав, добавим позже через Edge Function.) */
async function deleteUserRemote(login) {
  if (!window.sb || !login) return;
  try {
    const { error } = await window.sb.from("users").delete().eq("login", login);
    if (error) console.error("[supabase] deleteUserRemote:", error.message);
  } catch (e) { console.error("[supabase] deleteUserRemote:", e); }
}

/* ---- После загрузки страницы: подтянуть заказы и перерисовать ---- */
async function initSupabaseData() {
  // Тянем данные только для вошедшего пользователя (анонимной странице это не нужно).
  try { if (typeof getSession === "function" && !getSession()) return; } catch (e) {}
  await pullOrders();
  await pullAttendance();
  await pullUsers();
  // Перерисовываем только те части, что есть на текущей странице:
  try { if (typeof renderOrderHistory === "function") renderOrderHistory(); } catch (e) {}
  try { if (typeof renderDirOrders === "function") renderDirOrders(); } catch (e) {}
  try { if (typeof renderDashboard === "function") renderDashboard(); } catch (e) {}
  try { if (typeof renderClients === "function") renderClients(); } catch (e) {}
  try { if (typeof renderAttendance === "function") renderAttendance(); } catch (e) {}
  try { if (typeof renderStats === "function") renderStats(); } catch (e) {}
  try { if (typeof renderEmployees === "function") renderEmployees(); } catch (e) {}
}

/* =========================================================
   БЛОБ-СИНХРОНИЗАЦИЯ — ЗАМЕНА FIREBASE
   ---------------------------------------------------------
   Услуги, настройки, чаты, задания, логи, финансы и статус
   «в сети» хранятся в таблице app_state как jsonb по ключу.
   Принцип ровно как раньше с Firebase:
     • перехватываем localStorage.setItem/removeItem и дублируем
       запись в Supabase (pushState);
     • подписываемся на изменения в реальном времени (subscribeState)
       и кладём свежие данные обратно в localStorage, рассылая
       событие "storage" — поэтому остальной код менять НЕ нужно.
   ========================================================= */

/* Ключ localStorage  ->  ключ в таблице app_state */
const STATE_KEYS = {
  "kus_services_v2":               "services",
  "kus_settings":                  "settings",
  "kus_action_logs":               "logs",
  "kus_chats":                     "chats",
  "kus_heartbeat":                 "heartbeat",
  "kus_tasks":                     "tasks",
  "kus_salary_advances":           "salary_advances",
  "kus_turnstile_permits":         "turnstile_permits",
  "finance_transactions_v2":       "finance_tx",
  "finance_activity_logs":         "finance_logs",
  "kus_finance_deleted_order_ids": "finance_deleted_orders",
};

/* Эти ключи НЕ синхронизируем через app_state:
   - kus_session  — локальная сессия устройства
   - kus_all_orders / kus_attendance / kus_users — это реляционные
     таблицы (orders/attendance/users), у них свои pull/push выше. */

const _origSetItem    = Storage.prototype.setItem;
const _origRemoveItem = Storage.prototype.removeItem;
const _suppress = new Set();   // ключи, которые пришли ИЗ Supabase (не слать обратно)

/* ---------- Перехват записи в localStorage ---------- */
Storage.prototype.setItem = function (key, value) {
  _origSetItem.call(this, key, value);
  if (this !== window.localStorage) return;
  if (!Object.prototype.hasOwnProperty.call(STATE_KEYS, key)) return;
  if (_suppress.has(key)) { _suppress.delete(key); return; }
  pushState(key, value);
};

Storage.prototype.removeItem = function (key) {
  _origRemoveItem.call(this, key);
  if (this !== window.localStorage) return;
  if (!Object.prototype.hasOwnProperty.call(STATE_KEYS, key)) return;
  if (_suppress.has(key)) { _suppress.delete(key); return; }
  pushState(key, null);
};

/* ---------- Запись блоба в Supabase ---------- */
/* Имеет ли текущая роль право писать этот ключ (зеркало правил RLS).
   Не даёт коду слать заведомо запрещённые записи и ловить 403. */
function _canWriteState(stateKey) {
  const role = (typeof getSession === "function" && getSession()) ? getSession().role : null;
  if (stateKey === "settings" || stateKey === "services" || stateKey === "salary_advances" || stateKey === "turnstile_permits") {
    return role === "director";
  }
  if (stateKey === "finance_tx" || stateKey === "finance_logs" || stateKey === "finance_deleted_orders") {
    return role === "director" || role === "accountant";
  }
  return true; // chats, tasks, logs, heartbeat — любой вошедший
}

async function pushState(lsKey, rawValue) {
  if (!window.sb) return;
  const stateKey = STATE_KEYS[lsKey];
  if (!_canWriteState(stateKey)) return;   // нет прав по роли — тихо пропускаем (не ловим 403)
  try {
    const { data: sess } = await window.sb.auth.getSession();
    if (!sess || !sess.session) return;   // без сессии запись запрещена (RLS)

    let parsed = null;
    if (rawValue != null) {
      try { parsed = JSON.parse(rawValue); } catch { parsed = rawValue; }
    }
    const login = (typeof getSession === "function" && getSession())
      ? getSession().login : null;

    const { error } = await window.sb.from("app_state").upsert(
      { key: stateKey, value: parsed, updated_at: new Date().toISOString(), updated_by: login },
      { onConflict: "key" }
    );
    if (error) console.warn("[supabase] pushState", stateKey, "—", error.message);
  } catch (e) { console.warn("[supabase] pushState", e); }
}

/* ---------- Кладём блоб из Supabase в localStorage ---------- */
function applyState(stateKey, value) {
  const lsKey = Object.keys(STATE_KEYS).find(k => STATE_KEYS[k] === stateKey);
  if (!lsKey) return;
  const newRaw = value == null ? null : JSON.stringify(value);
  const oldRaw = window.localStorage.getItem(lsKey);
  if (oldRaw === newRaw) return;

  _suppress.add(lsKey);   // чтобы перехватчик не отправил это обратно в базу
  if (newRaw == null) _origRemoveItem.call(window.localStorage, lsKey);
  else                _origSetItem.call(window.localStorage, lsKey, newRaw);

  dispatchSyntheticStorageEvent(lsKey, oldRaw, newRaw);
}

/* Рассылаем событие "storage" — как делал Firebase. На него уже
   подписан весь остальной код (чаты, настройки, логотип и т.д.). */
function dispatchSyntheticStorageEvent(key, oldValue, newValue) {
  try {
    window.dispatchEvent(new StorageEvent("storage", {
      key, oldValue, newValue,
      storageArea: window.localStorage,
      url: window.location.href,
    }));
  } catch (e) {
    const ev = document.createEvent("Event");
    ev.initEvent("storage", true, true);
    ev.key = key; ev.oldValue = oldValue; ev.newValue = newValue;
    window.dispatchEvent(ev);
  }
}

/* ---------- Первичная загрузка всех блобов ---------- */
async function pullState() {
  if (!window.sb) return;
  try {
    const { data, error } = await window.sb.from("app_state").select("*");
    if (error) { console.error("[supabase] pullState:", error.message); return; }
    const remoteKeys = new Set();
    (data || []).forEach(row => { remoteKeys.add(row.key); applyState(row.key, row.value); });

    // Первичный посев: то, что есть локально, но ещё нет в базе — заливаем.
    // Только ключи, которые текущая роль вправе писать (иначе RLS вернёт 403).
    Object.entries(STATE_KEYS).forEach(([lsKey, stateKey]) => {
      if (!remoteKeys.has(stateKey) && _canWriteState(stateKey)) {
        const local = window.localStorage.getItem(lsKey);
        if (local != null) pushState(lsKey, local);
      }
    });
  } catch (e) { console.error("[supabase] pullState:", e); }
}

/* ---------- Realtime-подписки (замена Firebase onValue) ---------- */
let _rtSubscribed = false;
function subscribeRealtime() {
  if (!window.sb || _rtSubscribed) return;
  _rtSubscribed = true;

  // Блобы: услуги, настройки, чаты, задания, финансы, логи, heartbeat
  window.sb.channel("rt_app_state")
    .on("postgres_changes", { event: "*", schema: "public", table: "app_state" }, payload => {
      const row = payload.new || payload.old;
      if (!row || !row.key) return;
      applyState(row.key, payload.eventType === "DELETE" ? null : row.value);
    })
    .subscribe();

  // Заказы: при любом изменении — перетянуть и перерисовать
  window.sb.channel("rt_orders")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
      pullOrders().then(rerenderAll);
    })
    .subscribe();

  // Посещаемость
  window.sb.channel("rt_attendance")
    .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => {
      pullAttendance().then(rerenderAll);
    })
    .subscribe();

  // Устройства: если НАШ сеанс завершили (revoked или удалили) — выходим
  window.sb.channel("rt_devices")
    .on("postgres_changes", { event: "*", schema: "public", table: "user_devices" }, payload => {
      const row = payload.new || payload.old;
      if (!row || row.id !== getDeviceId()) return;
      if (payload.eventType === "DELETE" || (payload.new && payload.new.revoked === true)) {
        forceLogoutRevoked();
      }
    })
    .subscribe();
}

function rerenderAll() {
  ["renderOrderHistory", "renderDirOrders", "renderDashboard", "renderClients",
   "renderAttendance", "renderStats", "renderEmployees"].forEach(fn => {
    try { if (typeof window[fn] === "function") window[fn](); } catch (e) {}
  });
}

/* =========================================================
   SHA-256 для паролей (перенесено из firebase-sync.js).
   Реальные пароли теперь хранит Supabase Auth, но эта функция
   ещё используется в auth.js (инициализация локального директора),
   поэтому оставляем, чтобы ничего не падало.
========================================================= */
window.hashPassword = window.hashPassword || async function (password) {
  if (!password) return "";
  const salt = "komfort_uborka_v1_salt";
  const data = new TextEncoder().encode(salt + ":" + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0")).join("");
};

/* =========================================================
   СОВМЕСТИМОСТЬ: window.FB
   ---------------------------------------------------------
   Firebase удалён, но в коде могли остаться вызовы window.FB.
   Этот «заглушка-объект» делает их безвредными: waitReady сразу
   готов, refreshAll перетягивает данные из Supabase.
   Благодаря ему можно не бояться пропустить мелкую правку в HTML.
========================================================= */
window.FB = window.FB || {
  isReady: () => true,
  waitReady: () => Promise.resolve(),
  refreshAll: async () => {
    await pullState();
    await pullOrders();
    await pullAttendance();
    await pullUsers();
    rerenderAll();
  },
  diagnose: async () => {
    if (!window.sb) { console.log("[supabase] нет клиента"); return; }
    const { data, error } = await window.sb.from("app_state").select("key, updated_at");
    if (error) console.error(error.message); else console.table(data);
  },
};

/* =========================================================
   ФОТО В ЧАТЕ — загрузка в приватный Storage (бакет "chat")
   ---------------------------------------------------------
   Сами сообщения остаются в app_state (лёгкие), а фото лежат
   в Storage. В сообщении хранится только путь к файлу.
========================================================= */

/* Сжатие изображения через canvas (до maxSize по длинной стороне) */
function _compressChatImage(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (Math.max(w, h) > maxSize) {
          const k = maxSize / Math.max(w, h);
          w = Math.round(w * k); h = Math.round(h * k);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("compress failed")), "image/jpeg", 0.78);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* Загружает фото в бакет chat. Возвращает путь (chatKey/msgId.jpg) или null. */
async function uploadChatImage(file, chatKeyStr) {
  if (!window.sb || !file) return null;
  try {
    const blob = await _compressChatImage(file, 1280);
    const name = `${chatKeyStr}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await window.sb.storage.from("chat").upload(name, blob, {
      contentType: "image/jpeg", upsert: false,
    });
    if (error) { console.warn("[chat] upload:", error.message); return null; }
    return name;
  } catch (e) { console.warn("[chat] upload:", e.message || e); return null; }
}

/* Кэш подписанных ссылок на фото (чтобы не дёргать Storage на каждый рендер) */
const _chatUrlCache = {};
async function getChatImageUrl(path) {
  if (!path || !window.sb) return null;
  if (_chatUrlCache[path] && _chatUrlCache[path].exp > Date.now()) return _chatUrlCache[path].url;
  try {
    const { data, error } = await window.sb.storage.from("chat").createSignedUrl(path, 3600);
    if (error || !data) return null;
    _chatUrlCache[path] = { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 };
    return data.signedUrl;
  } catch (e) { return null; }
}

/* =========================================================
   УСТРОЙСТВА (активные сеансы) + контроль завершения
   ---------------------------------------------------------
   • Каждое устройство имеет свой id (kus_device_id в localStorage).
   • При входе устройство регистрируется в таблице user_devices.
   • На каждой странице обновляем last_seen (heartbeat).
   • Если строка устройства удалена (сеанс завершён с другого
     устройства) — этот сеанс выходит из системы.
========================================================= */
function getDeviceId() {
  let id = null;
  try { id = localStorage.getItem("kus_device_id"); } catch (e) {}
  if (!id) {
    id = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : "dev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    try { localStorage.setItem("kus_device_id", id); } catch (e) {}
  }
  return id;
}

/* Человеческое название устройства из User-Agent */
function describeDevice() {
  const ua = navigator.userAgent || "";
  let platform = "Веб";
  if (/Android/i.test(ua)) platform = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) platform = "iPhone/iPad";
  else if (/Windows/i.test(ua)) platform = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) platform = "macOS";
  else if (/Linux/i.test(ua)) platform = "Linux";

  let browser = "браузер";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";

  const standalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
  const name = (standalone ? "Приложение" : browser) + " · " + platform;
  return { name, platform, browser };
}

/* Регистрация устройства. Возвращает true при успехе. */
async function registerThisDevice() {
  if (!window.sb) return false;
  try {
    const { data: sess } = await window.sb.auth.getSession();
    if (!sess || !sess.session) return false;
    const uid = sess.session.user.id;
    const login = (typeof getSession === "function" && getSession()) ? getSession().login : null;
    const d = describeDevice();
    const { error } = await window.sb.from("user_devices").upsert({
      id: getDeviceId(),
      user_id: uid,
      login: login,
      device_name: d.name,
      user_agent: (navigator.userAgent || "").slice(0, 300),
      platform: d.platform,
      last_seen: new Date().toISOString(),
    }, { onConflict: "id" });
    if (error) { console.warn("[devices] register:", error.message); return false; }
    return true;
  } catch (e) { console.warn("[devices] register:", e.message || e); return false; }
}

/* Новый id устройства — вызывается при входе (каждый вход = свой сеанс). */
function resetDeviceId() {
  const id = (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : "dev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  try { localStorage.setItem("kus_device_id", id); } catch (e) {}
  return id;
}

/* Проверка сеанса.
   • записи нет        → просто перерегистрируем (НЕ выкидываем!)
   • запись revoked    → сеанс был завершён → выходим
   • иначе             → обновляем last_seen */
async function enforceThisDevice() {
  if (!window.sb) return;
  let sess;
  try { ({ data: sess } = await window.sb.auth.getSession()); } catch (e) { return; }
  if (!sess || !sess.session) return;   // нет сессии Supabase — выходить не надо

  const id = getDeviceId();
  try {
    const { data, error } = await window.sb
      .from("user_devices").select("*").eq("id", id).maybeSingle();
    if (error) return;                 // таблицы нет / ошибка — НЕ ломаем приложение
    if (!data) { await registerThisDevice(); return; }   // нет записи → восстановить, без выхода
    if (data.revoked === true) { await forceLogoutRevoked(); return; }  // явно завершён
    // heartbeat
    await window.sb.from("user_devices").update({ last_seen: new Date().toISOString() }).eq("id", id);
  } catch (e) { /* тихо */ }
}

async function forceLogoutRevoked() {
  try { localStorage.removeItem("kus_session"); } catch (e) {}
  try { localStorage.removeItem("kus_device_id"); } catch (e) {}
  try { localStorage.removeItem("kus_device_seen"); } catch (e) {}
  try { await window.sb.auth.signOut(); } catch (e) {}
  const msg = (typeof t === "function" && t("device.revoked") !== "device.revoked")
    ? t("device.revoked")
    : "Этот сеанс был завершён на другом устройстве. Войдите снова.";
  try { alert(msg); } catch (e) {}
  window.location.href = "login.html";
}

/* Удалить текущее устройство (при обычном выходе) */
async function deleteCurrentDevice() {
  if (!window.sb) return;
  try {
    const id = getDeviceId();
    await window.sb.from("user_devices").delete().eq("id", id);
    try { localStorage.removeItem("kus_device_seen"); } catch (e) {}
  } catch (e) {}
}

/* Плавающая кнопка «Безопасность» (на всех страницах под логином) */
function injectSecurityButton() {
  if (document.getElementById("kusSecurityBtn")) return;
  // не показываем на самой странице безопасности и на входе
  const path = (location.pathname || "").toLowerCase();
  if (path.endsWith("account.html") || path.endsWith("login.html")) return;

  // Размещение без перекрытий:
  //  • есть левый сайдбар (бухгалтерия) → кнопку вправо
  //  • есть пузыри чата справа (сотрудник) → кнопку влево
  //  • иначе → влево
  const hasLeftSidebar = !!document.querySelector(".acc-sidebar");
  const hasRightBubbles = !!document.getElementById("chatBubble") || !!document.getElementById("myTasksBubble");
  const side = (hasLeftSidebar && !hasRightBubbles) ? "right:18px" : "left:18px";

  const btn = document.createElement("a");
  btn.id = "kusSecurityBtn";
  btn.href = "account.html";
  btn.title = (typeof t === "function" && t("account.title") !== "account.title") ? t("account.title") : "Безопасность";
  btn.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
  btn.style.cssText = [
    "position:fixed", side, "bottom:18px", "z-index:1200",
    "width:46px", "height:46px", "border-radius:50%",
    "display:flex", "align-items:center", "justify-content:center",
    "background:#2440f0", "color:#fff", "font-size:18px",
    "box-shadow:0 10px 26px rgba(36,64,240,.42)", "text-decoration:none",
    "border:none", "cursor:pointer",
  ].join(";");
  document.body.appendChild(btn);
}

/* ---------- После загрузки страницы: подтянуть всё и подписаться ---------- */
async function initSupabaseData() {
  // Анонимной странице (логин) синхронизация не нужна.
  try { if (typeof getSession === "function" && !getSession()) return; } catch (e) {}

  await pullState();        // услуги, настройки, чаты, задания, финансы
  await pullOrders();
  await pullAttendance();
  await pullUsers();

  await enforceThisDevice();  // проверка активного сеанса (Telegram-style)
  injectSecurityButton();

  subscribeRealtime();      // живые обновления на всех устройствах

  // Перерисовываем то, что есть на текущей странице:
  rerenderAll();
  try { window.dispatchEvent(new Event("supabase-data-ready")); } catch (e) {}
}

window.addEventListener("load", () => { initSupabaseData(); });
