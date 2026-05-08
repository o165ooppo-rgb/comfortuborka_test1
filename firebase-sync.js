/* =========================================================
   FIREBASE SYNC LAYER — мост между localStorage и Firebase
   ---------------------------------------------------------
   Подключается ПЕРЕД auth.js.
   Перехватывает localStorage.setItem и дублирует запись в Firebase.
   Подписывается на изменения в Firebase и обновляет localStorage,
   эмулируя 'storage' event — благодаря этому весь существующий код
   (auth.js, app.js, director.js) работает без изменений.
========================================================= */

(function () {
  'use strict';

  // Импортируем модульный Firebase SDK динамически (через ESM CDN)
  // Используем глобальный промис, чтобы все потребители ждали готовности.
  const FB_SDK_VERSION = "10.12.5";
  const APP_URL = `https://www.gstatic.com/firebasejs/${FB_SDK_VERSION}/firebase-app.js`;
  const DB_URL  = `https://www.gstatic.com/firebasejs/${FB_SDK_VERSION}/firebase-database.js`;

  // Список ключей localStorage, которые синхронизируем с Firebase.
  // Каждый ключ становится узлом в базе: {namespace}/{shortName}
  const SYNCED_KEYS = {
    "kus_users":         "users",
    "kus_services_v2":   "services",
    "kus_settings":      "settings",
    "kus_action_logs":   "logs",
    "kus_chats":         "chats",
    "kus_orders":        "orders_legacy",   // на случай старого ключа
    "kus_all_orders":    "orders",
    "kus_clients_db":    "clients",
    "kus_attendance":    "attendance",
    "kus_heartbeat":     "heartbeat",
  };

  // Сессия — ЛОКАЛЬНАЯ, НЕ синхронизируется (у каждого пользователя своя сессия)
  const LOCAL_ONLY_KEYS = ["kus_session"];

  const namespace = window.FIREBASE_NAMESPACE || "komfort";
  const debug = !!window.FIREBASE_DEBUG;
  function log(...args) { if (debug) console.log("[FB]", ...args); }

  // Состояние
  let fbApp = null;
  let fbDB = null;
  let fbReady = false;
  let pendingWrites = [];   // запись поставленная в очередь до готовности Firebase
  let suppressWrites = new Set(); // ключи, чьи изменения пришли ИЗ Firebase (не дублируем обратно)
  let initialLoadDone = false;
  let dbModuleRefs = null;  // {ref, set, get, onValue, child}

  // ========== Перехват localStorage.setItem ==========
  const _origSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    _origSetItem.call(this, key, value);
    // Только для localStorage основного окна (не sessionStorage)
    if (this !== window.localStorage) return;
    if (LOCAL_ONLY_KEYS.includes(key)) return;
    if (!SYNCED_KEYS.hasOwnProperty(key)) return;

    // Если это запись пришла из Firebase — не дублируем обратно
    if (suppressWrites.has(key)) {
      suppressWrites.delete(key);
      return;
    }

    queueFirebaseWrite(key, value);
  };

  const _origRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.removeItem = function (key) {
    _origRemoveItem.call(this, key);
    if (this !== window.localStorage) return;
    if (!SYNCED_KEYS.hasOwnProperty(key)) return;
    if (suppressWrites.has(key)) {
      suppressWrites.delete(key);
      return;
    }
    queueFirebaseWrite(key, null);
  };

  function queueFirebaseWrite(key, rawValue) {
    if (!fbReady) {
      pendingWrites.push({ key, rawValue });
      return;
    }
    doFirebaseWrite(key, rawValue);
  }

  function doFirebaseWrite(key, rawValue) {
    if (!fbDB || !dbModuleRefs) return;
    const path = `${namespace}/${SYNCED_KEYS[key]}`;
    const r = dbModuleRefs.ref(fbDB, path);
    let parsed = null;
    if (rawValue != null) {
      try { parsed = JSON.parse(rawValue); }
      catch { parsed = rawValue; }
    }
    log("write →", path, parsed);
    dbModuleRefs.set(r, parsed).catch(err => {
      console.warn("[FB] write failed for", path, err);
    });
  }

  // ========== Эмуляция 'storage' event для текущей вкладки ==========
  function dispatchSyntheticStorageEvent(key, oldValue, newValue) {
    try {
      const ev = new StorageEvent("storage", {
        key, oldValue, newValue,
        storageArea: window.localStorage,
        url: window.location.href,
      });
      window.dispatchEvent(ev);
    } catch (e) {
      // Fallback для старых браузеров
      const ev = document.createEvent("Event");
      ev.initEvent("storage", true, true);
      ev.key = key; ev.oldValue = oldValue; ev.newValue = newValue;
      ev.storageArea = window.localStorage;
      window.dispatchEvent(ev);
    }
  }

  // ========== Загрузка SDK и инициализация ==========
  async function loadModule(url) {
    return await import(/* @vite-ignore */ url);
  }

  async function initFirebase() {
    if (!window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.databaseURL) {
      console.error("[FB] FIREBASE_CONFIG не задан или нет databaseURL. Проверьте firebase-config.js.");
      return;
    }
    try {
      const appMod = await loadModule(APP_URL);
      const dbMod  = await loadModule(DB_URL);
      fbApp = appMod.initializeApp(window.FIREBASE_CONFIG);
      fbDB  = dbMod.getDatabase(fbApp);
      dbModuleRefs = {
        ref: dbMod.ref,
        set: dbMod.set,
        get: dbMod.get,
        onValue: dbMod.onValue,
        child: dbMod.child,
      };
      log("SDK loaded, app initialized");

      // Шаг 1: Получаем все данные ОДНОКРАТНО (initial sync) — чтобы auth.js увидел реальную базу
      await initialPull();

      // Шаг 2: Подписываемся на изменения каждого ключа
      subscribeAll();

      fbReady = true;
      // Сбрасываем накопленные записи
      pendingWrites.forEach(w => doFirebaseWrite(w.key, w.rawValue));
      pendingWrites = [];

      window.dispatchEvent(new CustomEvent("firebase-ready"));
      log("ready, deferred writes flushed:", pendingWrites.length);
    } catch (err) {
      console.error("[FB] init failed:", err);
    }
  }

  async function initialPull() {
    const { ref, get } = dbModuleRefs;
    const tasks = Object.entries(SYNCED_KEYS).map(async ([lsKey, fbKey]) => {
      try {
        const snap = await get(ref(fbDB, `${namespace}/${fbKey}`));
        if (snap.exists()) {
          const val = snap.val();
          const json = JSON.stringify(val);
          // Записываем в localStorage без триггера обратной записи в Firebase
          suppressWrites.add(lsKey);
          _origSetItem.call(window.localStorage, lsKey, json);
          log("pull ←", fbKey, "(", json.length, "bytes)");
        } else {
          // В Firebase нет данных. Если в localStorage что-то есть — push'нём (первый раз)
          const local = window.localStorage.getItem(lsKey);
          if (local != null) {
            log("seed →", fbKey, "(from localStorage)");
            doFirebaseWrite(lsKey, local);
          }
        }
      } catch (e) {
        console.warn("[FB] pull failed", lsKey, e);
      }
    });
    await Promise.all(tasks);
    initialLoadDone = true;
  }

  function subscribeAll() {
    const { ref, onValue } = dbModuleRefs;
    Object.entries(SYNCED_KEYS).forEach(([lsKey, fbKey]) => {
      const r = ref(fbDB, `${namespace}/${fbKey}`);
      onValue(r, snap => {
        const oldRaw = window.localStorage.getItem(lsKey);
        const val = snap.exists() ? snap.val() : null;
        const newRaw = val == null ? null : JSON.stringify(val);
        if (oldRaw === newRaw) return;   // нет изменений
        suppressWrites.add(lsKey);
        if (newRaw == null) {
          _origRemoveItem.call(window.localStorage, lsKey);
        } else {
          _origSetItem.call(window.localStorage, lsKey, newRaw);
        }
        log("event ←", fbKey, "(", newRaw ? newRaw.length : 0, "bytes)");
        // Эмулируем storage event чтобы UI обновился (как при изменении в другой вкладке)
        dispatchSyntheticStorageEvent(lsKey, oldRaw, newRaw);
      }, err => {
        console.warn("[FB] subscription error", fbKey, err);
      });
    });
  }

  // ========== Публичный API ==========
  window.FB = {
    isReady: () => fbReady,
    waitReady: () => new Promise(resolve => {
      if (fbReady) return resolve();
      window.addEventListener("firebase-ready", () => resolve(), { once: true });
    }),
    // Принудительная перезагрузка из Firebase
    refreshAll: async () => {
      if (!fbReady) return;
      await initialPull();
    },
  };

  // Старт
  initFirebase();
})();

/* =========================================================
   Простой SHA-256 хеш для паролей (Web Crypto API)
   Используется auth.js для безопасного хранения паролей
========================================================= */
window.hashPassword = async function (password) {
  if (!password) return "";
  // Соль фиксированная (в Пути A — норм, для Пути B перейдём на Firebase Auth)
  const salt = "komfort_uborka_v1_salt";
  const data = new TextEncoder().encode(salt + ":" + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

// Синхронная версия для legacy кода (использует кеш — для большинства паролей хеш будет в памяти)
window._hashCache = {};
window.hashPasswordSync = function (password) {
  if (window._hashCache[password]) return window._hashCache[password];
  // Если ещё не хеширован — возвращаем как есть (legacy plaintext)
  // и параллельно хешируем для следующего раза
  window.hashPassword(password).then(h => { window._hashCache[password] = h; });
  return password;
};
