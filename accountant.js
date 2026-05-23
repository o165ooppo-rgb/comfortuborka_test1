/* =========================
   Storage + Defaults
========================= */
const STORE_KEY = "finance_transactions_v2";
const OLD_KEY = "transactions";
const LOGS_KEY = "finance_activity_logs";

const DEFAULT_CATEGORIES = [
  "Cleaning: House", "Cleaning: Apartment", "Cleaning: School",
  "Cleaning: Office", "Supplies / Materials", "Transport / Fuel",
  "Salaries", "Maintenance", "Marketing", "Other"
];


let TX = [];
let activityLogs = [];
let trendChart = null, donutChart = null, barChart = null;
let currentModalType = "income";
let currentLang = "ru";
let pendingDeleteId = null;
let pendingDeleteData = null;

/* =========================
   ACTIVITY LOG FUNCTIONS
========================= */
function loadLogs() {
  const saved = localStorage.getItem(LOGS_KEY);
  if (saved) {
    activityLogs = JSON.parse(saved);
  } else {
    activityLogs = [];
  }
  return activityLogs;
}

function saveLogs() {
  localStorage.setItem(LOGS_KEY, JSON.stringify(activityLogs));
}

function finLog(action, details, type = "info") {
  const now = new Date();
  const timestamp = now.toLocaleString(currentLang === 'ru' ? 'ru-RU' : currentLang === 'uz' ? 'uz-UZ' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const logEntry = {
    id: Date.now() + Math.random(),
    action: action,
    details: details,
    type: type,
    timestamp: timestamp,
    fullDate: now.toISOString()
  };
  
  activityLogs.unshift(logEntry);
  
  if (activityLogs.length > 200) {
    activityLogs = activityLogs.slice(0, 200);
  }
  
  saveLogs();
  renderLogs();
}

function clearFinLogs() {
  if (confirm(translate("clear_logs_confirm"))) {
    activityLogs = [];
    saveLogs();
    renderLogs();
    finLog("🗑️ Очистка логов", translate("log_cleared"), "warning");
  }
}

function renderLogs() {
  const container = document.getElementById("logContainer");
  if (!container) return;
  
  if (activityLogs.length === 0) {
    container.innerHTML = `<div class="log-empty">📭 ${translate("no_logs")}</div>`;
    return;
  }
  
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  
  const groups = { today: [], yesterday: [], thisWeek: [], older: [] };
  
  activityLogs.forEach(log => {
    const logDate = log.fullDate ? log.fullDate.slice(0, 10) : log.timestamp.slice(0, 10);
    if (logDate === today) groups.today.push(log);
    else if (logDate === yesterday) groups.yesterday.push(log);
    else if (moment(logDate).isAfter(moment().subtract(7, 'days'))) groups.thisWeek.push(log);
    else groups.older.push(log);
  });
  
  function getIconForType(type) {
    switch(type) {
      case 'success': return '✅';
      case 'danger': return '🗑️';
      case 'warning': return '⚠️';
      default: return '📌';
    }
  }
  
  function renderGroup(logs, title) {
    if (logs.length === 0) return '';
    return `
      <div class="log-date-group">
        <div class="log-date-header">${title}</div>
        ${logs.map(log => `
          <div class="log-item log-${log.type}">
            <div class="log-icon">${getIconForType(log.type)}</div>
            <div class="log-content">
              <div class="log-action">${escapeHtml(log.action)}</div>
              <div class="log-details">${escapeHtml(log.details)}</div>
            </div>
            <div class="log-time">🕐 ${log.timestamp.split(',')[1] || log.timestamp}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  container.innerHTML = `
    ${renderGroup(groups.today, translate("log_today"))}
    ${renderGroup(groups.yesterday, translate("log_yesterday"))}
    ${renderGroup(groups.thisWeek, translate("log_this_week"))}
    ${renderGroup(groups.older, translate("log_older"))}
  `;
}

/* =========================
   TRANSLATIONS
========================= */
const translations = {
  uz: {
    app_title: "Moliya Dashboard",
    app_subtitle: "Daromad • Xarajat • Foyda",
    back_home: "Bosh sahifa",
    filters_title: "⚡ Aqlli filtrlar",
    filters_subtitle: "Real vaqtda tahlil",
    period_label: "Davr",
    days_7: "7 kun",
    days_30: "30 kun",
    days_90: "90 kun",
    this_month: "Bu oy",
    hours_24: "24 soat",
    from_label: "Dan",
    to_label: "Gacha",
    type_label: "Turi",
    all_types: "Hammasi",
    income_type: "Daromad",
    expense_type: "Xarajat",
    category_label: "Kategoriya",
    all_categories: "Hammasi",
    search_label: "Qidiruv",
    search_placeholder: "Mijoz, tavsif, teg...",
    apply_btn: "Qo'llash",
    reset_btn: "Tozalash",
    export_btn: "CSV eksport",
    ai_insight: "🧠 AI-tahlil",
    forecast_title: "🔮 Keyingi oy prognozi",
    income_kpi: "💰 Daromad",
    expense_kpi: "📉 Xarajat",
    profit_kpi: "📈 Foyda",
    operations_kpi: "🔄 Operatsiyalar",
    top_income_label: "🏆 Asosiy daromad",
    top_expense_label: "⚠️ Asosiy xarajat",
    click_to_add: "Qo'shish uchun bosing",
    margin_label: "Marja:",
    avg_check_label: "O'rtacha chek:",
    dynamics_title: "📉 Dinamika (Joriy vs O'tgan)",
    dynamics_subtitle: "Davrlarni solishtirish",
    expense_structure_title: "🥧 Xarajatlar strukturasi",
    expense_structure_subtitle: "Top kategoriyalar",
    categories_title: "📊 Kategoriyalar (Daromad vs Xarajat)",
    transactions_title: "📋 Barcha operatsiyalar",
    transactions_subtitle: "O'chirish uchun savat belgisini bosing",
    date_th: "Sana",
    type_th: "Turi",
    category_th: "Kategoriya",
    amount_th: "Summa",
    method_th: "Metod",
    description_th: "Tavsif",
    day_option: "Kun",
    week_option: "Hafta",
    month_option: "Oy",
    modal_income_title: "Daromad qo'shish",
    modal_expense_title: "Xarajat qo'shish",
    modal_subtitle: "Qo'shish uchun formani to'ldiring",
    amount_label: "💰 Summa",
    date_label: "📅 Sana",
    method_label: "💳 To'lov usuli",
    method_cash: "Naqd",
    method_card: "Karta",
    method_bank: "Bank",
    method_tabby: "Tabby",
    method_other: "Boshqa",
    description_label: "📝 Tavsif / Mijoz",
    description_placeholder: "Masalan: Mijoz Ivanov",
    tag_label: "🏷️ Teg (ixtiyoriy)",
    tag_placeholder: "vip, urgent",
    cancel_btn: "Bekor qilish",
    save_btn: "✅ Operatsiyani qo'shish",
    income_added: "✅ Daromad muvaffaqiyatli qo'shildi!",
    expense_added: "✅ Xarajat muvaffaqiyatli qo'shildi!",
    no_data: "📭 Operatsiyalar yo'q",
    fill_amount: "❌ Iltimos, summani kiriting",
    fill_description: "❌ Iltimos, tavsif / mijozni kiriting",
    wrong_password: "❌ Noto'g'ri parol! Qaytadan urinib ko'ring.",
    password_title: "O'chirishni tasdiqlash",
    password_subtitle: "Tasdiqlash kodini kiriting",
    password_label: "🔐 Parol",
    password_placeholder: "********",
    confirm_btn: "🗑️ O'chirish",
    delete_success: "✅ Tranzaksiya muvaffaqiyatli o'chirildi!",
    activity_title: "📜 Harakatlar tarixi",
    activity_subtitle: "Barcha qo'shish, o'chirish va o'zgartirish operatsiyalari",
    clear_logs_btn: "🗑️ Loglarni tozalash",
    clear_logs_confirm: "Barcha loglarni o'chirishni xohlaysizmi?",
    no_logs: "Hech qanday harakat yo'q",
    log_cleared: "Barcha loglar tozalandi",
    log_added_income: "Daromad qo'shildi",
    log_added_expense: "Xarajat qo'shildi",
    log_deleted: "Tranzaksiya o'chirildi",
    log_exported: "CSV eksport qilindi",
    log_filters_reset: "Filtrlarni tozalash",
    log_today: "🗓️ Bugun",
    log_yesterday: "📅 Kecha",
    log_this_week: "📆 Shu hafta",
    log_older: "📁 Avvalgi",
    pending_kpi: "💎 Kutilayotgan daromad",
    pending_empty: "Kutilayotgan buyurtmalar yo'q",
    pending_orders_count: "buyurtma to'lovni kutmoqda",
    pending_type: "Kutilmoqda",
    src_advance: "Avans",
    src_final: "Qoldiq to'lov",
    src_paid: "To'langan",
    src_pending: "Kutilmoqda",
    rc_price: "Narx",
    rc_advance: "Avans",
    rc_remaining: "Qoldiq",
    rc_client: "Mijoz",
    rc_order: "Buyurtma",
    rc_tx_date: "Operatsiya sanasi",
    rc_order_deleted: "Buyurtma o'chirilgan, tranzaksiya saqlangan",
    pending_detail_title: "Kutilayotgan daromad",
    pending_detail_sub: "To'lovni kutayotgan buyurtmalar",
    delete: "O'chirish"
  },
  en: {
    app_title: "Finance Dashboard",
    app_subtitle: "Income • Expenses • Profit",
    back_home: "← Home",
    filters_title: "⚡ Smart Filters",
    filters_subtitle: "Real-time analytics",
    period_label: "Period",
    days_7: "7 days",
    days_30: "30 days",
    days_90: "90 days",
    this_month: "This month",
    hours_24: "24 hours",
    from_label: "From",
    to_label: "To",
    type_label: "Type",
    all_types: "All",
    income_type: "Income",
    expense_type: "Expense",
    category_label: "Category",
    all_categories: "All",
    search_label: "Search",
    search_placeholder: "Client, description, tag...",
    apply_btn: "Apply",
    reset_btn: "Reset",
    export_btn: "Export CSV",
    ai_insight: "🧠 AI Analytics",
    forecast_title: "🔮 Next month forecast",
    income_kpi: "💰 Income",
    expense_kpi: "📉 Expense",
    profit_kpi: "📈 Profit",
    operations_kpi: "🔄 Operations",
    top_income_label: "🏆 Top Income",
    top_expense_label: "⚠️ Top Expense",
    click_to_add: "Click to add",
    margin_label: "Margin:",
    avg_check_label: "Average check:",
    dynamics_title: "📉 Dynamics (Current vs Previous)",
    dynamics_subtitle: "Period comparison",
    expense_structure_title: "🥧 Expense Structure",
    expense_structure_subtitle: "Top categories",
    categories_title: "📊 Categories (Income vs Expense)",
    transactions_title: "📋 All Transactions",
    transactions_subtitle: "Click trash icon to delete",
    date_th: "Date",
    type_th: "Type",
    category_th: "Category",
    amount_th: "Amount",
    method_th: "Method",
    description_th: "Description",
    day_option: "Day",
    week_option: "Week",
    month_option: "Month",
    modal_income_title: "Add Income",
    modal_expense_title: "Add Expense",
    modal_subtitle: "Fill the form to add",
    amount_label: "💰 Amount",
    date_label: "📅 Date",
    method_label: "💳 Payment method",
    method_cash: "Cash",
    method_card: "Card",
    method_bank: "Bank",
    method_tabby: "Tabby",
    method_other: "Other",
    description_label: "📝 Description / Client",
    description_placeholder: "Example: Client Ivanov",
    tag_label: "🏷️ Tag (optional)",
    tag_placeholder: "vip, urgent",
    cancel_btn: "Cancel",
    save_btn: "✅ Add transaction",
    income_added: "✅ Income successfully added!",
    expense_added: "✅ Expense successfully added!",
    no_data: "📭 No transactions",
    fill_amount: "❌ Please enter amount",
    fill_description: "❌ Please enter description / client",
    wrong_password: "❌ Wrong password! Please try again.",
    password_title: "Confirm Deletion",
    password_subtitle: "Enter confirmation code",
    password_label: "🔐 Password",
    password_placeholder: "********",
    confirm_btn: "🗑️ Delete",
    delete_success: "✅ Transaction successfully deleted!",
    activity_title: "📜 Activity Log",
    activity_subtitle: "All add, delete and change operations",
    clear_logs_btn: "🗑️ Clear logs",
    clear_logs_confirm: "Are you sure you want to clear all logs?",
    no_logs: "No activities yet",
    log_cleared: "All logs cleared",
    log_added_income: "Income added",
    log_added_expense: "Expense added",
    log_deleted: "Transaction deleted",
    log_exported: "CSV exported",
    log_filters_reset: "Filters reset",
    log_today: "🗓️ Today",
    log_yesterday: "📅 Yesterday",
    log_this_week: "📆 This week",
    log_older: "📁 Older",
    pending_kpi: "💎 Expected income",
    pending_empty: "No pending orders",
    pending_orders_count: "order(s) awaiting payment",
    pending_type: "Pending",
    src_advance: "Advance",
    src_final: "Final pay",
    src_paid: "Paid",
    src_pending: "Pending",
    rc_price: "Price",
    rc_advance: "Advance",
    rc_remaining: "Remaining",
    rc_client: "Client",
    rc_order: "Order",
    rc_tx_date: "Transaction date",
    rc_order_deleted: "Order was deleted, transaction kept",
    pending_detail_title: "Expected income",
    pending_detail_sub: "Orders awaiting payment",
    delete: "Delete"
  },
  ru: {
    app_title: "Finance Dashboard",
    app_subtitle: "Доходы • Расходы • Прибыль",
    back_home: "← Главная",
    filters_title: "⚡ Умные фильтры",
    filters_subtitle: "Аналитика в реальном времени",
    period_label: "Период",
    days_7: "7 дней",
    days_30: "30 дней",
    days_90: "90 дней",
    this_month: "Этот месяц",
    hours_24: "24 часа",
    from_label: "С",
    to_label: "По",
    type_label: "Тип",
    all_types: "Все",
    income_type: "Доход",
    expense_type: "Расход",
    category_label: "Категория",
    all_categories: "Все",
    search_label: "Поиск",
    search_placeholder: "Клиент, описание, тэг...",
    apply_btn: "Применить",
    reset_btn: "Сброс",
    export_btn: "Экспорт CSV",
    ai_insight: "🧠 ИИ-Аналитика",
    forecast_title: "🔮 Прогноз на след. месяц",
    income_kpi: "💰 Доход",
    expense_kpi: "📉 Расход",
    profit_kpi: "📈 Прибыль",
    operations_kpi: "🔄 Операций",
    top_income_label: "🏆 Главный доход",
    top_expense_label: "⚠️ Главный расход",
    click_to_add: "Нажмите чтобы добавить",
    margin_label: "Маржа:",
    avg_check_label: "Средний чек:",
    dynamics_title: "📉 Динамика (Текущий vs Прошлый)",
    dynamics_subtitle: "Сравнение периодов",
    expense_structure_title: "🥧 Структура расходов",
    expense_structure_subtitle: "Топ категории",
    categories_title: "📊 Категории (Доход vs Расход)",
    transactions_title: "📋 Все операции",
    transactions_subtitle: "Нажмите на иконку корзины для удаления",
    date_th: "Дата",
    type_th: "Тип",
    category_th: "Категория",
    amount_th: "Сумма",
    method_th: "Метод",
    description_th: "Описание",
    day_option: "День",
    week_option: "Неделя",
    month_option: "Месяц",
    modal_income_title: "Добавить доход",
    modal_expense_title: "Добавить расход",
    modal_subtitle: "Заполните форму для добавления",
    amount_label: "💰 Сумма",
    date_label: "📅 Дата",
    method_label: "💳 Метод оплаты",
    method_cash: "Наличные",
    method_card: "Карта",
    method_bank: "Банк",
    method_tabby: "Tabby",
    method_other: "Другое",
    description_label: "📝 Описание / Клиент",
    description_placeholder: "Например: Клиент Иванов",
    tag_label: "🏷️ Тэг (необязательно)",
    tag_placeholder: "vip, urgent",
    cancel_btn: "Отмена",
    save_btn: "✅ Добавить операцию",
    income_added: "✅ Доход успешно добавлен!",
    expense_added: "✅ Расход успешно добавлен!",
    no_data: "📭 Нет операций",
    fill_amount: "❌ Пожалуйста, введите сумму",
    fill_description: "❌ Пожалуйста, введите описание / клиента",
    wrong_password: "❌ Неверный пароль! Попробуйте снова.",
    password_title: "Подтверждение удаления",
    password_subtitle: "Введите код подтверждения",
    password_label: "🔐 Пароль",
    password_placeholder: "********",
    confirm_btn: "🗑️ Удалить",
    delete_success: "✅ Транзакция успешно удалена!",
    activity_title: "📜 История действий",
    activity_subtitle: "Все операции добавления, удаления и изменения",
    clear_logs_btn: "🗑️ Очистить логи",
    clear_logs_confirm: "Вы уверены, что хотите очистить все логи?",
    no_logs: "Нет действий для отображения",
    log_cleared: "Все логи очищены",
    log_added_income: "💰 Доход добавлен",
    log_added_expense: "📉 Расход добавлен",
    log_deleted: "🗑️ Транзакция удалена",
    log_exported: "📎 CSV экспортирован",
    log_filters_reset: "🔄 Фильтры сброшены",
    log_today: "🗓️ Сегодня",
    log_yesterday: "📅 Вчера",
    log_this_week: "📆 Эта неделя",
    log_older: "📁 Ранее",
    pending_kpi: "💎 Ожидаемый доход",
    pending_empty: "Нет ожидающих заказов",
    pending_orders_count: "заказ(ов) ждут оплаты",
    pending_type: "Ожидает",
    src_advance: "Аванс",
    src_final: "Доплата",
    src_paid: "Оплачен",
    src_pending: "Ожидание",
    rc_price: "Цена",
    rc_advance: "Аванс",
    rc_remaining: "Остаток",
    rc_client: "Клиент",
    rc_order: "Заказ",
    rc_tx_date: "Дата операции",
    rc_order_deleted: "Заказ удалён, транзакция сохранена",
    pending_detail_title: "Ожидаемый доход",
    pending_detail_sub: "Заказы ждущие оплаты",
    delete: "Удалить"
  }
};

function translate(key) {
  return translations[currentLang][key] || translations.ru[key] || key;
}

function updateUI() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (key && translations[currentLang][key]) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        if (el.getAttribute("data-i18n-placeholder")) {
          el.placeholder = translate(key);
        }
      } else if (el.tagName === "SELECT" && el.options) {
        for (let i = 0; i < el.options.length; i++) {
          const opt = el.options[i];
          const optKey = opt.getAttribute("data-i18n");
          if (optKey && translations[currentLang][optKey]) {
            opt.textContent = translate(optKey);
          }
        }
      } else {
        el.textContent = translate(key);
      }
    }
  });
  
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key && translations[currentLang][key]) {
      el.placeholder = translate(key);
    }
  });
  
  updateDynamicTexts();
  renderLogs();
}

function updateDynamicTexts() {
  const profitSub = document.getElementById("kpiProfitSub");
  if (profitSub) {
    const marginValue = profitSub.textContent.split(":")[1] || " —";
    profitSub.textContent = `${translate("margin_label")}${marginValue}`;
  }
  
  const avgEl = document.getElementById("kpiAvg");
  if (avgEl && avgEl.textContent.includes(":")) {
    const value = avgEl.textContent.split(":")[1] || " —";
    avgEl.textContent = `${translate("avg_check_label")}${value}`;
  }
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("app_language", lang);
  
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.dataset.lang === lang) {
      btn.classList.add("active");
    }
  });
  
  // ВАЖНО: перезагружаем транзакции — при смене языка имена услуг из заказов меняются
  TX = loadTransactions();
  updateUI();
  renderAll();
}

/* =========================
   Helper Functions
========================= */
function todayISO() { return new Date().toISOString().slice(0, 10); }
function money(n) { return (Number(n || 0)).toLocaleString("en-US", { maximumFractionDigits: 0 }) + " Сум"; }
function uid() { return Date.now() + Math.floor(Math.random() * 1000000); }
function escapeHtml(str) { 
  return String(str).replace(/[&<>]/g, function(m) { 
    if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; return m; 
  }); 
}

function loadTransactions() {
  const v2 = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
  if (Array.isArray(v2)) return mergeWithOrders(v2);
  const old = JSON.parse(localStorage.getItem(OLD_KEY) || "null");
  if (Array.isArray(old) && old.length) {
    return mergeWithOrders(old.map(t => ({ id: uid(), type: t.type || "income", amount: Number(t.amount || 0), date: t.date || todayISO(), category: t.type === "expense" ? "Other" : "Cleaning: House", method: "cash", note: t.description || "", tag: "" })));
  }
  return mergeWithOrders([]);
}

/* =========================================================
   УДАЛЁННЫЕ ИЗ БУХГАЛТЕРИИ ЗАКАЗЫ
   Когда юзер удаляет авто-импортированную транзакцию, её orderId
   попадает сюда, чтобы при следующем merge она НЕ вернулась.
========================================================= */
const DELETED_ORDER_IDS_KEY = "kus_finance_deleted_order_ids";

function getDeletedOrderIds() {
  try { return JSON.parse(localStorage.getItem(DELETED_ORDER_IDS_KEY) || "[]") || []; }
  catch { return []; }
}
function addDeletedOrderId(orderId) {
  if (!orderId) return;
  const list = getDeletedOrderIds();
  if (!list.includes(orderId)) {
    list.push(orderId);
    localStorage.setItem(DELETED_ORDER_IDS_KEY, JSON.stringify(list));
  }
}
function clearDeletedOrderIds() {
  localStorage.removeItem(DELETED_ORDER_IDS_KEY);
}

/* Авто-импорт из заказов:
   1) АВАНС — когда заказ создан с предоплатой (independent transaction)
   2) ДОПЛАТА — когда статус paid и был аванс (income = price - advance)
   3) ПОЛНАЯ ОПЛАТА — когда заказ paid И аванса не было (income = price)
   4) ОЖИДАЕМЫЙ ДОХОД (pending) — unpaid / draft заказы (НЕ суммируется в доход) */
function mergeWithOrders(manualTx) {
  if (typeof getAllOrders !== "function") return manualTx;
  const deletedIds = getDeletedOrderIds();
  const orderTx = [];
  try {
    const orders = getAllOrders() || [];
    orders.forEach(o => {
      // Пропускаем заказы, которые юзер вручную удалил из бухгалтерии
      if (deletedIds.includes(o.id)) return;

      const price = Number(o.price || o.total || 0);
      const advance = Number(o.advance || 0);
      const remaining = Math.max(0, price - advance);

      // Дата создания заказа — день когда был внесён аванс (если не указана отдельная дата)
      const createdDate = ((o.createdAt || o.date || todayISO()) + "").slice(0, 10);
      const advanceDate = ((o.advanceAt || o.createdAt || o.date || todayISO()) + "").slice(0, 10);
      const paidDate = ((o.paidAt || o.createdAt || o.date || todayISO()) + "").slice(0, 10);

      // Имя услуги — приоритет русский (фиксируется в момент создания заказа,
      // не должно "плавать" при переключении языка)
      const svc = o.serviceTitleRu || o.serviceTitle || o.serviceTitleUz || o.serviceTitleEn || "Услуга";
      const clientName = o.name || "";
      const shortId = (o.id || "").slice(-6);

      // === 1) АВАНС — если есть, всегда отдельной строкой ===
      if (advance > 0) {
        orderTx.push({
          id: "order-adv-" + o.id,
          type: "income",
          amount: advance,
          date: advanceDate,
          category: svc,
          method: "cash",
          note: `Аванс • Заказ #${shortId} • ${clientName}`,
          tag: "advance",
          source: "order",
          source_kind: "advance",
          orderId: o.id,
          readonly: true,
        });
      }

      // === 2) ОПЛАЧЕН — либо доплата (если был аванс), либо полная сумма ===
      if (o.payment === "paid" && price > 0) {
        if (advance > 0 && remaining > 0) {
          // Доплата остатка
          orderTx.push({
            id: "order-final-" + o.id,
            type: "income",
            amount: remaining,
            date: paidDate,
            category: svc,
            method: "cash",
            note: `Доплата • Заказ #${shortId} • ${clientName}`,
            tag: "final",
            source: "order",
            source_kind: "final",
            orderId: o.id,
            readonly: true,
          });
        } else if (advance === 0) {
          // Сразу полная оплата без аванса
          orderTx.push({
            id: "order-paid-" + o.id,
            type: "income",
            amount: price,
            date: paidDate,
            category: svc,
            method: "cash",
            note: `Оплата • Заказ #${shortId} • ${clientName}`,
            tag: "paid",
            source: "order",
            source_kind: "paid",
            orderId: o.id,
            readonly: true,
          });
        }
        // Если был аванс == price, обе транзакции уже = price, доплачивать нечего
      }
      // === 3) ОЖИДАЕМЫЙ ДОХОД — unpaid / draft с остатком ===
      else if ((o.payment === "unpaid" || o.payment === "draft") && remaining > 0) {
        orderTx.push({
          id: "order-pending-" + o.id,
          type: "pending",                         // ВАЖНО: не "income" — не идёт в общий доход
          amount: remaining,
          date: createdDate,
          category: svc,
          method: "cash",
          note: `${o.payment === "draft" ? "Черновик" : "Ожидает оплаты"} • Заказ #${shortId} • ${clientName}`,
          tag: o.payment === "draft" ? "draft" : "pending",
          source: "order",
          source_kind: "pending",
          orderId: o.id,
          readonly: true,
        });
      }
    });
  } catch (e) { console.warn("[ACC] failed to merge orders:", e); }
  return [...orderTx, ...manualTx];
}

function saveTransactions(list) {
  // Не сохраняем строки из заказов — они живут в kus_all_orders
  const manualOnly = (list || []).filter(t => t.source !== "order");
  localStorage.setItem(STORE_KEY, JSON.stringify(manualOnly));
}

function allCategoriesFromData() {
  const set = new Set(DEFAULT_CATEGORIES);
  TX.forEach(t => set.add(t.category || "Other"));
  return Array.from(set);
}

function populateCategories() {
  const cats = allCategoriesFromData();
  const filterSelect = document.getElementById("categoryFilter");
  const modalCategory = document.getElementById("modalCategory");
  if(filterSelect) {
    filterSelect.innerHTML = `<option value="all">${translate("all_categories")}</option>` + cats.map(c => `<option>${escapeHtml(c)}</option>`).join("");
  }
  if(modalCategory) {
    modalCategory.innerHTML = cats.map(c => `<option>${escapeHtml(c)}</option>`).join("");
  }
}

function getFilters() {
  return {
    from: document.getElementById("fromDate")?.value || null,
    to: document.getElementById("toDate")?.value || null,
    type: document.getElementById("typeFilter")?.value || "all",
    cat: document.getElementById("categoryFilter")?.value || "all",
    search: (document.getElementById("searchFilter")?.value || "").toLowerCase()
  };
}

function applyFilter(list, f) {
  return list.filter(t => {
    if (f.from && t.date < f.from) return false;
    if (f.to && t.date > f.to) return false;
    if (f.type !== "all" && t.type !== f.type) return false;
    if (f.cat !== "all" && t.category !== f.cat) return false;
    if (f.search) { const hay = `${t.note} ${t.category} ${t.tag}`.toLowerCase(); if (!hay.includes(f.search)) return false; }
    return true;
  });
}

function summarize(list) {
  let income = 0, expense = 0, pending = 0, pendingCount = 0;
  list.forEach(t => {
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expense += t.amount;
    else if (t.type === "pending") { pending += t.amount; pendingCount += 1; }
  });
  // Считаем операции и средний чек ТОЛЬКО по реальным income (не учитываем pending)
  const realCount = list.filter(t => t.type === "income" || t.type === "expense").length;
  const incomeCount = list.filter(t => t.type === "income").length;
  return {
    income, expense, pending, pendingCount,
    profit: income - expense,
    count: realCount,
    avg: income / Math.max(1, incomeCount),
    margin: income ? ((income - expense)/income)*100 : 0
  };
}

function categoryTotals(list) {
  const map = new Map();
  list.forEach(t => {
    // pending не учитываем в категориях — это не свершившийся факт
    if (t.type !== "income" && t.type !== "expense") return;
    const c = t.category || "Other";
    const v = map.get(c) || { income:0, expense:0 };
    v[t.type] += t.amount;
    map.set(c, v);
  });
  return map;
}

function getTopCategories(list){
  const map = categoryTotals(list);
  let topIncome = ["—",0], topExpense = ["—",0];
  map.forEach((v,k)=>{ if(v.income > topIncome[1]) topIncome=[k,v.income]; if(v.expense > topExpense[1]) topExpense=[k,v.expense]; });
  return {topIncome, topExpense};
}

function generateInsight(list) {
  if(list.length < 2) return "Добавьте больше операций для анализа.";
  const lastMonth = list.filter(t => moment(t.date).isAfter(moment().subtract(30, 'days')));
  const prevMonth = list.filter(t => moment(t.date).isBetween(moment().subtract(60, 'days'), moment().subtract(30, 'days')));
  
  let insights = [];
  const lastExp = lastMonth.filter(t=>t.type==="expense").reduce((s,i)=>s+i.amount,0);
  const prevExp = prevMonth.filter(t=>t.type==="expense").reduce((s,i)=>s+i.amount,0);
  if(prevExp > 0) {
    let change = ((lastExp - prevExp)/prevExp)*100;
    if(change > 5) insights.push(`📈 Расходы выросли на ${change.toFixed(1)}% (нужно проверить).`);
    else if(change < -5) insights.push(`📉 Отлично! Расходы снизились на ${Math.abs(change).toFixed(1)}%.`);
  }
  
  const catMap = new Map();
  list.forEach(t => { if(t.type==="expense") catMap.set(t.category, (catMap.get(t.category)||0)+t.amount); });
  let maxCat = [...catMap.entries()].reduce((a,b)=>a[1]>b[1]?a:b, ["Нет",0]);
  if(maxCat[1] > 0) insights.push(`⚠️ Основная статья трат: "${maxCat[0]}" (${money(maxCat[1])}).`);
  
  if(insights.length === 0) insights.push("✅ Стабильная динамика. Так держать!");
  return insights.join(" ");
}

function generateForecast(list) {
  if(list.length < 7) return "Недостаточно данных для прогноза.";
  const last30 = list.filter(t => moment(t.date).isAfter(moment().subtract(30, 'days')));
  const incomeTotal = last30.filter(t=>t.type==="income").reduce((s,i)=>s+i.amount,0);
  const expenseTotal = last30.filter(t=>t.type==="expense").reduce((s,i)=>s+i.amount,0);
  const daysCount = 30;
  const dailyIncome = incomeTotal / daysCount;
  const dailyExpense = expenseTotal / daysCount;
  const nextMonth = 30;
  const forecastIncome = dailyIncome * nextMonth;
  const forecastExpense = dailyExpense * nextMonth;
  return `📊 Ожидаемый доход: ${money(forecastIncome)} | Расход: ${money(forecastExpense)} | Прибыль: ${money(forecastIncome - forecastExpense)}`;
}

/* CHARTS */
function prepareTrendData(list, bucket) {
  if(list.length === 0) return { labels: [], currentData: [], prevData: [] };
  let grouped = new Map();
  let start = moment.min(list.map(item=>moment(item.date)));
  let end = moment.max(list.map(item=>moment(item.date)));
  let current = moment(start);
  while(current <= end) {
    let key = current.format(bucket === "day" ? "YYYY-MM-DD" : bucket === "week" ? "YYYY-ww" : "YYYY-MM");
    grouped.set(key, { income:0, expense:0, date: current.toDate() });
    current.add(1, bucket === "week" ? "week" : bucket === "month" ? "month" : "day");
  }
  list.forEach(item => {
    let key = moment(item.date).format(bucket === "day" ? "YYYY-MM-DD" : bucket === "week" ? "YYYY-ww" : "YYYY-MM");
    if(grouped.has(key)) { let g = grouped.get(key); g[item.type] += item.amount; }
  });
  let labels = [], currentData = [], prevData = [];
  let arr = Array.from(grouped.values());
  for(let i=0; i<arr.length; i++) {
    labels.push(moment(arr[i].date).format(bucket === "day" ? "DD.MM" : bucket === "week" ? "'W'ww" : "MMM YY"));
    currentData.push(arr[i].income - arr[i].expense);
    let prev = arr[i-1] ? (arr[i-1].income - arr[i-1].expense) : 0;
    prevData.push(prev);
  }
  return { labels, currentData, prevData };
}

function renderCharts(filtered) {
  const bucket = document.getElementById("bucket")?.value || "day";
  const trend = prepareTrendData(filtered, bucket);

  const ctxTrend = document.getElementById("chartTrend")?.getContext("2d");
  if(ctxTrend) {
    if(trendChart) trendChart.destroy();
    trendChart = new Chart(ctxTrend, {
      type: 'line',
      data: { labels: trend.labels, datasets: [
        { label: translate("dynamics_current") || 'Текущий', data: trend.currentData, borderColor: '#1e40ff', backgroundColor: 'rgba(30,64,255,0.12)', tension: 0.35, fill: true, borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: '#1e40ff' },
        { label: translate("dynamics_previous") || 'Прошлый', data: trend.prevData, borderColor: '#ffb800', borderDash: [6,4], backgroundColor: 'transparent', tension: 0.35, borderWidth: 2, pointRadius: 2, pointHoverRadius: 4, pointBackgroundColor: '#ffb800' }
      ] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { font: { size: 11, family: 'Manrope', weight: '700' }, usePointStyle: true, padding: 12, boxWidth: 8, boxHeight: 8 }
          },
          tooltip: {
            backgroundColor: 'rgba(10,18,48,0.92)',
            padding: 10,
            cornerRadius: 8,
            titleFont: { size: 12, weight: '700', family: 'Manrope' },
            bodyFont: { size: 12, family: 'Manrope' },
            callbacks: { label: (ctx) => `${ctx.dataset.label}: ${money(ctx.parsed.y)}` }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10, family: 'Manrope' }, color: '#7a829e', maxRotation: 0 } },
          y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10, family: 'Manrope' }, color: '#7a829e', callback: v => money(v) } }
        }
      }
    });
  }

  const expensesByCat = new Map();
  filtered.filter(item=>item.type==="expense").forEach(item => expensesByCat.set(item.category, (expensesByCat.get(item.category)||0)+item.amount));
  let sortedExp = [...expensesByCat.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);

  const ctxDonut = document.getElementById("chartDonut")?.getContext("2d");
  if(ctxDonut) {
    if(donutChart) donutChart.destroy();
    donutChart = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: sortedExp.map(i=>i[0]),
        datasets: [{
          data: sortedExp.map(i=>i[1]),
          backgroundColor: ['#1e40ff','#00b87a','#ffb800','#ef4444','#8b5cf6','#ec4899'],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { size: 10.5, family: 'Manrope', weight: '600' }, usePointStyle: true, padding: 8, boxWidth: 8, boxHeight: 8 }
          },
          tooltip: {
            backgroundColor: 'rgba(10,18,48,0.92)',
            padding: 10,
            cornerRadius: 8,
            callbacks: { label: ctx => ` ${ctx.label}: ${money(ctx.parsed)}` }
          }
        }
      }
    });
  }

  // chartBars удалён — секция "Категории" вырезана из HTML
}

/* RENDER */
function renderAll(){
  populateCategories();
  const filtered = applyFilter(TX, getFilters());
  renderKPIs(filtered);
  renderTable(filtered);
  renderCharts(filtered);
  
  const insightEl = document.getElementById("aiInsightText");
  if(insightEl) insightEl.innerHTML = generateInsight(filtered);
  const forecastEl = document.getElementById("forecastText");
  if(forecastEl) forecastEl.innerHTML = generateForecast(filtered);
}

function renderKPIs(list){
  const s = summarize(list);
  
  const els = {
    kpiIncome: document.getElementById("kpiIncome"),
    kpiExpense: document.getElementById("kpiExpense"),
    kpiProfit: document.getElementById("kpiProfit"),
    kpiCount: document.getElementById("kpiCount"),
    kpiAvg: document.getElementById("kpiAvg"),
    kpiProfitSub: document.getElementById("kpiProfitSub"),
    kpiTopIncome: document.getElementById("kpiTopIncome"),
    kpiTopExpense: document.getElementById("kpiTopExpense"),
    kpiPending: document.getElementById("kpiPending"),
    kpiPendingSub: document.getElementById("kpiPendingSub")
  };
  
  if(els.kpiIncome) els.kpiIncome.textContent = money(s.income);
  if(els.kpiExpense) els.kpiExpense.textContent = money(s.expense);
  if(els.kpiProfit) els.kpiProfit.textContent = money(s.profit);
  if(els.kpiCount) els.kpiCount.textContent = s.count;
  if(els.kpiAvg) els.kpiAvg.textContent = `${translate("avg_check_label")} ${money(s.avg)}`;
  if(els.kpiProfitSub) els.kpiProfitSub.textContent = `${translate("margin_label")} ${s.margin.toFixed(1)}%`;

  // Ожидаемый доход (черновики + неоплаченные заказы)
  if(els.kpiPending) els.kpiPending.textContent = money(s.pending);
  if(els.kpiPendingSub) {
    els.kpiPendingSub.textContent = s.pendingCount > 0
      ? `${s.pendingCount} ${translate("pending_orders_count") || "заказ(ов) ждут оплаты"}`
      : (translate("pending_empty") || "Нет ожидающих заказов");
  }
  
  const top = getTopCategories(list);
  if(els.kpiTopIncome) els.kpiTopIncome.textContent = top.topIncome[0];
  if(els.kpiTopExpense) els.kpiTopExpense.textContent = top.topExpense[0];
}

function openPasswordModal(id, data) {
  // Любые транзакции можно удалить, в том числе импорты из заказов
  pendingDeleteId = id;
  pendingDeleteData = data;
  const modal = document.getElementById("passwordModal");
  const passwordInput = document.getElementById("passwordInput");
  if(passwordInput) passwordInput.value = "";
  if(modal) modal.style.display = "flex";
}

function closePasswordModal() {
  const modal = document.getElementById("passwordModal");
  if(modal) modal.style.display = "none";
  pendingDeleteId = null;
  pendingDeleteData = null;
}

// Простой код для удаления транзакций
const DELETE_CODE = "123456";

function confirmDeleteWithPassword() {
  const passwordInput = document.getElementById("passwordInput");
  const errEl = document.getElementById("passwordError");
  const enteredPassword = passwordInput?.value || "";
  if (errEl) errEl.style.display = "none";

  if (enteredPassword === DELETE_CODE) {
    if (pendingDeleteId !== null && pendingDeleteData) {
      finLog(translate("log_deleted"), `${pendingDeleteData.type === 'income' ? '💰' : '📉'} ${pendingDeleteData.note} | ${translate("log_amount")}: ${money(pendingDeleteData.amount)} | ${translate("log_category")}: ${pendingDeleteData.category}`, "danger");

      // Если это авто-импорт из заказа — запоминаем orderId,
      // чтобы при перезагрузке merge не вернул его обратно
      if (pendingDeleteData.source === "order") {
        const tx = TX.find(x => x.id === pendingDeleteId);
        if (tx && tx.orderId) {
          addDeletedOrderId(tx.orderId);
        } else if (typeof pendingDeleteId === "string") {
          const cleanId = pendingDeleteId.replace(/^order-(paid|adv|final|pending)-/, "");
          if (cleanId && cleanId !== pendingDeleteId) addDeletedOrderId(cleanId);
        }
      }

      TX = TX.filter(x => x.id != pendingDeleteId);
      saveTransactions(TX);
      renderAll();
      alert(translate("delete_success"));
      closePasswordModal();
    }
  } else {
    if (errEl) { errEl.textContent = translate("wrong_password"); errEl.style.display = "block"; }
    else alert(translate("wrong_password"));
    if(passwordInput) passwordInput.value = "";
    passwordInput?.focus();
  }
}

/* ОБНУЛИТЬ всё — одной кнопкой стереть всю бухгалтерию */
function clearAllAccounting() {
  const code = prompt("Это удалит ВСЕ транзакции и обнулит дашборд.\nВведите код подтверждения:");
  if (code === null) return;
  if (code !== DELETE_CODE) {
    alert("Неверный код. Удаление отменено.");
    return;
  }
  if (!confirm("Точно удалить ВСЕ транзакции?\nЭто действие необратимо.")) return;

  // 1) Чистим все ручные транзакции
  localStorage.removeItem(STORE_KEY);

  // 2) Запоминаем ВСЕ текущие заказы как "удалённые из бухгалтерии"
  //    чтобы они не вернулись при следующей загрузке
  try {
    if (typeof getAllOrders === "function") {
      const orders = getAllOrders() || [];
      const ids = orders.map(o => o.id).filter(Boolean);
      localStorage.setItem(DELETED_ORDER_IDS_KEY, JSON.stringify(ids));
    }
  } catch (e) { console.warn(e); }

  // 3) Лог
  finLog("Полная очистка", "Все транзакции бухгалтерии удалены (обнуление)", "danger");

  // 4) Перезагружаем дашборд
  TX = loadTransactions();
  renderAll();
  alert("Готово. Все транзакции удалены — дашборд обнулён.");
}

function renderTable(list){
  const tbody = document.getElementById("txTable");
  if(!tbody) return;
  
  if(list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px;">${translate("no_data")}<tr></tr>`;
    return;
  }
  
  tbody.innerHTML = list.map(item => {
    const isOrder = item.source === "order";
    const isPending = item.type === "pending";
    const sk = item.source_kind; // "advance" | "final" | "paid" | "pending"

    // Тип-бейдж: для pending — особый
    let typeBadge;
    if (isPending) {
      typeBadge = `<span class="tag-pending"><i class="fa-solid fa-clock"></i> ${translate("pending_type") || "Ожидает"}</span>`;
    } else if (item.type === "income") {
      typeBadge = `<span class="tag-income">${translate("income_type")}</span>`;
    } else {
      typeBadge = `<span class="tag-expense">${translate("expense_type")}</span>`;
    }

    // Подпись источника (для авто-импортов из заказа)
    let srcBadge = "";
    if (sk === "advance") srcBadge = `<span class="src-badge src-adv"><i class="fa-solid fa-arrow-down"></i> ${translate("src_advance") || "Аванс"}</span>`;
    else if (sk === "final") srcBadge = `<span class="src-badge src-final"><i class="fa-solid fa-check-double"></i> ${translate("src_final") || "Доплата"}</span>`;
    else if (sk === "paid") srcBadge = `<span class="src-badge src-paid"><i class="fa-solid fa-check"></i> ${translate("src_paid") || "Оплачен"}</span>`;
    else if (sk === "pending") srcBadge = `<span class="src-badge src-pending"><i class="fa-solid fa-hourglass-half"></i> ${translate("src_pending") || "Ожидание"}</span>`;

    // Класс суммы
    let amtClass = "amt-expense";
    if (isPending) amtClass = "amt-pending";
    else if (item.type === "income") amtClass = "amt-income";

    // Класс строки
    const rowCls = [
      isOrder ? "is-auto-order" : "",
      isPending ? "is-pending" : "",
    ].filter(Boolean).join(" ");

    const deleteCell = `<button class="icon-btn delete-btn" data-id="${item.id}" data-type="${item.type}" data-note="${escapeHtml(item.note)}" data-amount="${item.amount}" data-category="${escapeHtml(item.category)}" data-source="${item.source || ''}"><i class="fa-solid fa-xmark"></i></button>`;

    return `
    <tr class="${rowCls}">
      <td>${item.date}</td>
      <td>${typeBadge}</td>
      <td>${escapeHtml(item.category)}</td>
      <td class="amount ${amtClass}">${money(item.amount)}</td>
      <td>${item.method}</td>
      <td>
        <div class="note-main">${escapeHtml(item.note)}</div>
        <div class="note-sub">${srcBadge}${item.tag && !srcBadge ? `#${escapeHtml(item.tag)}` : ''}</div>
      </td>
      <td class="tx-actions">${deleteCell}</td>
    </tr>
  `;
  }).join("");

  tbody.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const transactionData = {
        type: btn.dataset.type,
        note: btn.dataset.note,
        amount: parseInt(btn.dataset.amount),
        category: btn.dataset.category,
        source: btn.dataset.source || null
      };
      openPasswordModal(id, transactionData);
    };
  });
}

/* MODAL ADD */
function openModal(type) {
  currentModalType = type;
  const modal = document.getElementById("addModal");
  const modalIcon = document.getElementById("modalIcon");
  const modalTitle = document.getElementById("modalTitle");
  const modalSubtitle = document.getElementById("modalSubtitle");
  
  if(type === "income") {
    modalIcon.innerHTML = '<i class="fa-solid fa-money-bill-trend-up"></i>';
    modalTitle.textContent = translate("modal_income_title");
    modalSubtitle.textContent = translate("modal_subtitle");
    modalIcon.style.background = "linear-gradient(135deg, #00b87a, #00d094)";
    modalIcon.style.boxShadow = "0 12px 24px rgba(0, 184, 122, .35)";
  } else {
    modalIcon.innerHTML = '<i class="fa-solid fa-arrow-trend-down"></i>';
    modalTitle.textContent = translate("modal_expense_title");
    modalSubtitle.textContent = translate("modal_subtitle");
    modalIcon.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
    modalIcon.style.boxShadow = "0 12px 24px rgba(239, 68, 68, .35)";
  }
  
  const modalAmount = document.getElementById("modalAmount");
  const modalNote = document.getElementById("modalNote");
  const modalTag = document.getElementById("modalTag");
  const modalDate = document.getElementById("modalDate");
  const modalMethod = document.getElementById("modalMethod");
  
  if(modalAmount) modalAmount.value = "";
  if(modalNote) modalNote.value = "";
  if(modalTag) modalTag.value = "";
  if(modalDate) modalDate.value = todayISO();
  if(modalMethod) modalMethod.value = "cash";
  
  populateCategories();
  if(modal) modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("addModal");
  if(modal) modal.style.display = "none";
}

function saveModalTransaction() {
  const amount = Math.max(0, Number(document.getElementById("modalAmount")?.value || 0));
  const note = document.getElementById("modalNote")?.value || "";
  const category = document.getElementById("modalCategory")?.value || "Other";
  const date = document.getElementById("modalDate")?.value || todayISO();
  const method = document.getElementById("modalMethod")?.value || "cash";
  const tag = document.getElementById("modalTag")?.value || "";
  
  if(!amount) { alert(translate("fill_amount")); return; }
  if(!note) { alert(translate("fill_description")); return; }
  
  const newTransaction = { id: uid(), type: currentModalType, category, amount, date, note, method, tag };
  TX.push(newTransaction);
  saveTransactions(TX);
  
  const logAction = currentModalType === "income" ? translate("log_added_income") : translate("log_added_expense");
  finLog(logAction, `${note} | ${translate("log_amount")}: ${money(amount)} | ${translate("log_category")}: ${category}`, "success");
  
  renderAll();
  closeModal();
  alert(currentModalType === "income" ? translate("income_added") : translate("expense_added"));
}

/* PRESETS */
function setPreset(preset){
  const now = new Date();
  let from;
  if(preset === "24h") from = new Date(now.getTime() - 24*60*60*1000);
  else if(preset === "this_month") from = new Date(now.getFullYear(), now.getMonth(), 1);
  else { from = new Date(now); from.setDate(from.getDate() - (Number(preset) - 1)); }
  
  const fromDate = document.getElementById("fromDate");
  const toDate = document.getElementById("toDate");
  if(fromDate) fromDate.value = from.toISOString().slice(0,10);
  if(toDate) toDate.value = now.toISOString().slice(0,10);
  
  document.querySelectorAll(".seg-btn").forEach(btn => {
    btn.classList.remove("active");
    if(btn.dataset.preset == preset) btn.classList.add("active");
  });
  renderAll();
}

function addDemoData() {
  const demo = [
    { id: uid(), type: "income", amount: 2500000, date: "2026-04-20", category: "Cleaning: House", method: "bank", note: "Аванс Hilton", tag: "vip" },
    { id: uid(), type: "income", amount: 1200000, date: "2026-04-22", category: "Cleaning: Office", method: "card", note: "Офис ИТ-парк", tag: "regular" },
    { id: uid(), type: "income", amount: 3200000, date: "2026-04-25", category: "Cleaning: School", method: "bank", note: "Школа №15", tag: "contract" },
    { id: uid(), type: "expense", amount: 450000, date: "2026-04-21", category: "Supplies / Materials", method: "cash", note: "Порошок + тряпки", tag: "shop" },
    { id: uid(), type: "expense", amount: 800000, date: "2026-04-19", category: "Salaries", method: "bank", note: "ЗП уборщикам", tag: "payroll" },
    { id: uid(), type: "expense", amount: 200000, date: "2026-04-18", category: "Transport / Fuel", method: "card", note: "Бензин", tag: "logistic" }
  ];
  TX.push(...demo);
  saveTransactions(TX);
  finLog("📦 Демо-данные", "Добавлено 6 тестовых транзакций", "info");
  renderAll();
  alert("✅ Добавлено 6 демо-операций для теста аналитики!");
}

/* INIT */
function initUI(){
  TX = loadTransactions();
  loadLogs();
  
  const savedLang = localStorage.getItem("app_language");
  if(savedLang && translations[savedLang]) setLanguage(savedLang);
  else setLanguage("ru");
  
  const incomeCard = document.getElementById("incomeCard");
  const expenseCard = document.getElementById("expenseCard");
  if(incomeCard) incomeCard.addEventListener("click", (e) => { e.stopPropagation(); openModal("income"); });
  if(expenseCard) expenseCard.addEventListener("click", (e) => { e.stopPropagation(); openModal("expense"); });
  
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
  });
  
  document.querySelectorAll(".seg-btn").forEach(btn => { 
    btn.addEventListener("click", () => setPreset(btn.dataset.preset)); 
  });
  
  const closeBtn = document.getElementById("closeModalBtn");
  const cancelBtn = document.getElementById("cancelModalBtn");
  const saveBtn = document.getElementById("saveModalBtn");
  const modal = document.getElementById("addModal");
  
  if(closeBtn) closeBtn.addEventListener("click", closeModal);
  if(cancelBtn) cancelBtn.addEventListener("click", closeModal);
  if(saveBtn) saveBtn.addEventListener("click", saveModalTransaction);
  if(modal) modal.addEventListener("click", (e) => { if(e.target === modal) closeModal(); });
  
  const closePasswordBtn = document.getElementById("closePasswordModalBtn");
  const cancelPasswordBtn = document.getElementById("cancelPasswordBtn");
  const confirmPasswordBtn = document.getElementById("confirmPasswordBtn");
  const passwordModal = document.getElementById("passwordModal");
  
  if(closePasswordBtn) closePasswordBtn.addEventListener("click", closePasswordModal);
  if(cancelPasswordBtn) cancelPasswordBtn.addEventListener("click", closePasswordModal);
  if(confirmPasswordBtn) confirmPasswordBtn.addEventListener("click", confirmDeleteWithPassword);
  if(passwordModal) passwordModal.addEventListener("click", (e) => { if(e.target === passwordModal) closePasswordModal(); });
  
  const passwordInput = document.getElementById("passwordInput");
  if(passwordInput) {
    passwordInput.addEventListener("keypress", (e) => {
      if(e.key === "Enter") confirmDeleteWithPassword();
    });
  }
  
  const clearLogsBtn = document.getElementById("clearLogsBtn");
  if(clearLogsBtn) clearLogsBtn.addEventListener("click", clearFinLogs);
  
  const applyBtn = document.getElementById("applyBtn");
  const resetBtn = document.getElementById("resetBtn");
  const exportBtn = document.getElementById("exportBtn");
  const bucketSelect = document.getElementById("bucket");
  const demoBtn = document.getElementById("demoBtn");
  
  if(applyBtn) applyBtn.addEventListener("click", () => renderAll());
  if(resetBtn) resetBtn.addEventListener("click", () => {
    const typeFilter = document.getElementById("typeFilter");
    const categoryFilter = document.getElementById("categoryFilter");
    const searchFilter = document.getElementById("searchFilter");
    if(typeFilter) typeFilter.value = "all";
    if(categoryFilter) categoryFilter.value = "all";
    if(searchFilter) searchFilter.value = "";
    renderAll();
    finLog(translate("log_filters_reset"), translate("log_filters_reset"), "info");
  });
  if(exportBtn) exportBtn.addEventListener("click", () => {
    let csv = "Date,Type,Category,Amount,Method,Note,Tag\n" + TX.map(item => `${item.date},${item.type},${item.category},${item.amount},${item.method},${item.note},${item.tag}`).join("\n");
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `finance_export_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    finLog(translate("log_exported"), `${TX.length} ${translate("transactions_title")}`, "info");
  });
  if(bucketSelect) bucketSelect.addEventListener("change", () => renderAll());
  if(demoBtn) demoBtn.addEventListener("click", addDemoData);
  
  renderLogs();
  setPreset("30");

  // Подписки на изменения
  window.addEventListener("storage", e => {
    if (e.key === "finance_transactions_v2"
        || e.key === "kus_all_orders"
        || e.key === "kus_finance_deleted_order_ids") {
      TX = loadTransactions();
      renderAll();
    }
    if (e.key === "finance_activity_logs") {
      loadLogs();
      renderLogs();
    }
  });

  // ВАЖНО: когда Firebase догрузит данные после открытия страницы — перезагружаем TX
  // Это фикс бага: при F5 заказы ещё не успели подгрузиться когда мы вызывали loadTransactions()
  if (window.FB) {
    window.FB.waitReady().then(() => {
      TX = loadTransactions();
      renderAll();
    });
  }
  // Дополнительно — отложенная подгрузка через 1.5 сек на случай если событие потерялось
  setTimeout(() => {
    TX = loadTransactions();
    renderAll();
  }, 1500);

  // === Привязываем клики на KPI карточки и плюсики
  attachBreakdownHandlers();
}

/* =====================================================================
   МОДАЛКИ BREAKDOWN — клики на KPI карточки
===================================================================== */

function attachBreakdownHandlers() {
  const incomeCard = document.getElementById("incomeCard");
  const expenseCard = document.getElementById("expenseCard");
  const topIncomeCard = document.getElementById("topIncomeCard");
  const topExpenseCard = document.getElementById("topExpenseCard");
  const pendingCard = document.getElementById("pendingCard");

  if (incomeCard) incomeCard.addEventListener("click", () => showIncomeDetail());
  if (expenseCard) expenseCard.addEventListener("click", () => showExpenseDetail());
  if (topIncomeCard) topIncomeCard.addEventListener("click", () => showTopDetail("income"));
  if (topExpenseCard) topExpenseCard.addEventListener("click", () => showTopDetail("expense"));
  if (pendingCard) pendingCard.addEventListener("click", () => showPendingDetail());

  // Кнопка "Обнулить" в шапке — удаляет ВСЕ транзакции
  const clearAllBtn = document.getElementById("clearAllBtn");
  if (clearAllBtn) clearAllBtn.addEventListener("click", clearAllAccounting);

  // Плюсики добавления — открывают модалку, оставляя detail-секцию открытой
  const addIncome = document.getElementById("detailIncomeAddBtn");
  const addExpense = document.getElementById("detailExpenseAddBtn");
  if (addIncome) addIncome.addEventListener("click", (e) => {
    e.stopPropagation();
    openModal("income");
  });
  if (addExpense) addExpense.addEventListener("click", (e) => {
    e.stopPropagation();
    openModal("expense");
  });

  // Кнопки «назад» в detail-секциях
  document.querySelectorAll("[data-detail-close]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      closeAllDetails();
    });
  });

  // Esc — возврат на главную
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      // Если открыта модалка — она сама закроется. Иначе закрываем detail.
      const anyModalOpen = ["addModal", "passwordModal"].some(id => {
        const m = document.getElementById(id);
        return m && m.style.display !== "none" && m.style.display !== "";
      });
      if (!anyModalOpen) closeAllDetails();
    }
  });
}

function closeAllDetails() {
  ["detailIncome", "detailExpense", "detailTopIncome", "detailTopExpense", "detailPending"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  const home = document.getElementById("accMainHome");
  if (home) home.style.display = "";
}

function openDetail(id) {
  closeAllDetails();
  const home = document.getElementById("accMainHome");
  if (home) home.style.display = "none";
  const el = document.getElementById(id);
  if (el) {
    el.style.display = "";
    // Анимация ре-проигрывается
    el.style.animation = "none";
    requestAnimationFrame(() => { el.style.animation = ""; });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/* === Доход — детали (full-screen) === */
function showIncomeDetail() {
  const filtered = applyFilter(TX, getFilters());
  const incomeTx = filtered.filter(t => t.type === "income");
  const total = incomeTx.reduce((s, t) => s + (t.amount || 0), 0);

  const totalEl = document.getElementById("detailIncomeTotal");
  if (totalEl) totalEl.textContent = money(total);

  const listEl = document.getElementById("detailIncomeList");
  if (incomeTx.length === 0) {
    listEl.innerHTML = `<div class="breakdown-empty">
      <i class="fa-regular fa-folder-open"></i>
      <div>${translate("bd_empty_income") || "За выбранный период доходов нет"}</div>
    </div>`;
  } else {
    const sorted = [...incomeTx].sort((a, b) => (b.amount || 0) - (a.amount || 0));
    listEl.innerHTML = sorted.map(t => renderBreakdownItem(t, "income")).join("");
  }
  openDetail("detailIncome");
}

/* === Расход — детали (full-screen) === */
function showExpenseDetail() {
  const filtered = applyFilter(TX, getFilters());
  const expenseTx = filtered.filter(t => t.type === "expense");
  const total = expenseTx.reduce((s, t) => s + (t.amount || 0), 0);

  const totalEl = document.getElementById("detailExpenseTotal");
  if (totalEl) totalEl.textContent = money(total);

  const listEl = document.getElementById("detailExpenseList");
  if (expenseTx.length === 0) {
    listEl.innerHTML = `<div class="breakdown-empty">
      <i class="fa-regular fa-folder-open"></i>
      <div>${translate("bd_empty_expense") || "За выбранный период расходов нет"}</div>
    </div>`;
  } else {
    const sorted = [...expenseTx].sort((a, b) => (b.amount || 0) - (a.amount || 0));
    listEl.innerHTML = sorted.map(t => renderBreakdownItem(t, "expense")).join("");
  }
  openDetail("detailExpense");
}

/* === Ожидаемый доход — детали (full-screen) === */
function showPendingDetail() {
  const filtered = applyFilter(TX, getFilters());
  const pendingTx = filtered.filter(t => t.type === "pending");
  const total = pendingTx.reduce((s, t) => s + (t.amount || 0), 0);

  const totalEl = document.getElementById("detailPendingTotal");
  if (totalEl) totalEl.textContent = money(total);

  const countEl = document.getElementById("detailPendingCount");
  if (countEl) {
    countEl.textContent = pendingTx.length > 0
      ? `${pendingTx.length} ${translate("pending_orders_count") || "заказ(ов) ждут оплаты"}`
      : (translate("pending_empty") || "Нет ожидающих заказов");
  }

  const listEl = document.getElementById("detailPendingList");
  if (pendingTx.length === 0) {
    listEl.innerHTML = `<div class="breakdown-empty">
      <i class="fa-regular fa-folder-open"></i>
      <div>${translate("pending_empty") || "Нет ожидающих заказов"}</div>
    </div>`;
  } else {
    const sorted = [...pendingTx].sort((a, b) => (b.amount || 0) - (a.amount || 0));
    listEl.innerHTML = sorted.map(t => renderBreakdownItem(t, "pending")).join("");
  }
  openDetail("detailPending");
}

function renderBreakdownItem(item, type) {
  const isOrder = item.source === "order";

  // === Если это транзакция из заказа — рисуем полноценный ЧЕК ===
  if (isOrder) {
    return renderOrderReceiptCard(item, type);
  }

  // === Ручная транзакция — компактная карточка как раньше ===
  const iconCls = type === "income" ? "bi-cat-income" : "bi-cat-expense";
  const icon = type === "income" ? "fa-money-bill-trend-up" : "fa-receipt";
  const amountCls = type;
  const sign = type === "income" ? "+" : "−";
  const deleteBtn = `<button class="breakdown-item-delete" data-id="${escapeHtml(item.id)}" title="Удалить"><i class="fa-solid fa-xmark"></i></button>`;

  return `
    <div class="breakdown-item">
      <div class="breakdown-item-icon ${iconCls}"><i class="fa-solid ${icon}"></i></div>
      <div class="breakdown-item-main">
        <div class="breakdown-item-cat">${escapeHtml(item.category || "—")}</div>
        ${item.note ? `<div class="breakdown-item-note">${escapeHtml(item.note)}</div>` : ""}
        <div class="breakdown-item-meta">
          <span><i class="fa-regular fa-calendar"></i> ${escapeHtml(item.date)}</span>
          <span>${escapeHtml(item.method || "cash")}</span>
        </div>
      </div>
      <div class="breakdown-item-right">
        <div class="breakdown-item-amount ${amountCls}">${sign}${money(item.amount)}</div>
        ${deleteBtn}
      </div>
    </div>
  `;
}

/* =========================================================
   ЧЕК-КАРТОЧКА для транзакции из заказа
   ---------------------------------------------------------
   Показывает полные данные заказа: услуга, клиент, телефон,
   адрес, цена, аванс, остаток, статус оплаты.
========================================================= */
function renderOrderReceiptCard(item, type) {
  // Находим исходный заказ
  const order = (typeof getAllOrders === "function")
    ? (getAllOrders() || []).find(o => o.id === item.orderId)
    : null;

  const sk = item.source_kind; // "advance" | "final" | "paid" | "pending"

  // Заголовок-плашка по типу события
  let kindLabel, kindIcon, kindCls, sign;
  if (sk === "advance") {
    kindLabel = translate("src_advance") || "Аванс";
    kindIcon = "fa-arrow-down";
    kindCls = "rc-kind-advance";
    sign = "+";
  } else if (sk === "final") {
    kindLabel = translate("src_final") || "Доплата";
    kindIcon = "fa-check-double";
    kindCls = "rc-kind-final";
    sign = "+";
  } else if (sk === "paid") {
    kindLabel = translate("src_paid") || "Оплачен";
    kindIcon = "fa-check";
    kindCls = "rc-kind-paid";
    sign = "+";
  } else if (sk === "pending") {
    kindLabel = translate("src_pending") || "Ожидание";
    kindIcon = "fa-hourglass-half";
    kindCls = "rc-kind-pending";
    sign = "";
  } else {
    kindLabel = translate("income_type");
    kindIcon = "fa-money-bill";
    kindCls = "rc-kind-final";
    sign = "+";
  }

  const amountCls = type === "pending" ? "pending" : type;

  // Данные клиента/услуги — берём из заказа если есть, иначе из note
  let serviceTitle, clientName, clientPhone, clientAddress, price, advance, remaining, orderDate, orderTime, shortId;
  if (order) {
    serviceTitle = order.serviceTitleRu || order.serviceTitle || order.serviceTitleUz || order.serviceTitleEn || item.category || "Услуга";
    clientName = order.name || "—";
    clientPhone = order.phone || "";
    clientAddress = order.address || "";
    price = Number(order.price || order.total || 0);
    advance = Number(order.advance || 0);
    remaining = Math.max(0, price - advance);
    orderDate = order.date || item.date;
    orderTime = order.time || "";
    shortId = (order.id || item.orderId || "").slice(-6);
  } else {
    // Заказ удалён — но транзакция осталась. Покажем минимум из note
    serviceTitle = item.category || "Услуга";
    clientName = "—";
    clientPhone = "";
    clientAddress = "";
    price = item.amount;
    advance = sk === "advance" ? item.amount : 0;
    remaining = 0;
    orderDate = item.date;
    orderTime = "";
    shortId = (item.orderId || "").slice(-6);
  }

  const deleteBtn = `<button class="rc-delete" data-id="${escapeHtml(item.id)}" title="${escapeHtml(translate("delete") || "Удалить")}"><i class="fa-solid fa-xmark"></i></button>`;

  // Лейблы (из переводов или fallback)
  const lblPrice = translate("rc_price") || "Цена";
  const lblAdvance = translate("rc_advance") || "Аванс";
  const lblRemaining = translate("rc_remaining") || "Остаток";
  const lblClient = translate("rc_client") || "Клиент";
  const lblOrder = translate("rc_order") || "Заказ";

  // Иконка услуги — попробуем взять из заказа (если есть svc.icon у того)
  const svcIcon = "fa-broom";

  // Если заказ удалён — спец-метка
  const ghostBadge = !order
    ? `<span class="rc-ghost-badge" title="${escapeHtml(translate('rc_order_deleted') || 'Заказ удалён, транзакция сохранена')}"><i class="fa-solid fa-link-slash"></i></span>`
    : "";

  return `
    <div class="rc-card ${kindCls}">
      <div class="rc-card-head">
        <div class="rc-card-head-left">
          <span class="rc-kind-badge"><i class="fa-solid ${kindIcon}"></i> ${escapeHtml(kindLabel)}</span>
          <span class="rc-order-id">#${escapeHtml(shortId)}</span>
          ${ghostBadge}
        </div>
        <div class="rc-card-head-right">
          <div class="rc-amount ${amountCls}">${sign}${money(item.amount)}</div>
          ${deleteBtn}
        </div>
      </div>

      <div class="rc-card-body">
        <div class="rc-service-row">
          <div class="rc-service-icon"><i class="fa-solid ${svcIcon}"></i></div>
          <div class="rc-service-name">${escapeHtml(serviceTitle)}</div>
        </div>

        <div class="rc-client-grid">
          <div class="rc-info-line">
            <i class="fa-solid fa-user"></i>
            <span class="rc-info-label">${escapeHtml(lblClient)}:</span>
            <span class="rc-info-val">${escapeHtml(clientName)}</span>
          </div>
          ${clientPhone ? `
          <div class="rc-info-line">
            <i class="fa-solid fa-phone"></i>
            <a href="tel:${escapeHtml(clientPhone)}" class="rc-info-val rc-phone-link" onclick="event.stopPropagation()">${escapeHtml(clientPhone)}</a>
          </div>` : ""}
          ${clientAddress ? `
          <div class="rc-info-line rc-info-line-full">
            <i class="fa-solid fa-location-dot"></i>
            <span class="rc-info-val rc-address">${escapeHtml(clientAddress)}</span>
          </div>` : ""}
          <div class="rc-info-line">
            <i class="fa-regular fa-calendar"></i>
            <span class="rc-info-val">${escapeHtml(orderDate)}${orderTime ? " · " + escapeHtml(orderTime) : ""}</span>
          </div>
        </div>

        <div class="rc-money-grid">
          <div class="rc-money-cell">
            <div class="rc-money-label">${escapeHtml(lblPrice)}</div>
            <div class="rc-money-val">${money(price)}</div>
          </div>
          <div class="rc-money-cell">
            <div class="rc-money-label">${escapeHtml(lblAdvance)}</div>
            <div class="rc-money-val rc-money-adv">${money(advance)}</div>
          </div>
          <div class="rc-money-cell">
            <div class="rc-money-label">${escapeHtml(lblRemaining)}</div>
            <div class="rc-money-val ${remaining > 0 ? 'rc-money-rem' : 'rc-money-zero'}">${money(remaining)}</div>
          </div>
        </div>

        <div class="rc-foot">
          <span class="rc-foot-date"><i class="fa-regular fa-clock"></i> ${escapeHtml(translate("rc_tx_date") || "Дата операции")}: <strong>${escapeHtml(item.date)}</strong></span>
        </div>
      </div>
    </div>
  `;
}

// Делегирование клика на кнопках удаления (старая компактная карточка + новая чек-карточка)
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".breakdown-item-delete[data-id], .rc-delete[data-id]");
  if (!btn) return;
  e.stopPropagation();
  const id = btn.dataset.id;
  const item = TX.find(t => String(t.id) === String(id));
  if (!item) return;
  openPasswordModal(id, {
    type: item.type, note: item.note, amount: item.amount,
    category: item.category, source: item.source || null,
  });
});

/* === Главный доход / расход — full-screen с donut === */
let _topChartIncome = null;
let _topChartExpense = null;

const TOP_PALETTE = [
  "#1e40ff", "#00b87a", "#f59e0b", "#8b5cf6", "#ec4899",
  "#06b6d4", "#ef4444", "#84cc16", "#f97316", "#64748b",
];

function showTopDetail(type) {
  const filtered = applyFilter(TX, getFilters());
  const list = filtered.filter(t => t.type === type);

  const byCat = {};
  list.forEach(t => {
    const c = t.category || "Другое";
    byCat[c] = (byCat[c] || 0) + (t.amount || 0);
  });
  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, v]) => s + v, 0);

  const detailId = type === "income" ? "detailTopIncome" : "detailTopExpense";
  const canvas = document.getElementById(type === "income" ? "topIncomeChart" : "topExpenseChart");
  const centerEl = document.getElementById(type === "income" ? "topIncomeCenter" : "topExpenseCenter");
  const listEl = document.getElementById(type === "income" ? "topIncomeList" : "topExpenseList");

  if (centerEl) centerEl.textContent = money(total);

  // Лимит — топ 8
  let entries = sorted;
  if (entries.length > 8) {
    const top7 = entries.slice(0, 7);
    const others = entries.slice(7).reduce((s, [, v]) => s + v, 0);
    entries = [...top7, ["Другое", others]];
  }

  const labels = entries.map(([c]) => c);
  const values = entries.map(([, v]) => v);
  const colors = entries.map((_, i) => TOP_PALETTE[i % TOP_PALETTE.length]);

  if (entries.length === 0) {
    listEl.innerHTML = `<div class="breakdown-empty">
      <i class="fa-regular fa-folder-open"></i>
      <div>${type === "income" ? "Доходов пока нет" : "Расходов пока нет"}</div>
    </div>`;
  } else {
    listEl.innerHTML = entries.map(([cat, val], i) => {
      const pct = total > 0 ? Math.round((val / total) * 100) : 0;
      const rankCls = i === 0 ? "top-rank-1" : i === 1 ? "top-rank-2" : i === 2 ? "top-rank-3" : "";
      const color = colors[i];
      return `
        <div class="top-list-item" style="--top-color:${color}">
          <div class="top-rank ${rankCls}">${i + 1}</div>
          <div class="top-list-main">
            <div class="top-list-cat">${escapeHtml(cat)}</div>
            <div class="top-list-bar"><div class="top-list-bar-fill" style="width:${pct}%"></div></div>
          </div>
          <div class="top-list-right">
            <div class="top-list-pct">${pct}%</div>
            <div class="top-list-amount">${money(val)}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Покажем секцию ДО создания чарта (иначе canvas невидим, Chart.js плохо измеряет)
  openDetail(detailId);

  // Чарт (donut) — дожидаемся пока секция реально видна
  const existing = type === "income" ? _topChartIncome : _topChartExpense;
  if (existing) existing.destroy();

  if (canvas && entries.length > 0) {
    requestAnimationFrame(() => {
      const chart = new Chart(canvas, {
        type: "doughnut",
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "70%",
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                  return ` ${ctx.label}: ${money(ctx.parsed)} (${pct}%)`;
                },
              },
            },
          },
        },
      });
      if (type === "income") _topChartIncome = chart;
      else _topChartExpense = chart;
    });
  }
}

/* =====================================================================
   БУТСТРАП ЧЕРЕЗ СИСТЕМУ АВТОРИЗАЦИИ
===================================================================== */
function _accountantBoot() {
  if (typeof bootstrapApp !== "function") {
    console.warn("[ACC] bootstrapApp not found, running standalone");
    initUI();
    return;
  }
  bootstrapApp({ allowedRoles: ["director", "accountant"] }, function (session) {
    window._accSession = session;
    renderNavbar(session);
    initUI();
  });
}

function renderNavbar(session) {
  // Заполняем элементы сайдбара
  const userName = document.getElementById("accSideUserName");
  const userRole = document.getElementById("accSideUserRole");
  const backBtn = document.getElementById("accBackBtn");
  const ordersBtn = document.getElementById("accOrdersBtn");
  const logoutBtn = document.getElementById("accLogoutBtn");

  if (userName) userName.textContent = session.fullName || session.login;
  if (userRole) userRole.textContent = session.role === "director" ? "Директор" : "Бухгалтер";

  const isDir = session.role === "director";
  if (backBtn) backBtn.style.display = isDir ? "flex" : "none";
  if (ordersBtn) ordersBtn.style.display = isDir ? "none" : "flex";

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (typeof logout === "function") logout();
      window.location.href = "login.html";
    });
  }
}


/* =========================================================
   МОБИЛЬНЫЙ САЙДБАР — выезжающее меню (бургер)
========================================================= */
function accToggleSidebar() {
  document.body.classList.toggle("sidebar-open");
  var icon = document.getElementById("accBurgerIcon");
  if (icon) {
    var open = document.body.classList.contains("sidebar-open");
    icon.className = open ? "fa-solid fa-xmark" : "fa-solid fa-bars";
  }
}
function accCloseSidebar() {
  document.body.classList.remove("sidebar-open");
  var icon = document.getElementById("accBurgerIcon");
  if (icon) icon.className = "fa-solid fa-bars";
}
/* На мобиле: клик по пункту внутри сайдбара (кнопка/ссылка) закрывает меню */
document.addEventListener("DOMContentLoaded", function () {
  var sidebar = document.querySelector(".acc-sidebar");
  if (!sidebar) return;
  sidebar.addEventListener("click", function (e) {
    if (window.innerWidth > 1100) return; // только на мобиле
    var el = e.target.closest("a, button");
    if (el && !el.closest(".acc-side-lang")) {
      // не закрываем при переключении языка, остальное закрывает
      setTimeout(accCloseSidebar, 150);
    }
  });
  // Esc закрывает меню
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") accCloseSidebar();
  });
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _accountantBoot);
else _accountantBoot();