/* =========================================================
   KOMFORT UBORKA — Service Worker
   Кэширует оболочку приложения для офлайн-режима.
   ВАЖНО: Supabase / Nominatim всегда идут в сеть, шрифты — из кэша.
========================================================= */

const CACHE_VERSION = "komfort-v16";  // ← БУМПАЙ при выпуске новой версии
const CACHE_NAME = `komfort-shell-${CACHE_VERSION}`;

// Файлы оболочки — без них приложение не работает
const SHELL_FILES = [
  "./",
  "./login.html",
  "./index.html",
  "./director.html",
  "./worker.html",
  "./accountant.html",
  "./archive.html",
  "./profile.html",
  "./account.html",
  "./style.css",
  "./theme.css",
  "./director.css",
  "./accountant.css",
  "./archive.css",
  "./i18n.js",
  "./auth.js",
  "./supabase-client.js",
  "./supabase-data.js",
  "./qrcode.js",
  "./app.js",
  "./director.js",
  "./worker.js",
  "./accountant.js",
  "./archive.js",
  "./profile.js",
  "./account.js",
  "./pwa.js",
  "./manifest.json",
  "./icon-96.png",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./favicon-32.png",
];

/* =========================================================
   INSTALL — кладём оболочку в кэш
========================================================= */
self.addEventListener("install", (event) => {
  console.log("[SW] Install:", CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll() упадёт если хоть один файл не загрузится — поэтому каждый отдельно
      return Promise.all(
        SHELL_FILES.map(url =>
          cache.add(url).catch(err => console.warn("[SW] failed to cache", url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

/* =========================================================
   ACTIVATE — удаляем старые кэши
========================================================= */
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate:", CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k.startsWith("komfort-shell-") && k !== CACHE_NAME)
            .map(k => { console.log("[SW] deleting old cache:", k); return caches.delete(k); })
      )
    ).then(() => self.clients.claim())
  );
});

/* =========================================================
   FETCH — стратегии запросов
========================================================= */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Только GET запросы кэшируем
  if (event.request.method !== "GET") return;

  // Supabase (REST, Realtime, Storage, Auth) — НИКОГДА не кэшируем (всегда сеть)
  if (url.hostname.includes("supabase.co") ||
      url.hostname.includes("supabase.in")) {
    // Network-only с тихим фолбэком
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ offline: true }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Nominatim (обратное геокодирование) — всегда сеть, не кэшируем
  if (url.hostname.includes("nominatim")) {
    event.respondWith(fetch(event.request).catch(() => new Response("", { status: 503 })));
    return;
  }

  // CDN библиотек (Chart.js, Moment.js, Font Awesome, Google Fonts) — stale-while-revalidate
  // После первой удачной загрузки они лежат в кеше и работают даже когда заблокированы
  if (url.hostname.includes("cdnjs.cloudflare.com") ||
      url.hostname.includes("cdn.jsdelivr.net") ||
      url.hostname.includes("unpkg.com") ||
      url.hostname.includes("fonts.googleapis.com") ||
      url.hostname.includes("fonts.gstatic.com")) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Свои файлы — cache-first с фолбэком на сеть
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Прочее — пытаемся сеть, при ошибке отдаём из кэша если есть
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

/* =========================================================
   СТРАТЕГИИ
========================================================= */

// Cache-first: если есть в кэше — отдаём оттуда, в фоне обновим
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Фоновое обновление (необязательное)
    fetch(request).then(resp => {
      if (resp.ok) {
        caches.open(CACHE_NAME).then(c => c.put(request, resp));
      }
    }).catch(() => {});
    return cached;
  }
  // Не было в кэше — идём в сеть и сохраняем
  try {
    const resp = await fetch(request);
    if (resp.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, resp.clone());
    }
    return resp;
  } catch (err) {
    // Офлайн и нет в кэше — отдаём что-нибудь
    const fallback = await caches.match("./login.html");
    return fallback || new Response("Offline", { status: 503 });
  }
}

// Stale-while-revalidate: отдаём из кэша мгновенно, в фоне обновляем
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(resp => {
    if (resp.ok) cache.put(request, resp.clone());
    return resp;
  }).catch(() => cached);
  return cached || fetchPromise;
}

/* =========================================================
   СООБЩЕНИЯ ОТ СТРАНИЦЫ (например, для принудительного обновления)
========================================================= */
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
