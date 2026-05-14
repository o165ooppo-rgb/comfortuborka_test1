/* =========================================================
   PWA REGISTRATION + INSTALL PROMPT
   Подключается на ВСЕХ страницах сразу после <body>.
   ---------------------------------------------------------
   - Регистрирует service worker
   - Перехватывает beforeinstallprompt и показывает свою кнопку
   - На iOS Safari (где нет beforeinstallprompt) показывает инструкцию
========================================================= */

(function () {
  'use strict';

  // 1) Регистрация service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { scope: "./" })
        .then(reg => {
          console.log("[PWA] SW registered, scope:", reg.scope);
          // Если есть обновление — попросить SW активироваться сразу
          reg.addEventListener("updatefound", () => {
            const sw = reg.installing;
            if (!sw) return;
            sw.addEventListener("statechange", () => {
              if (sw.state === "installed" && navigator.serviceWorker.controller) {
                console.log("[PWA] new SW installed — taking over");
                sw.postMessage("skipWaiting");
              }
            });
          });
        })
        .catch(err => console.warn("[PWA] SW register failed:", err));
    });

    // Когда новый SW активируется — мягко перезагружаемся
    let _reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (_reloaded) return;
      _reloaded = true;
      console.log("[PWA] reloading to use new SW");
      window.location.reload();
    });
  }

  // 2) Кнопка «Установить приложение»
  let _deferredPrompt = null;
  let _installBtn = null;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
           window.navigator.standalone === true;
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  }

  function createInstallButton() {
    if (_installBtn) return _installBtn;
    const btn = document.createElement("button");
    btn.id = "pwaInstallBtn";
    btn.className = "pwa-install-btn";
    btn.innerHTML = '<i class="fa-solid fa-download"></i><span>Установить</span>';
    btn.style.display = "none";
    btn.addEventListener("click", handleInstallClick);
    document.body.appendChild(btn);
    _installBtn = btn;
    return btn;
  }

  function setInstallLabel() {
    if (!_installBtn) return;
    let label = "Установить";
    if (typeof t === "function") {
      try {
        const lang = (typeof getCurrentLang === "function") ? getCurrentLang() : "ru";
        if (lang === "uz") label = "O'rnatish";
        else if (lang === "en") label = "Install app";
        else label = "Установить";
      } catch (e) { /* ignore */ }
    }
    const span = _installBtn.querySelector("span");
    if (span) span.textContent = label;
  }

  async function handleInstallClick() {
    if (!_deferredPrompt) {
      // iOS Safari — показываем инструкцию
      if (isIOS()) showIosInstructions();
      return;
    }
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    console.log("[PWA] install choice:", outcome);
    _deferredPrompt = null;
    if (_installBtn) _installBtn.style.display = "none";
  }

  function showIosInstructions() {
    // Простая модалка с инструкцией для iOS
    const existing = document.getElementById("pwaIosModal");
    if (existing) { existing.style.display = "flex"; return; }

    const modal = document.createElement("div");
    modal.id = "pwaIosModal";
    modal.className = "pwa-ios-modal";
    modal.innerHTML = `
      <div class="pwa-ios-content">
        <button class="pwa-ios-close" aria-label="Close">&times;</button>
        <div class="pwa-ios-icon"><i class="fa-solid fa-mobile-screen"></i></div>
        <h3>Установить приложение</h3>
        <ol class="pwa-ios-steps">
          <li>Нажмите <i class="fa-solid fa-arrow-up-from-bracket"></i> «Поделиться» внизу Safari</li>
          <li>Прокрутите вниз и выберите <strong>«На экран Домой»</strong></li>
          <li>Нажмите <strong>«Добавить»</strong> в правом верхнем углу</li>
        </ol>
      </div>
    `;
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.classList.contains("pwa-ios-close")) {
        modal.style.display = "none";
      }
    });
    document.body.appendChild(modal);
  }

  // 3) Слушаем beforeinstallprompt (Chrome/Edge/Android)
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    console.log("[PWA] install prompt available");
    const btn = createInstallButton();
    setInstallLabel();
    if (!isStandalone()) btn.style.display = "inline-flex";
  });

  // 4) После установки — скрыть кнопку
  window.addEventListener("appinstalled", () => {
    console.log("[PWA] app installed");
    if (_installBtn) _installBtn.style.display = "none";
    _deferredPrompt = null;
  });

  // 5) iOS Safari не поддерживает beforeinstallprompt — показываем кнопку через 3 сек если не установлено
  window.addEventListener("DOMContentLoaded", () => {
    if (isStandalone()) return;
    if (isIOS() && isSafari()) {
      setTimeout(() => {
        const btn = createInstallButton();
        setInstallLabel();
        btn.style.display = "inline-flex";
      }, 2500);
    }
  });

  // 6) Перерисовка лейбла при смене языка
  window.addEventListener("lang-changed", setInstallLabel);
})();
