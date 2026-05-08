/* =========================================================
   FIREBASE CONFIG — заполните своими данными из Firebase Console
   ---------------------------------------------------------
   Project Settings → General → Your apps → Web app → Config
   Realtime Database → URL вверху страницы
========================================================= */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDR6lhTwBswpDkAgehZLFNXSXDXDXTN1JE",
  authDomain: "comfortuborka-55464.firebaseapp.com",
  databaseURL: "https://comfortuborka-55464-default-rtdb.firebaseio.com",
  projectId: "comfortuborka-55464",
  storageBucket: "comfortuborka-55464.firebasestorage.app",
  messagingSenderId: "1031167721994",
  appId: "1:1031167721994:web:b849cd3c78b80fb23a55f3"
};

// Префикс для путей в базе (на случай если несколько копий приложения используют одну базу)
window.FIREBASE_NAMESPACE = "komfort";

// Включить отладочные логи синхронизации в консоль браузера
window.FIREBASE_DEBUG = false;
