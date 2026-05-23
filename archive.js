/* =========================================================
   ARCHIVE.JS — Архив всех чеков
   ---------------------------------------------------------
   Доступен: director, accountant, supervisor.
   Worker — без доступа (redirect).
========================================================= */

let archiveSession = null;
let _editingOrderId = null;
let _currentReceiptOrderId = null;

bootstrapApp({ allowedRoles: ["director", "accountant", "supervisor"] }, function (s) {
  archiveSession = s;

  // Заполняем chip пользователя
  const chip = document.getElementById("archiveUserChip");
  if (chip) {
    let icon = "fa-user";
    if (s.role === "director") icon = "fa-shield-halved";
    else if (s.role === "accountant") icon = "fa-calculator";
    else if (s.role === "supervisor") icon = "fa-user-shield";
    chip.innerHTML = `<i class="fa-solid ${icon}"></i> ${escapeHtml(s.fullName)}`;
  }

  populateServiceFilter();
  renderArchive();

  // Слушаем изменения фильтров
  ["aFilterSearch", "aFilterFrom", "aFilterTo", "aFilterPayment", "aFilterService"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", renderArchive);
      el.addEventListener("change", renderArchive);
    }
  });

  // Авто-обновление при изменении заказов
  window.addEventListener("storage", e => {
    if (e.key === "kus_all_orders") renderArchive();
    if (e.key === "kus_services_v2") populateServiceFilter();
  });

  // Смена языка
  window.addEventListener("lang-changed", () => {
    applyI18n();
    populateServiceFilter();
    renderArchive();
  });

  applyI18n();
});

function archiveGoBack() {
  // Возвращаемся туда, откуда логичнее для роли
  if (archiveSession.role === "director") window.location.href = "director.html";
  else if (archiveSession.role === "accountant") window.location.href = "accountant.html";
  else window.location.href = "index.html";
}

function doArchiveLogout() {
  if (!confirm(t("session.logoutConfirm") || "Точно выйти?")) return;
  logout();
  window.location.href = "login.html";
}

/* =========================================================
   ФИЛЬТРЫ
========================================================= */
function getArchiveFilters() {
  return {
    search: (document.getElementById("aFilterSearch")?.value || "").toLowerCase().trim(),
    from: document.getElementById("aFilterFrom")?.value || "",
    to: document.getElementById("aFilterTo")?.value || "",
    payment: document.getElementById("aFilterPayment")?.value || "",
    service: document.getElementById("aFilterService")?.value || "",
  };
}

function archiveResetFilters() {
  ["aFilterSearch", "aFilterFrom", "aFilterTo", "aFilterPayment", "aFilterService"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  renderArchive();
}

function populateServiceFilter() {
  const sel = document.getElementById("aFilterService");
  if (!sel) return;
  // Берём уникальные услуги из всех заказов
  const orders = getAllOrders() || [];
  const titles = new Set();
  const lang = getCurrentLang();
  orders.forEach(o => {
    let title = o.serviceTitle || "—";
    if (lang === "ru" && o.serviceTitleRu) title = o.serviceTitleRu;
    else if (lang === "uz" && o.serviceTitleUz) title = o.serviceTitleUz;
    else if (lang === "en" && o.serviceTitleEn) title = o.serviceTitleEn;
    if (title && title !== "—") titles.add(title);
  });
  const current = sel.value;
  sel.innerHTML = `<option value="">${escapeHtml(t("archive.serviceAll") || "Все услуги")}</option>` +
    Array.from(titles).sort().map(tt => `<option value="${escapeHtml(tt)}" ${current === tt ? "selected" : ""}>${escapeHtml(tt)}</option>`).join("");
}

function applyArchiveFilters(orders) {
  const f = getArchiveFilters();
  const lang = getCurrentLang();
  return orders.filter(o => {
    // Поиск
    if (f.search) {
      const hay = [
        o.name, o.phone, o.address, o.id, o.serviceTitle, o.serviceTitleRu,
        o.serviceTitleUz, o.serviceTitleEn, o.takenBy, o.createdBy
      ].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(f.search)) return false;
    }
    // Даты — сравниваем с o.date (плановая дата визита)
    if (f.from && (o.date || "") < f.from) return false;
    if (f.to && (o.date || "") > f.to) return false;
    // Платёжный статус
    if (f.payment && (o.payment || "unpaid") !== f.payment) return false;
    // Услуга
    if (f.service) {
      let title = o.serviceTitle || "";
      if (lang === "ru" && o.serviceTitleRu) title = o.serviceTitleRu;
      else if (lang === "uz" && o.serviceTitleUz) title = o.serviceTitleUz;
      else if (lang === "en" && o.serviceTitleEn) title = o.serviceTitleEn;
      if (title !== f.service) return false;
    }
    return true;
  });
}

/* =========================================================
   РЕНДЕР АРХИВА
========================================================= */
function renderArchive() {
  const wrap = document.getElementById("archiveList");
  if (!wrap) return;

  let orders = (getAllOrders() || []).slice();
  // Сортируем: свежие сверху
  orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const filtered = applyArchiveFilters(orders);

  // Сводка
  updateArchiveStats(filtered);

  // Количество
  const cntEl = document.getElementById("aResultCount");
  if (cntEl) {
    cntEl.textContent = `${filtered.length} ${t("archive.found") || "найдено"} / ${orders.length} ${t("archive.total") || "всего"}`;
  }

  if (filtered.length === 0) {
    wrap.innerHTML = `
      <div class="archive-empty">
        <i class="fa-regular fa-folder-open"></i>
        <h3>${escapeHtml(t("archive.empty") || "Чеков не найдено")}</h3>
        <p class="muted">${escapeHtml(t("archive.emptySub") || "Попробуйте изменить фильтры или создать заказ на главной странице")}</p>
      </div>`;
    return;
  }

  wrap.innerHTML = filtered.map(o => renderArchiveCard(o)).join("");
}

function updateArchiveStats(filtered) {
  const totalEl = document.getElementById("aStatTotal");
  const paidEl = document.getElementById("aStatPaid");
  const pendingEl = document.getElementById("aStatPending");
  const revEl = document.getElementById("aStatRevenue");

  if (totalEl) totalEl.textContent = filtered.length;
  if (paidEl) paidEl.textContent = filtered.filter(o => o.payment === "paid").length;
  if (pendingEl) pendingEl.textContent = filtered.filter(o => o.payment === "unpaid" || o.payment === "draft").length;
  if (revEl) {
    // Только реально полученные деньги: paid целиком + аванс если есть
    const revenue = filtered.reduce((s, o) => {
      const price = Number(o.price || o.total || 0);
      const advance = Number(o.advance || 0);
      if (o.payment === "paid") return s + price;
      if (advance > 0) return s + advance;
      return s;
    }, 0);
    revEl.textContent = revenue.toLocaleString("ru-RU") + " " + (t("services.currency") || "Сум");
  }
}

function renderArchiveCard(o) {
  const lang = getCurrentLang();
  let serviceTitle = o.serviceTitle || "—";
  if (lang === "ru" && o.serviceTitleRu) serviceTitle = o.serviceTitleRu;
  else if (lang === "uz" && o.serviceTitleUz) serviceTitle = o.serviceTitleUz;
  else if (lang === "en" && o.serviceTitleEn) serviceTitle = o.serviceTitleEn;

  const price = Number(o.price || o.total || 0);
  const advance = Number(o.advance || 0);
  const remaining = Math.max(0, price - advance);
  const shortId = (o.id || "").slice(-6);

  // Статус
  const payClass = o.payment === "paid" ? "pay-paid" : o.payment === "draft" ? "pay-draft" : "pay-unpaid";
  const payIcon = o.payment === "paid" ? "fa-check" : o.payment === "draft" ? "fa-pen-ruler" : "fa-xmark";

  // Дата создания (форматированная)
  const created = o.createdAt ? new Date(o.createdAt) : null;
  const createdStr = created
    ? created.toLocaleDateString(lang === "uz" ? "uz-UZ" : lang === "en" ? "en-US" : "ru-RU")
    : "—";

  // Может ли пользователь редактировать
  const canEdit = canRole(archiveSession, "canEditOrder");
  const canDelete = canRole(archiveSession, "canDeleteOrder");

  // Кто взял
  const takenInfo = o.takenBy
    ? `<span class="arc-taken"><i class="fa-solid fa-user-check"></i> ${escapeHtml(o.takenBy)}${o.startDate ? ` · ${escapeHtml(o.startDate)}${o.startTime ? " " + escapeHtml(o.startTime) : ""}` : ""}</span>`
    : `<span class="arc-taken arc-taken-free"><i class="fa-solid fa-circle-dot"></i> ${escapeHtml(t("order.free") || "Свободен")}</span>`;

  return `
    <div class="arc-card">
      <div class="arc-card-head">
        <div class="arc-card-head-left">
          <span class="pay-pill ${payClass}"><i class="fa-solid ${payIcon}"></i> ${escapeHtml(paymentLabel(o.payment))}</span>
          <span class="arc-order-id">#${escapeHtml(shortId)}</span>
        </div>
        <div class="arc-card-head-right">
          <span class="muted arc-created">
            <i class="fa-regular fa-clock"></i> ${escapeHtml(t("archive.created") || "Создан")}: <strong>${escapeHtml(createdStr)}</strong>
          </span>
        </div>
      </div>

      <div class="arc-service-row">
        <div class="arc-service-icon"><i class="fa-solid fa-broom"></i></div>
        <div class="arc-service-name">${escapeHtml(serviceTitle)}</div>
      </div>

      <div class="arc-info-grid">
        <div class="arc-info-line">
          <i class="fa-solid fa-user"></i>
          <span class="arc-info-val">${escapeHtml(o.name || "—")}</span>
        </div>
        ${o.phone ? `
        <div class="arc-info-line">
          <i class="fa-solid fa-phone"></i>
          <a href="tel:${escapeHtml(o.phone)}" class="arc-info-val arc-phone-link" onclick="event.stopPropagation()">${escapeHtml(o.phone)}</a>
        </div>` : ""}
        ${o.address ? `
        <div class="arc-info-line arc-info-line-full">
          <i class="fa-solid fa-location-dot"></i>
          <span class="arc-info-val">${escapeHtml(o.address)}</span>
        </div>` : ""}
        <div class="arc-info-line">
          <i class="fa-regular fa-calendar"></i>
          <span class="arc-info-val">${escapeHtml(o.date || "—")}${o.time ? " · " + escapeHtml(o.time) : ""}</span>
        </div>
        <div class="arc-info-line">
          ${takenInfo}
        </div>
      </div>

      <div class="arc-money-grid">
        <div class="arc-money-cell">
          <div class="arc-money-label">${escapeHtml(t("receipt.price") || "Цена")}</div>
          <div class="arc-money-val">${price.toLocaleString("ru-RU")}</div>
        </div>
        <div class="arc-money-cell">
          <div class="arc-money-label">${escapeHtml(t("receipt.advance") || "Аванс")}</div>
          <div class="arc-money-val arc-money-adv">${advance.toLocaleString("ru-RU")}</div>
        </div>
        <div class="arc-money-cell">
          <div class="arc-money-label">${escapeHtml(t("receipt.remaining") || "Остаток")}</div>
          <div class="arc-money-val ${remaining > 0 ? 'arc-money-rem' : 'arc-money-zero'}">${remaining.toLocaleString("ru-RU")}</div>
        </div>
      </div>

      <div class="arc-card-actions">
        <button class="ghost-btn small" onclick="archiveOpenReceipt('${o.id}')">
          <i class="fa-solid fa-receipt"></i> ${escapeHtml(t("receipt.show") || "Чек")}
        </button>
        ${canEdit ? `<button class="ghost-btn small" onclick="archiveOpenEdit('${o.id}')">
          <i class="fa-solid fa-pen"></i> ${escapeHtml(t("archive.edit") || "Изменить")}
        </button>` : ""}
        ${canDelete ? `<button class="ghost-btn small dir-order-del" onclick="archiveQuickDelete('${o.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>` : ""}
      </div>
    </div>
  `;
}

/* =========================================================
   РЕДАКТИРОВАНИЕ ЗАКАЗА
========================================================= */
function archiveOpenEdit(orderId) {
  if (!canRole(archiveSession, "canEditOrder")) return;
  const o = getAllOrders().find(x => x.id === orderId);
  if (!o) return;
  _editingOrderId = orderId;

  document.getElementById("editOrderId").textContent = "#" + orderId.slice(-6);
  document.getElementById("eName").value = o.name || "";
  document.getElementById("ePhone").value = o.phone || "";
  document.getElementById("eAddress").value = o.address || "";
  document.getElementById("eDate").value = o.date || "";
  document.getElementById("eTime").value = o.time || "";
  document.getElementById("ePrice").value = o.price || o.total || 0;
  document.getElementById("eAdvance").value = o.advance || 0;
  document.getElementById("eError").style.display = "none";

  // Статус оплаты
  const pay = o.payment || "unpaid";
  document.querySelectorAll('input[name="ePayment"]').forEach(r => {
    r.checked = (r.value === pay);
  });

  // Пересчёт остатка
  updateEditRemaining();
  document.getElementById("ePrice").oninput = updateEditRemaining;
  document.getElementById("eAdvance").oninput = updateEditRemaining;

  // Кнопка "Удалить" — только если есть право
  const delBtn = document.getElementById("eDeleteBtn");
  if (delBtn) delBtn.style.display = canRole(archiveSession, "canDeleteOrder") ? "" : "none";

  document.getElementById("editOrderModal").classList.add("open");
  applyI18n();
}

function updateEditRemaining() {
  const price = parseInt(document.getElementById("ePrice").value) || 0;
  const advance = parseInt(document.getElementById("eAdvance").value) || 0;
  const remaining = Math.max(0, price - advance);
  document.getElementById("eRemaining").textContent =
    remaining.toLocaleString("ru-RU") + " " + (t("services.currency") || "Сум");
}

function closeEditOrderModal() {
  document.getElementById("editOrderModal").classList.remove("open");
  _editingOrderId = null;
}

function archiveSaveOrder() {
  if (!_editingOrderId) return;
  const errEl = document.getElementById("eError");
  errEl.style.display = "none";

  const name = document.getElementById("eName").value.trim();
  const phone = document.getElementById("ePhone").value.trim();
  const address = document.getElementById("eAddress").value.trim();
  const date = document.getElementById("eDate").value;
  const time = document.getElementById("eTime").value;
  const price = parseInt(document.getElementById("ePrice").value) || 0;
  const advanceStr = document.getElementById("eAdvance").value;
  const advance = advanceStr === "" ? 0 : (parseInt(advanceStr) || 0);

  if (!name || !phone || !address || !date) {
    errEl.style.display = "block";
    errEl.textContent = t("order.errFieldsDesc") || "Заполните все обязательные поля";
    return;
  }
  if (price <= 0) {
    errEl.style.display = "block";
    errEl.textContent = t("order.errPrice") || "Укажите цену";
    return;
  }
  if (advance > price) {
    errEl.style.display = "block";
    errEl.textContent = t("order.errAdvanceHigh") || "Аванс больше цены";
    return;
  }

  let payment = "unpaid";
  const payRadio = document.querySelector('input[name="ePayment"]:checked');
  if (payRadio) payment = payRadio.value;

  const res = updateOrder(_editingOrderId, {
    name, phone, address, date, time, price, advance, payment,
  }, archiveSession.login);

  if (!res.ok) {
    errEl.style.display = "block";
    errEl.textContent = res.error || "Не удалось сохранить";
    return;
  }
  showToast("success", t("common.success") || "Готово",
    res.changed ? (t("archive.saved") || "Изменения сохранены") : (t("archive.nochange") || "Без изменений"));
  closeEditOrderModal();
  renderArchive();
}

function archiveDeleteOrder() {
  if (!_editingOrderId) return;
  if (!canRole(archiveSession, "canDeleteOrder")) {
    showToast("error", t("common.error"), t("archive.noDeletePerm") || "Нет прав на удаление");
    return;
  }
  const shortId = _editingOrderId.slice(-6);
  if (!confirm(`Удалить заказ #${shortId}?\n\nВсе связанные транзакции (аванс, оплата) тоже исчезнут из бухгалтерии.`)) return;
  const res = deleteOrder(_editingOrderId, archiveSession.login);
  if (res.ok) {
    showToast("success", t("common.success") || "Готово", `Заказ #${shortId} удалён`);
    closeEditOrderModal();
    renderArchive();
  } else {
    showToast("error", t("common.error"), res.error || "");
  }
}

function archiveQuickDelete(orderId) {
  if (!canRole(archiveSession, "canDeleteOrder")) return;
  const o = getAllOrders().find(x => x.id === orderId);
  if (!o) return;
  const shortId = orderId.slice(-6);
  if (!confirm(`Удалить заказ #${shortId} (${o.name || ""})?`)) return;
  const res = deleteOrder(orderId, archiveSession.login);
  if (res.ok) {
    showToast("success", t("common.success") || "Готово", `Заказ #${shortId} удалён`);
    renderArchive();
  }
}

/* =========================================================
   ЧЕК
========================================================= */
function archiveOpenReceipt(orderId) {
  _currentReceiptOrderId = orderId;
  const order = getAllOrders().find(o => o.id === orderId);
  if (!order) return;
  const html = buildReceiptHtml(order);
  document.getElementById("receiptBody").innerHTML = html;
  document.getElementById("receiptModal").classList.add("open");
}

function closeReceipt() {
  document.getElementById("receiptModal").classList.remove("open");
  _currentReceiptOrderId = null;
}

function buildReceiptHtml(order) {
  const lang = getCurrentLang();
  let serviceTitle = order.serviceTitle || "—";
  if (lang === "ru" && order.serviceTitleRu) serviceTitle = order.serviceTitleRu;
  else if (lang === "uz" && order.serviceTitleUz) serviceTitle = order.serviceTitleUz;
  else if (lang === "en" && order.serviceTitleEn) serviceTitle = order.serviceTitleEn;

  const price = order.price || order.total || 0;
  const advance = order.advance || 0;
  const remaining = Math.max(0, price - advance);

  let payLabel = t("receipt.unpaid") || "Не оплачен";
  let payColor = "#ef4444";
  if (order.payment === "paid") { payLabel = t("receipt.paid") || "Оплачен"; payColor = "#00b87a"; }
  else if (order.payment === "draft") { payLabel = t("receipt.draft") || "Черновик"; payColor = "#f59e0b"; }

  const logo = (typeof getCompanyLogo === "function") ? getCompanyLogo() : null;
  const settings = (typeof getSettings === "function") ? getSettings() : {};

  return `
    <div class="receipt">
      <div class="receipt-head">
        ${logo
          ? `<img src="${escapeHtml(logo)}" alt="logo" class="receipt-logo-img"/>`
          : `<div class="receipt-logo"><i class="fa-solid fa-broom"></i></div>`}
        <h2>${escapeHtml(settings.companyName || "Komfort Uborka")}</h2>
        <p class="muted">${escapeHtml(t("receipt.title") || "Чек заказа")} #${escapeHtml((order.id || "").slice(-6))}</p>
      </div>

      <div class="receipt-divider"></div>

      <div class="receipt-section">
        <h3>${escapeHtml(serviceTitle)}</h3>
        <div class="receipt-row"><span class="muted">${escapeHtml(t("receipt.client") || "Клиент")}</span><strong>${escapeHtml(order.name || "—")}</strong></div>
        <div class="receipt-row"><span class="muted">${escapeHtml(t("receipt.phone") || "Телефон")}</span><strong>${escapeHtml(order.phone || "—")}</strong></div>
        <div class="receipt-row"><span class="muted">${escapeHtml(t("receipt.address") || "Адрес")}</span><strong>${escapeHtml(order.address || "—")}</strong></div>
        <div class="receipt-row"><span class="muted">${escapeHtml(t("receipt.scheduled") || "Дата")}</span><strong>${escapeHtml(order.date || "—")} ${escapeHtml(order.time || "")}</strong></div>
        ${order.takenBy ? `<div class="receipt-row"><span class="muted">${escapeHtml(t("receipt.takenBy") || "Исполнитель")}</span><strong>${escapeHtml(order.takenBy)}</strong></div>` : ""}
        ${order.startDate ? `<div class="receipt-row"><span class="muted">${escapeHtml(t("receipt.startAt") || "Начало работы")}</span><strong>${escapeHtml(order.startDate)} ${escapeHtml(order.startTime || "")}</strong></div>` : ""}
      </div>

      <div class="receipt-divider"></div>

      <div class="receipt-money">
        <div class="receipt-row"><span class="muted">${escapeHtml(t("receipt.price") || "Цена")}</span><strong>${price.toLocaleString("ru-RU")} ${escapeHtml(t("services.currency") || "Сум")}</strong></div>
        <div class="receipt-row"><span class="muted">${escapeHtml(t("receipt.advance") || "Аванс")}</span><strong>${advance.toLocaleString("ru-RU")} ${escapeHtml(t("services.currency") || "Сум")}</strong></div>
        <div class="receipt-row receipt-row-total"><span>${escapeHtml(t("receipt.remaining") || "К доплате")}</span><strong>${remaining.toLocaleString("ru-RU")} ${escapeHtml(t("services.currency") || "Сум")}</strong></div>
      </div>

      <div class="receipt-status" style="background:${payColor}">
        ${escapeHtml(payLabel)}
      </div>

      <div class="receipt-foot">
        <p>${escapeHtml(t("receipt.thanks") || "Спасибо за заказ!")}</p>
      </div>

      ${typeof buildReceiptQrHtml === "function" ? buildReceiptQrHtml() : ""}
    </div>
  `;
}

function printReceipt() {
  if (!_currentReceiptOrderId) return;
  const order = getAllOrders().find(o => o.id === _currentReceiptOrderId);
  if (!order) return;
  const html = buildReceiptHtml(order);
  const win = window.open("", "_blank", "width=520,height=900");
  win.document.write(`
    <html><head><title>${t("receipt.title") || "Чек"} #${(order.id || "").slice(-6)}</title>
    <link rel="stylesheet" href="style.css"/>
    <style>body{padding:20px;background:#fff;font-family:Manrope,sans-serif}</style>
    </head><body>${html}</body></html>
  `);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

/* =========================================================
   EXPORT CSV
========================================================= */
function archiveExportCsv() {
  const orders = applyArchiveFilters((getAllOrders() || []).slice().sort((a, b) =>
    new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
  if (orders.length === 0) {
    showToast("info", t("common.info") || "Инфо", t("archive.exportEmpty") || "Нет данных для экспорта");
    return;
  }

  const lang = getCurrentLang();
  const headers = ["ID", "Created", "Date", "Time", "Service", "Client", "Phone", "Address", "Price", "Advance", "Remaining", "Payment", "TakenBy", "StartDate", "StartTime"];
  const rows = orders.map(o => {
    let svc = o.serviceTitle || "";
    if (lang === "ru" && o.serviceTitleRu) svc = o.serviceTitleRu;
    else if (lang === "uz" && o.serviceTitleUz) svc = o.serviceTitleUz;
    else if (lang === "en" && o.serviceTitleEn) svc = o.serviceTitleEn;
    const price = Number(o.price || o.total || 0);
    const advance = Number(o.advance || 0);
    const remaining = Math.max(0, price - advance);
    return [
      (o.id || "").slice(-6),
      (o.createdAt || "").slice(0, 19),
      o.date || "",
      o.time || "",
      svc,
      o.name || "",
      o.phone || "",
      o.address || "",
      price,
      advance,
      remaining,
      o.payment || "",
      o.takenBy || "",
      o.startDate || "",
      o.startTime || "",
    ];
  });

  const csv = [headers, ...rows].map(row =>
    row.map(cell => {
      const s = String(cell ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(",")
  ).join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `archive_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

  showToast("success", t("common.success") || "Готово", `${orders.length} ${t("archive.exported") || "записей экспортировано"}`);
}

/* =========================================================
   ТОСТЫ + УТИЛИТЫ (если auth/app не подключены)
========================================================= */
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

// Закрываем модалки по клику на фон
document.querySelectorAll(".modal").forEach(m => {
  m.addEventListener("click", e => { if (e.target === m) m.classList.remove("open"); });
});
