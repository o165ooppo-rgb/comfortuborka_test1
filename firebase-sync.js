/* =========================================================
   FIREBASE SYNC LAYER — мост между localStorage и Firebase
   ---------------------------------------------------------
   Подключается ПЕРЕД auth.js во всех HTML.
   Перехватывает localStorage.setItem и дублирует запись в Firebase.
   Подписывается на изменения и обновляет localStorage.
========================================================= */

/* ---------- КОНФИГ FIREBASE ---------- */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDTuB1MxEY35fJgheI6GU5RrbfwvWk2G6I",
  authDomain: "comfortuborkasam.firebaseapp.com",
  databaseURL: "https://comfortuborkasam-default-rtdb.firebaseio.com",
  projectId: "comfortuborkasam",
  storageBucket: "comfortuborkasam.firebasestorage.app",
  messagingSenderId: "782092240269",
  appId: "1:782092240269:web:ff2dde42cf4edaae5869c4"
};
window.FIREBASE_NAMESPACE = "komfort";
window.FIREBASE_DEBUG = true;   // поставь false когда всё работает

/* ---------- КОД СИНХРОНИЗАЦИИ ---------- */
(function () {
  'use strict';

  const FB_SDK_VERSION = "10.12.5";
  const APP_URL = `https://www.gstatic.com/firebasejs/${FB_SDK_VERSION}/firebase-app.js`;
  const DB_URL  = `https://www.gstatic.com/firebasejs/${FB_SDK_VERSION}/firebase-database.js`;

  // Ключи localStorage → имена узлов в базе
  const SYNCED_KEYS = {
    "kus_users":         "users",
    "kus_services_v2":   "services",
    "kus_settings":      "settings",
    "kus_action_logs":   "logs",
    "kus_chats":         "chats",
    "kus_orders":        "orders_legacy",
    "kus_all_orders":    "orders",
    "kus_clients_db":    "clients",
    "kus_attendance":    "attendance",
    "kus_heartbeat":     "heartbeat",
    "kus_tasks":         "tasks",
    "finance_transactions_v2": "finance_tx",
    "finance_activity_logs":   "finance_logs",
  };

  const LOCAL_ONLY_KEYS = ["kus_session"];
  const namespace = window.FIREBASE_NAMESPACE || "komfort";
  const debug = !!window.FIREBASE_DEBUG;
  function log(...args) { if (debug) console.log("%c[FB]", "color:#1e40ff;font-weight:bold", ...args); }
  function warn(...args) { console.warn("[FB]", ...args); }

  // Состояние
  let fbApp = null;
  let fbDB = null;
  let fbReady = false;
  let pendingWrites = new Map();      // ключ → последнее значение
  let suppressNextWrite = new Set();  // ключи, чьи изменения пришли ИЗ Firebase
  let dbModuleRefs = null;

  // ========== Перехват Storage ==========
  const _origSetItem = Storage.prototype.setItem;
  const _origRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.setItem = function (key, value) {
    _origSetItem.call(this, key, value);
    if (this !== window.localStorage) return;
    if (LOCAL_ONLY_KEYS.includes(key)) return;
    if (!Object.prototype.hasOwnProperty.call(SYNCED_KEYS, key)) return;

    if (suppressNextWrite.has(key)) {
      suppressNextWrite.delete(key);
      log("⊘ skip echo write:", key);
      return;
    }
    queueWrite(key, value);
  };

  Storage.prototype.removeItem = function (key) {
    _origRemoveItem.call(this, key);
    if (this !== window.localStorage) return;
    if (!Object.prototype.hasOwnProperty.call(SYNCED_KEYS, key)) return;
    if (suppressNextWrite.has(key)) {
      suppressNextWrite.delete(key);
      return;
    }
    queueWrite(key, null);
  };

  function queueWrite(key, rawValue) {
    if (!fbReady) {
      pendingWrites.set(key, rawValue);
      log("⏳ queued write:", key, "(", rawValue ? rawValue.length + " bytes" : "null", ")");
      return;
    }
    doWrite(key, rawValue);
  }

  function doWrite(key, rawValue) {
    if (!fbDB || !dbModuleRefs) return;
    const path = `${namespace}/${SYNCED_KEYS[key]}`;
    const r = dbModuleRefs.ref(fbDB, path);
    let parsed = null;
    if (rawValue != null) {
      try { parsed = JSON.parse(rawValue); }
      catch { parsed = rawValue; }
    }
    log("→ WRITE", path, "(", rawValue ? rawValue.length + " bytes" : "null", ")");
    dbModuleRefs.set(r, parsed)
      .then(() => log("✓ saved:", path))
      .catch(err => warn("✗ write FAILED for", path, "—", err.code || err.message, err));
  }

  // ========== Synthetic storage event ==========
  function dispatchSyntheticStorageEvent(key, oldValue, newValue) {
    try {
      const ev = new StorageEvent("storage", {
        key, oldValue, newValue,
        storageArea: window.localStorage,
        url: window.location.href,
      });
      window.dispatchEvent(ev);
    } catch (e) {
      const ev = document.createEvent("Event");
      ev.initEvent("storage", true, true);
      ev.key = key; ev.oldValue = oldValue; ev.newValue = newValue;
      window.dispatchEvent(ev);
    }
  }

  // ========== Init ==========
  async function loadModule(url) {
    return await import(/* @vite-ignore */ url);
  }

  async function initFirebase() {
    if (!window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.databaseURL) {
      console.error("[FB] FIREBASE_CONFIG не задан или нет databaseURL.");
      return;
    }
    try {
      log("loading SDK v" + FB_SDK_VERSION + "...");
      const appMod = await loadModule(APP_URL);
      const dbMod  = await loadModule(DB_URL);
      fbApp = appMod.initializeApp(window.FIREBASE_CONFIG);
      fbDB  = dbMod.getDatabase(fbApp);
      dbModuleRefs = {
        ref: dbMod.ref,
        set: dbMod.set,
        get: dbMod.get,
        onValue: dbMod.onValue,
      };
      log("✓ SDK ready, app initialized");

      // Шаг 1: Слить состояния (initial merge)
      await initialMerge();

      // Шаг 2: Подписаться на real-time изменения
      subscribeAll();

      fbReady = true;

      // Шаг 3: Сбросить очередь записей в Firebase
      if (pendingWrites.size > 0) {
        log("flushing", pendingWrites.size, "deferred writes...");
        pendingWrites.forEach((rawValue, key) => doWrite(key, rawValue));
        pendingWrites.clear();
      }

      window.dispatchEvent(new CustomEvent("firebase-ready"));
      log("✓ READY");
    } catch (err) {
      console.error("[FB] init failed:", err);
    }
  }

  /**
   * При старте:
   * - в FB есть данные → копируем FB → LS (FB источник истины)
   * - в FB пусто, в LS есть → отправляем LS → FB (первичный seed)
   * - но если в LS только что появилась запись (она в pendingWrites) — НЕ перезаписываем её
   */
  async function initialMerge() {
    const { ref, get } = dbModuleRefs;
    const tasks = Object.entries(SYNCED_KEYS).map(async ([lsKey, fbKey]) => {
      try {
        const path = `${namespace}/${fbKey}`;
        const snap = await get(ref(fbDB, path));
        const localRaw = window.localStorage.getItem(lsKey);
        const hasPending = pendingWrites.has(lsKey);

        if (snap.exists()) {
          const fbRaw = JSON.stringify(snap.val());
          if (hasPending) {
            log("⏭ keep local (pending) for", fbKey);
            return;
          }
          if (fbRaw !== localRaw) {
            suppressNextWrite.add(lsKey);
            _origSetItem.call(window.localStorage, lsKey, fbRaw);
            log("← PULL", fbKey, "(", fbRaw.length, "bytes ) → localStorage");
          } else {
            log("= match", fbKey);
          }
        } else if (localRaw != null) {
          if (hasPending) {
            log("⏭ skip seed (pending write):", fbKey);
          } else {
            log("→ SEED", fbKey, "(", localRaw.length, "bytes ) from localStorage");
            doWrite(lsKey, localRaw);
          }
        } else {
          log("ø empty:", fbKey);
        }
      } catch (e) {
        warn("merge failed for", lsKey, e.code || e.message, e);
      }
    });
    await Promise.all(tasks);
  }

  function subscribeAll() {
    const { ref, onValue } = dbModuleRefs;
    Object.entries(SYNCED_KEYS).forEach(([lsKey, fbKey]) => {
      const r = ref(fbDB, `${namespace}/${fbKey}`);
      onValue(r, snap => {
        const oldRaw = window.localStorage.getItem(lsKey);
        const val = snap.exists() ? snap.val() : null;
        const newRaw = val == null ? null : JSON.stringify(val);
        if (oldRaw === newRaw) return;
        suppressNextWrite.add(lsKey);
        if (newRaw == null) {
          _origRemoveItem.call(window.localStorage, lsKey);
        } else {
          _origSetItem.call(window.localStorage, lsKey, newRaw);
        }
        log("⇆ EVENT", fbKey, "(", newRaw ? newRaw.length + " bytes" : "deleted", ")");
        dispatchSyntheticStorageEvent(lsKey, oldRaw, newRaw);
      }, err => {
        warn("subscription error", fbKey, err.code || err.message);
      });
    });
  }

  // ========== Public API ==========
  window.FB = {
    isReady: () => fbReady,
    waitReady: () => new Promise(resolve => {
      if (fbReady) return resolve();
      window.addEventListener("firebase-ready", () => resolve(), { once: true });
    }),
    refreshAll: async () => {
      if (!fbReady) return;
      await initialMerge();
    },
    diagnose: async () => {
      if (!fbReady) { console.log("[FB] not ready yet"); return; }
      const { ref, get } = dbModuleRefs;
      const out = {};
      for (const [lsKey, fbKey] of Object.entries(SYNCED_KEYS)) {
        try {
          const snap = await get(ref(fbDB, `${namespace}/${fbKey}`));
          const fbExists = snap.exists();
          const fbVal = fbExists ? snap.val() : null;
          const localRaw = window.localStorage.getItem(lsKey);
          out[fbKey] = {
            firebase: fbExists ? (Array.isArray(fbVal) ? `array(${fbVal.length})` : "obj") : "EMPTY",
            local: localRaw ? `${localRaw.length} bytes` : "EMPTY",
          };
        } catch (e) { out[fbKey] = { error: e.message }; }
      }
      console.table(out);
    },
  };

  // Старт
  initFirebase();
})();

/* =========================================================
   SHA-256 хеш для паролей (Web Crypto API)
========================================================= */
window.hashPassword = async function (password) {
  if (!password) return "";
  const salt = "komfort_uborka_v1_salt";
  const data = new TextEncoder().encode(salt + ":" + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};
