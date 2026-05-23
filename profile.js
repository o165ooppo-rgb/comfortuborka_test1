/* =========================================================
   PROFILE.JS — анкета первого входа сотрудника
   ---------------------------------------------------------
   Сотрудник заполняет: фото (аватар), имя, телефон, адрес
   (с авто-геолокацией). После сохранения → на свою страницу.
========================================================= */

let profileSession = null;
let _avatarDataUrl = "";
let _profileLat = null;
let _profileLng = null;

(async function initProfile() {
  // Рисуем переключатель языка + переводы
  const langRow = document.getElementById("profileLangRow");
  if (langRow && typeof renderLangSwitcher === "function") {
    langRow.innerHTML = renderLangSwitcher();
  }
  applyI18n();

  // Логотип
  (async function () {
    if (window.FB && !window.FB.isReady()) {
      try { await window.FB.waitReady(); } catch (e) {}
    }
    try { applyCompanyLogo(); } catch (e) {}
  })();

  // Проверяем сессию
  const s = getSession();
  if (!s) {
    window.location.href = "login.html";
    return;
  }
  profileSession = s;

  // Если профиль уже заполнен — нечего тут делать
  if (typeof isProfileComplete === "function" && isProfileComplete(s.login) && s.role !== "director") {
    redirectByRole(s);
    return;
  }
  // Директора не заставляем заполнять
  if (s.role === "director") {
    window.location.href = "director.html";
    return;
  }

  // Предзаполняем тем что уже есть (например логин в имя)
  const u = (typeof getUserByLogin === "function") ? getUserByLogin(s.login) : null;
  if (u) {
    if (u.fullName && u.fullName !== u.login) document.getElementById("pName").value = u.fullName;
    if (u.phone) document.getElementById("pPhone").value = u.phone;
    if (u.address) document.getElementById("pAddress").value = u.address;
    if (u.avatar) {
      _avatarDataUrl = u.avatar;
      showAvatar(u.avatar);
    }
  }

  // Перерисовка переключателя языка при смене
  window.addEventListener("lang-changed", () => {
    if (langRow) langRow.innerHTML = renderLangSwitcher();
    applyI18n();
  });
})();

/* === Аватар === */
function profileHandleAvatar(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("error", t("common.error") || "Ошибка", "Только изображения");
    event.target.value = "";
    return;
  }
  // Лимит 2 МБ до сжатия
  if (file.size > 2 * 1024 * 1024) {
    showToast("error", t("common.error") || "Ошибка", "Фото слишком большое (макс 2 МБ)");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    // Сжимаем изображение до ~256px чтобы не раздувать Firebase
    compressImage(e.target.result, 256, (compressed) => {
      _avatarDataUrl = compressed;
      showAvatar(compressed);
    });
  };
  reader.readAsDataURL(file);
  event.target.value = "";
}

function showAvatar(dataUrl) {
  const img = document.getElementById("profileAvatarImg");
  const empty = document.getElementById("profileAvatarEmpty");
  if (img) { img.src = dataUrl; img.style.display = "block"; }
  if (empty) empty.style.display = "none";
}

/* Сжатие изображения через canvas (квадрат, обрезка по центру) */
function compressImage(dataUrl, size, callback) {
  const img = new Image();
  img.onload = function () {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Обрезка по центру (cover)
    const min = Math.min(img.width, img.height);
    const sx = (img.width - min) / 2;
    const sy = (img.height - min) / 2;
    ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);

    try {
      callback(canvas.toDataURL("image/jpeg", 0.82));
    } catch (e) {
      callback(dataUrl); // fallback
    }
  };
  img.onerror = function () { callback(dataUrl); };
  img.src = dataUrl;
}

/* === Геолокация === */
function profileDetectLocation() {
  const btn = document.getElementById("pDetectBtn");
  const status = document.getElementById("pAddressStatus");
  if (!navigator.geolocation) {
    if (status) {
      status.style.display = "block";
      status.textContent = t("profile.geoUnavailable") || "Геолокация недоступна на этом устройстве";
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>${t("profile.detecting") || "Определяю..."}</span>`;
  }
  if (status) {
    status.style.display = "block";
    status.className = "address-status";
    status.textContent = t("profile.detecting") || "Определяю местоположение...";
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      _profileLat = pos.coords.latitude;
      _profileLng = pos.coords.longitude;
      // Обратное геокодирование через Nominatim
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${_profileLat}&lon=${_profileLng}&accept-language=ru`;
        const resp = await fetch(url, { headers: { "Accept": "application/json" } });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.display_name) {
            document.getElementById("pAddress").value = data.display_name;
            if (status) {
              status.className = "address-status address-status-ok";
              status.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${t("profile.geoOk") || "Адрес определён"}`;
            }
          }
        } else {
          throw new Error("geocode failed");
        }
      } catch (e) {
        // Если геокодер недоступен — хотя бы координаты
        document.getElementById("pAddress").value = `${_profileLat.toFixed(5)}, ${_profileLng.toFixed(5)}`;
        if (status) {
          status.className = "address-status address-status-ok";
          status.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${t("profile.geoCoords") || "Координаты получены"}`;
        }
      }
      resetDetectBtn();
    },
    (err) => {
      if (status) {
        status.className = "address-status address-status-err";
        let msg = t("profile.geoError") || "Не удалось определить местоположение";
        if (err.code === 1) msg = t("profile.geoDenied") || "Доступ к геолокации запрещён. Введите адрес вручную.";
        status.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}`;
      }
      resetDetectBtn();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function resetDetectBtn() {
  const btn = document.getElementById("pDetectBtn");
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> <span>${t("profile.detect") || "Определить"}</span>`;
  }
}

/* === Сохранение анкеты === */
function profileSubmit() {
  const errEl = document.getElementById("profileError");
  errEl.style.display = "none";

  const name = document.getElementById("pName").value.trim();
  const phone = document.getElementById("pPhone").value.trim();
  const address = document.getElementById("pAddress").value.trim();

  // Валидация
  if (!name) {
    showProfileError(t("profile.errName") || "Введите имя");
    return;
  }
  if (!phone) {
    showProfileError(t("profile.errPhone") || "Введите номер телефона");
    return;
  }
  if (phone.replace(/\D/g, "").length < 7) {
    showProfileError(t("profile.errPhoneBad") || "Введите корректный номер телефона");
    return;
  }
  if (!address) {
    showProfileError(t("profile.errAddress") || "Введите адрес проживания");
    return;
  }
  if (!_avatarDataUrl) {
    showProfileError(t("profile.errPhoto") || "Добавьте фото на аватар");
    return;
  }

  const res = updateUserProfile(profileSession.login, {
    fullName: name,
    phone: phone,
    address: address,
    avatar: _avatarDataUrl,
    lat: _profileLat,
    lng: _profileLng,
  }, profileSession.login);

  if (!res.ok) {
    showProfileError(res.error || "Не удалось сохранить");
    return;
  }

  showToast("success", t("common.success") || "Готово", t("profile.saved") || "Профиль заполнен!");

  // Небольшая задержка чтобы тост показался, потом редирект
  setTimeout(() => {
    const s = getSession();
    redirectByRole(s);
  }, 700);
}

function showProfileError(msg) {
  const errEl = document.getElementById("profileError");
  errEl.style.display = "block";
  errEl.textContent = msg;
}

function profileLogout() {
  logout();
  window.location.href = "login.html";
}

/* === Тосты + утилиты (на случай если из app.js недоступны) === */
function showToast(type, title, text) {
  const root = document.getElementById("toastRoot");
  if (!root) return;
  const icons = { success: "fa-circle-check", error: "fa-circle-xmark", info: "fa-circle-info" };
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
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}
