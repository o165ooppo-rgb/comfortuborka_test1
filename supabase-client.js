/* =========================================================
   SUPABASE CLIENT — общий клиент для всех страниц
   ---------------------------------------------------------
   Подключать ПОСЛЕ библиотеки supabase-js (CDN) и ДО auth.js.
   Публичный ключ (sb_publishable_...) можно держать прямо в коде —
   доступ к данным защищается правилами RLS на стороне базы.
========================================================= */
const SUPABASE_URL    = "https://qorkjomhpavwgafqhfgm.supabase.co";
const SUPABASE_KEY    = "sb_publishable_YKf-VT02UEXRw6RtIvHMOw_-iqwFxds";
const KU_EMAIL_DOMAIN = "komfort.local";   // технический домен для логинов

// Создаём клиент. Глобально доступен как window.sb на всех страницах.
window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Логин ("ali") -> технический email ("ali@komfort.local")
function loginToEmail(login) {
  return String(login || "").trim().toLowerCase() + "@" + KU_EMAIL_DOMAIN;
}

// Полный выход: и из Supabase, и из локальной сессии приложения.
async function appLogout() {
  try { await window.sb.auth.signOut(); } catch (e) {}
  try { localStorage.removeItem("kus_session"); } catch (e) {}
}
