/* =========================================================
   I18N — многоязычность RU / UZ / EN
   ---------------------------------------------------------
   Использование:
     t("nav.services")            — простой перевод
     t("toast.created", {n: 5})   — с параметрами {n}
     setLang("uz")                — переключение языка
     applyI18n()                  — обновить все [data-i18n]

   Атрибуты в HTML:
     data-i18n="key"              — текст элемента
     data-i18n-html="key"         — HTML внутри (с <i> и пр.)
     data-i18n-ph="key"           — placeholder инпута
     data-i18n-title="key"        — title атрибут
========================================================= */

const I18N_LANGS = {
  ru: { name: "Русский", flag: "🇷🇺", code: "ru" },
  uz: { name: "O'zbekcha", flag: "🇺🇿", code: "uz" },
  en: { name: "English", flag: "🇬🇧", code: "en" },
};

const I18N_STORAGE_KEY = "kus_lang";
const I18N_DEFAULT = "uz";

const I18N_DICT = {

  /* ============== ОБЩИЕ ============== */
  "common.save":        { ru: "Сохранить",      uz: "Saqlash",          en: "Save" },
  "common.cancel":      { ru: "Отмена",         uz: "Bekor qilish",     en: "Cancel" },
  "common.delete":      { ru: "Удалить",        uz: "O'chirish",        en: "Delete" },
  "common.edit":        { ru: "Редактировать",  uz: "Tahrirlash",       en: "Edit" },
  "common.add":         { ru: "Добавить",       uz: "Qo'shish",         en: "Add" },
  "common.close":       { ru: "Закрыть",        uz: "Yopish",           en: "Close" },
  "common.confirm":     { ru: "Подтвердить",    uz: "Tasdiqlash",       en: "Confirm" },
  "common.yes":         { ru: "Да",             uz: "Ha",               en: "Yes" },
  "common.no":          { ru: "Нет",            uz: "Yo'q",             en: "No" },
  "common.refresh":     { ru: "Обновить",       uz: "Yangilash",        en: "Refresh" },
  "common.search":      { ru: "🔎 Поиск...",    uz: "🔎 Qidirish...",   en: "🔎 Search..." },
  "common.loading":     { ru: "Загрузка...",    uz: "Yuklanmoqda...",   en: "Loading..." },
  "common.error":       { ru: "Ошибка",         uz: "Xatolik",          en: "Error" },
  "common.success":     { ru: "Готово",         uz: "Bajarildi",        en: "Done" },
  "common.from":        { ru: "От",             uz: "Dan",              en: "From" },
  "common.to":          { ru: "До",             uz: "Gacha",            en: "To" },
  "common.all":         { ru: "Все",            uz: "Barchasi",         en: "All" },
  "common.send":        { ru: "Отправить",      uz: "Yuborish",         en: "Send" },
  "common.online":      { ru: "в сети",         uz: "onlayn",           en: "online" },

  /* ============== БРЕНД ============== */
  "brand.callcenter":   { ru: "Call Center",    uz: "Call Center",      en: "Call Center" },

  /* ============== НАВИГАЦИЯ ============== */
  "nav.toSite":         { ru: "К сайту",                  uz: "Saytga",                en: "To site" },
  "nav.directorPanel":  { ru: "Панель директора",         uz: "Direktor paneli",       en: "Director panel" },
  "nav.accountant":     { ru: "Бухгалтер",                uz: "Buxgalter",             en: "Accountant" },
  "nav.logout":         { ru: "Выйти",                    uz: "Chiqish",               en: "Logout" },
  "nav.arrive":         { ru: "Я пришёл",                 uz: "Keldim",                en: "I arrived" },
  "nav.leave":          { ru: "Я ушёл",                   uz: "Ketdim",                en: "I left" },
  "nav.chat":           { ru: "Чат",                      uz: "Chat",                  en: "Chat" },
  "nav.chatWithDirector": { ru: "Чат с директором",       uz: "Direktor bilan chat",   en: "Chat with director" },

  /* ============== РОЛИ ============== */
  "role.director":      { ru: "Директор",      uz: "Direktor",         en: "Director" },
  "role.accountant":    { ru: "Бухгалтер",     uz: "Buxgalter",        en: "Accountant" },
  "role.worker":        { ru: "Сотрудник",     uz: "Xodim",            en: "Employee" },
  "role.supervisor":    { ru: "Супервайзер",   uz: "Supervayzer",      en: "Supervisor" },

  "nav.archive":        { ru: "Архив",              uz: "Arxiv",                en: "Archive" },
  "nav.back":           { ru: "Назад",              uz: "Orqaga",               en: "Back" },
  "dir.tab.archive":    { ru: "Архив чеков",        uz: "Cheklar arxivi",       en: "Receipts archive" },

  "archive.title":      { ru: "Архив чеков",        uz: "Cheklar arxivi",       en: "Receipts archive" },
  "archive.sub":        { ru: "Все заказы за всё время. Можно искать, фильтровать, редактировать и удалять.",
                          uz: "Hamma vaqtdagi barcha buyurtmalar. Qidirish, filtrlash, tahrirlash va o'chirish mumkin.",
                          en: "All orders for all time. Search, filter, edit and delete." },
  "archive.search":     { ru: "Поиск",              uz: "Qidiruv",              en: "Search" },
  "archive.searchPh":   { ru: "Имя, телефон, адрес, ID...",
                          uz: "Ism, telefon, manzil, ID...",
                          en: "Name, phone, address, ID..." },
  "archive.dateFrom":   { ru: "С даты",             uz: "Sanadan",              en: "From date" },
  "archive.dateTo":     { ru: "По дату",            uz: "Sanagacha",            en: "To date" },
  "archive.payment":    { ru: "Оплата",             uz: "To'lov",               en: "Payment" },
  "archive.paymentAll": { ru: "Все",                uz: "Hammasi",              en: "All" },
  "archive.service":    { ru: "Услуга",             uz: "Xizmat",               en: "Service" },
  "archive.serviceAll": { ru: "Все услуги",         uz: "Barcha xizmatlar",     en: "All services" },
  "archive.reset":      { ru: "Сбросить",           uz: "Tozalash",             en: "Reset" },
  "archive.exportCsv":  { ru: "Экспорт CSV",        uz: "CSV eksport",          en: "Export CSV" },
  "archive.found":      { ru: "найдено",            uz: "topildi",              en: "found" },
  "archive.total":      { ru: "всего",              uz: "jami",                 en: "total" },
  "archive.empty":      { ru: "Чеков не найдено",   uz: "Cheklar topilmadi",    en: "No receipts found" },
  "archive.emptySub":   { ru: "Попробуйте изменить фильтры или создать заказ на главной странице",
                          uz: "Filtrlarni o'zgartiring yoki bosh sahifada buyurtma yarating",
                          en: "Try changing filters or create an order on the main page" },
  "archive.statTotal":  { ru: "Всего чеков",        uz: "Jami cheklar",         en: "Total receipts" },
  "archive.statPaid":   { ru: "Оплачено",           uz: "To'langan",            en: "Paid" },
  "archive.statPending":{ ru: "Ожидают",            uz: "Kutilmoqda",           en: "Pending" },
  "archive.statRevenue":{ ru: "Выручка",            uz: "Daromad",              en: "Revenue" },
  "archive.created":    { ru: "Создан",             uz: "Yaratilgan",           en: "Created" },
  "archive.edit":       { ru: "Изменить",           uz: "Tahrirlash",           en: "Edit" },
  "archive.delete":     { ru: "Удалить",            uz: "O'chirish",            en: "Delete" },
  "archive.save":       { ru: "Сохранить",          uz: "Saqlash",              en: "Save" },
  "archive.editTitle":  { ru: "Редактирование заказа", uz: "Buyurtmani tahrirlash", en: "Edit order" },
  "archive.saved":      { ru: "Изменения сохранены", uz: "O'zgarishlar saqlandi", en: "Changes saved" },
  "archive.nochange":   { ru: "Без изменений",       uz: "O'zgarishsiz",          en: "No changes" },
  "archive.exported":   { ru: "записей экспортировано", uz: "yozuv eksport qilindi", en: "records exported" },
  "archive.exportEmpty":{ ru: "Нет данных для экспорта", uz: "Eksport uchun ma'lumot yo'q", en: "No data to export" },
  "archive.noDeletePerm": { ru: "Нет прав на удаление", uz: "O'chirish huquqi yo'q", en: "No delete permission" },

  "take.title":         { ru: "Взять заказ",         uz: "Buyurtmani olish",      en: "Take order" },
  "take.sub":           { ru: "Когда вы планируете начать работу?",
                          uz: "Ishni qachon boshlamoqchisiz?",
                          en: "When do you plan to start work?" },
  "take.service":       { ru: "Услуга",              uz: "Xizmat",                en: "Service" },
  "take.client":        { ru: "Клиент",              uz: "Mijoz",                 en: "Client" },
  "take.address":       { ru: "Адрес",               uz: "Manzil",                en: "Address" },
  "take.takenAt":       { ru: "Когда взят",          uz: "Qachon olindi",         en: "Taken at" },
  "take.wantedAt":      { ru: "Клиент хочет",        uz: "Mijoz xohlaydi",        en: "Client wants" },
  "take.startAt":       { ru: "Когда начать работу", uz: "Qachon boshlash",       en: "When to start" },
  "take.confirm":       { ru: "Подтвердить и взять", uz: "Tasdiqlash va olish",   en: "Confirm & take" },
  "take.warnLate":      { ru: "Опоздание!",          uz: "Kechikish!",            en: "Late!" },
  "take.warnLateMsg":   { ru: "Клиент хочет на",     uz: "Mijoz xohlaydi",        en: "Client wants on" },
  "take.warnEarly":     { ru: "Раньше срока",        uz: "Belgilangandan oldin",  en: "Earlier than wanted" },
  "take.warnEarlyMsg":  { ru: "Вы начнёте раньше чем хотел клиент. Уточните у него.",
                          uz: "Siz mijoz xohlaganidan oldin boshlaysiz. U bilan aniqlashtiring.",
                          en: "You'll start earlier than the client wants. Check with them." },
  "take.warnOk":        { ru: "Хорошо!",             uz: "Yaxshi!",               en: "Good!" },
  "take.warnOkMsg":     { ru: "Вовремя по плану клиента", uz: "Mijozning rejasi bo'yicha", en: "On time per client's plan" },
  "take.lateConfirm":   { ru: "Вы начнёте позже чем хочет клиент. Точно взять?",
                          uz: "Siz mijoz xohlaganidan kech boshlaysiz. Olishni xohlaysizmi?",
                          en: "You'll start later than the client wants. Take anyway?" },

  "receipt.takenBy":    { ru: "Исполнитель",         uz: "Ijrochi",               en: "Performer" },
  "receipt.startAt":    { ru: "Начало работы",       uz: "Ish boshlanishi",       en: "Work start" },

  "order.dayLoadOrders":   { ru: "заказов",                       uz: "buyurtma",                              en: "orders" },
  "order.dayLoadOverload": { ru: "Перегруз!",                     uz: "Yuklama oshib ketdi!",                 en: "Overload!" },
  "order.dayLoadBusy":     { ru: "напряжённо",                    uz: "zo'riqishli kun",                       en: "busy day" },
  "order.dayLoadFree":     { ru: "День свободен",                 uz: "Kun bo'sh",                             en: "Day is free" },
  "order.dayOverloadTitle":{ ru: "Перегруз!",                     uz: "Yuklama oshib ketdi!",                 en: "Overload!" },
  "order.dayOverloadConfirm": { ru: "Точно создать ещё один заказ на этот день?", uz: "Shu kunga yana buyurtma yaratasizmi?", en: "Sure to create another order for this day?" },
  "order.dayOverloadShort":{ ru: "Слишком много заказов на этот день", uz: "Bu kunga juda ko'p buyurtma",      en: "Too many orders for this day" },
  "order.dayBusyTitle":    { ru: "Напряжённый день",              uz: "Zo'riqishli kun",                      en: "Busy day" },

  /* ============== СЕССИЯ ============== */
  "session.loggedAs":   { ru: "Вы вошли как",  uz: "Siz kirdingiz:",   en: "Logged in as" },
  "session.logoutConfirm": { ru: "Выйти из аккаунта?", uz: "Akkauntdan chiqasizmi?", en: "Sign out?" },

  /* ============== ВХОД (LOGIN PAGE) ============== */
  "login.title":        { ru: "Вход в систему",       uz: "Tizimga kirish",          en: "Sign in" },
  "login.login":        { ru: "Логин",                uz: "Login",                   en: "Login" },
  "login.password":     { ru: "Пароль",               uz: "Parol",                   en: "Password" },
  "login.loginPh":      { ru: "Введите логин",        uz: "Loginni kiriting",        en: "Enter login" },
  "login.passwordPh":   { ru: "Введите пароль",       uz: "Parolni kiriting",        en: "Enter password" },
  "login.submit":       { ru: "Войти",                uz: "Kirish",                  en: "Sign in" },
  "login.hint":         { ru: "У вас нет аккаунта? Обратитесь к директору — регистрация только через него.",
                          uz: "Akkauntingiz yo'qmi? Direktorga murojaat qiling — ro'yxatdan o'tish faqat u orqali.",
                          en: "Don't have an account? Contact the director — registration is through them only." },
  "login.errEmpty":     { ru: "Введите логин и пароль", uz: "Login va parolni kiriting", en: "Enter login and password" },
  "login.errBad":       { ru: "Неверный логин или пароль", uz: "Login yoki parol noto'g'ri", en: "Invalid login or password" },
  "login.connecting":   { ru: "Подключение к серверу...", uz: "Serverga ulanmoqda...", en: "Connecting to server..." },
  "login.footer":       { ru: "© 2026 Komfort Uborka • Самарканд", uz: "© 2026 Komfort Uborka • Samarqand", en: "© 2026 Komfort Uborka • Samarkand" },
  "login.subtitle":     { ru: "Вход в систему",        uz: "Tizimga kirish",          en: "Sign in" },

  /* ============== ГЛАВНАЯ — УСЛУГИ ============== */
  "services.title":     { ru: "Услуги",                  uz: "Xizmatlar",              en: "Services" },
  "services.subtitle":  { ru: "Выберите услугу и оформите заказ", uz: "Xizmatni tanlang va buyurtma bering", en: "Pick a service and place an order" },
  "services.empty":     { ru: "Услуги пока не добавлены. Директор может добавить их в панели управления.",
                          uz: "Hali xizmatlar qo'shilmagan. Direktor ularni boshqaruv panelida qo'sha oladi.",
                          en: "No services yet. The director can add them in the admin panel." },
  "services.order":     { ru: "Заказать",                uz: "Buyurtma berish",        en: "Order" },
  "services.pricePerUnit": { ru: "Цена за единицу:",     uz: "Birlik narxi:",          en: "Price per unit:" },
  "services.quantity":  { ru: "Количество",              uz: "Miqdor",                 en: "Quantity" },
  "services.total":     { ru: "Итого:",                  uz: "Jami:",                  en: "Total:" },
  "services.checkout":  { ru: "Оформить заказ",          uz: "Buyurtmani rasmiylashtirish", en: "Place order" },
  "services.currency":  { ru: "Сум",                     uz: "So'm",                   en: "UZS" },

  /* ============== ФОРМА ЗАКАЗА ============== */
  "order.title":        { ru: "Оформление заказа",       uz: "Buyurtma berish",        en: "Place order" },
  "order.service":      { ru: "Услуга:",                 uz: "Xizmat:",                en: "Service:" },
  "order.amount":       { ru: "Сумма:",                  uz: "Summa:",                 en: "Amount:" },
  "order.namePh":       { ru: "Ваше имя",                uz: "Ismingiz",               en: "Your name" },
  "order.phonePh":      { ru: "Телефон",                 uz: "Telefon",                en: "Phone" },
  "order.addressPh":    { ru: "Адрес",                   uz: "Manzil",                 en: "Address" },
  "order.payStatus":    { ru: "Статус оплаты",           uz: "To'lov holati",          en: "Payment status" },
  "order.paid":         { ru: "Оплачен",                 uz: "To'langan",              en: "Paid" },
  "order.unpaid":       { ru: "Не оплачен",              uz: "To'lanmagan",            en: "Unpaid" },
  "order.draft":        { ru: "Черновик",                uz: "Qoralama",               en: "Draft" },
  "order.confirm":      { ru: "Подтвердить заказ",       uz: "Buyurtmani tasdiqlash",  en: "Confirm order" },
  "order.errFields":    { ru: "Заполните все поля",      uz: "Barcha maydonlarni to'ldiring", en: "Fill all fields" },
  "order.errFieldsDesc":{ ru: "Имя, телефон, адрес, дата и время обязательны",
                          uz: "Ism, telefon, manzil, sana va vaqt majburiy",
                          en: "Name, phone, address, date and time are required" },
  "order.created":      { ru: "Заказ создан",            uz: "Buyurtma yaratildi",     en: "Order created" },
  "order.detailsTitle": { ru: "Детали заказа",           uz: "Buyurtma tafsilotlari",  en: "Order details" },
  "order.history":      { ru: "История заказов",         uz: "Buyurtmalar tarixi",     en: "Order history" },
  "order.historySub":   { ru: "Заказы автоматически удаляются через 24 часа",
                          uz: "Buyurtmalar 24 soatdan so'ng avtomatik o'chiriladi",
                          en: "Orders are auto-deleted after 24 hours" },
  "order.empty":        { ru: "Пока нет заказов",        uz: "Hali buyurtma yo'q",     en: "No orders yet" },
  "order.take":         { ru: "Взять",                   uz: "Olish",                  en: "Take" },
  "order.taken":        { ru: "Заказ взят",              uz: "Buyurtma olindi",        en: "Order taken" },
  "order.takeOk":       { ru: "Удачи в работе!",         uz: "Ishingizga omad!",       en: "Good luck!" },
  "order.takeFail":     { ru: "Не получилось",           uz: "Bajarilmadi",            en: "Failed" },
  "order.free":         { ru: "свободен",                uz: "bo'sh",                  en: "free" },

  /* ============== ТУРНИКЕТ ============== */
  "ts.checkInTitle":    { ru: "Отметка прихода",         uz: "Kelish belgisi",          en: "Check in" },
  "ts.checkOutTitle":   { ru: "Отметка ухода",           uz: "Ketish belgisi",          en: "Check out" },
  "ts.checkInDesc":     { ru: "Сделайте селфи и подтвердите место — отчёт уйдёт директору",
                          uz: "Selfi qiling va joyni tasdiqlang — hisobot direktorga yuboriladi",
                          en: "Take a selfie and confirm location — report goes to director" },
  "ts.checkOutDesc":    { ru: "Сделайте селфи перед уходом и подтвердите место",
                          uz: "Ketishdan oldin selfi qiling va joyni tasdiqlang",
                          en: "Take a selfie before leaving and confirm location" },
  "ts.step1":           { ru: "Камера",                  uz: "Kamera",                 en: "Camera" },
  "ts.step2":           { ru: "Геолокация",              uz: "Geolokatsiya",           en: "Geolocation" },
  "ts.step3":           { ru: "Готово",                  uz: "Tayyor",                 en: "Ready" },
  "ts.camErr":          { ru: "Доступ к камере не разрешён. Разрешите камеру в настройках браузера и попробуйте ещё раз.",
                          uz: "Kameraga ruxsat berilmagan. Brauzer sozlamalarida kameraga ruxsat bering va qayta urinib ko'ring.",
                          en: "Camera access denied. Allow camera in browser settings and try again." },
  "ts.camNotSupported": { ru: "Ваш браузер не поддерживает камеру. Откройте сайт в Chrome или Safari.",
                          uz: "Brauzeringiz kamerani qo'llab-quvvatlamaydi. Saytni Chrome yoki Safari'da oching.",
                          en: "Your browser doesn't support camera. Open the site in Chrome or Safari." },
  "ts.geoLocating":     { ru: "Определяем местоположение...", uz: "Joylashuv aniqlanmoqda...", en: "Detecting location..." },
  "ts.geoAllow":        { ru: "Нажмите «Разрешить» во всплывающем окне браузера",
                          uz: "Brauzer oynasida «Ruxsat berish» tugmasini bosing",
                          en: "Click \"Allow\" in the browser popup" },
  "ts.geoOk":           { ru: "Координаты получены (точность ~{acc} м)",
                          uz: "Koordinatalar olindi (aniqlik ~{acc} m)",
                          en: "Coordinates received (accuracy ~{acc} m)" },
  "ts.geoFindingAddr":  { ru: "Определяем адрес...",     uz: "Manzil aniqlanmoqda...",  en: "Resolving address..." },
  "ts.geoFail":         { ru: "Не удалось определить место", uz: "Joyni aniqlab bo'lmadi", en: "Failed to detect location" },
  "ts.geoFailDesc":     { ru: "Можно отправить отчёт без координат, но директору будет сложнее проверить.",
                          uz: "Koordinatalarsiz hisobotni yuborish mumkin, lekin direktorga tekshirish qiyinroq bo'ladi.",
                          en: "You can send the report without coordinates, but it'll be harder for director to verify." },
  "ts.geoDenied":       { ru: "Доступ к геолокации запрещён. Разрешите в настройках браузера.",
                          uz: "Geolokatsiyaga ruxsat berilmagan. Brauzer sozlamalarida ruxsat bering.",
                          en: "Geolocation access denied. Allow in browser settings." },
  "ts.geoTimeout":      { ru: "Превышено время ожидания. Попробуйте ещё раз или отправьте без координат.",
                          uz: "Kutish vaqti tugadi. Qayta urinib ko'ring yoki koordinatalarsiz yuboring.",
                          en: "Timeout. Try again or send without coordinates." },
  "ts.geoUnavailable":  { ru: "Геолокация недоступна",   uz: "Geolokatsiya mavjud emas", en: "Geolocation unavailable" },
  "ts.capture":         { ru: "Сделать снимок",          uz: "Suratga olish",          en: "Take photo" },
  "ts.retake":          { ru: "Переснять",               uz: "Qayta olish",            en: "Retake" },
  "ts.submit":          { ru: "Отправить отчёт",         uz: "Hisobotni yuborish",     en: "Submit report" },
  "ts.errNoVideo":      { ru: "Нет видео",               uz: "Video yo'q",             en: "No video" },
  "ts.errNoVideoDesc":  { ru: "Подождите пока камера загрузится", uz: "Kamera yuklanguniga qadar kuting", en: "Wait for camera to load" },
  "ts.errNoPhoto":      { ru: "Сначала сделайте снимок", uz: "Avval suratga oling",   en: "Take a photo first" },
  "ts.errWaitGeo":      { ru: "Подождите — определяем местоположение...", uz: "Kuting — joylashuv aniqlanmoqda...", en: "Wait — detecting location..." },
  "ts.errSave":         { ru: "Не удалось сохранить отчёт", uz: "Hisobotni saqlab bo'lmadi", en: "Failed to save report" },
  "ts.successIn":       { ru: "Приход отмечен",          uz: "Kelish belgilandi",      en: "Arrival recorded" },
  "ts.successOut":      { ru: "Уход отмечен",            uz: "Ketish belgilandi",      en: "Departure recorded" },
  "ts.successDesc":     { ru: "Отчёт отправлен директору", uz: "Hisobot direktorga yuborildi", en: "Report sent to director" },
  "ts.passwordLabel":   { ru: "Код подтверждения",       uz: "Tasdiqlash kodi",        en: "Confirmation code" },
  "ts.passwordPh":      { ru: "Введите код",             uz: "Kodni kiriting",         en: "Enter code" },
  "ts.passwordHint":    { ru: "Спросите код у директора", uz: "Kodni direktordan so'rang", en: "Ask the director for the code" },
  "ts.errNoPassword":   { ru: "Введите код подтверждения", uz: "Tasdiqlash kodini kiriting", en: "Enter the confirmation code" },
  "ts.errBadPassword":  { ru: "Неверный код. Попробуйте ещё раз.", uz: "Noto'g'ri kod. Qayta urinib ko'ring.", en: "Wrong code. Try again." },
  "ts.earnedToday":     { ru: "Начислено за сегодня:",   uz: "Bugun uchun hisoblandi:", en: "Earned today:" },

  "wallet.title":       { ru: "Кошелёк",                 uz: "Hamyon",                 en: "Wallet" },
  "wallet.sum":         { ru: "сум",                     uz: "so'm",                   en: "sum" },
  "worker.stats.todayEarned": { ru: "Заработано сегодня", uz: "Bugun ishlab topildi",  en: "Earned today" },

  "dir.wage.title":     { ru: "Смены и зарплата",        uz: "Smenalar va maosh",      en: "Shifts & wages" },
  "dir.wage.employee":  { ru: "Сотрудник",               uz: "Xodim",                  en: "Employee" },
  "dir.wage.date":      { ru: "Дата",                    uz: "Sana",                   en: "Date" },
  "dir.wage.in":        { ru: "Пришёл",                  uz: "Keldi",                  en: "In" },
  "dir.wage.out":       { ru: "Ушёл",                    uz: "Ketdi",                  en: "Out" },
  "dir.wage.hours":     { ru: "Часы",                    uz: "Soat",                   en: "Hours" },
  "dir.wage.status":    { ru: "Статус",                  uz: "Holat",                  en: "Status" },
  "dir.wage.earned":    { ru: "Заработок",               uz: "Daromad",                en: "Earned" },
  "dir.wage.completed": { ru: "Смена закрыта",           uz: "Smena yopildi",          en: "Shift closed" },
  "dir.wage.open":      { ru: "Не закрыта",              uz: "Yopilmagan",             en: "Open" },
  "dir.wage.totalDays": { ru: "Смен",                    uz: "Smena",                  en: "Shifts" },
  "dir.wage.totalHours":{ ru: "Часов",                   uz: "Soat",                   en: "Hours" },
  "dir.wage.totalEarned":{ ru: "Начислено, сум",         uz: "Hisoblandi, so'm",       en: "Total, sum" },
  "dir.wage.empty":     { ru: "Нет данных о сменах за выбранный период", uz: "Tanlangan davr uchun smena ma'lumotlari yo'q", en: "No shift data for the selected period" },

  /* ============== ПАНЕЛЬ ДИРЕКТОРА — НАВИГАЦИЯ ============== */
  "dir.brandSub":       { ru: "Панель директора",        uz: "Direktor paneli",        en: "Director panel" },
  "dir.tab.dashboard":  { ru: "Обзор",                   uz: "Umumiy ko'rinish",       en: "Overview" },
  "dir.tab.employees":  { ru: "Сотрудники",              uz: "Xodimlar",               en: "Employees" },
  "dir.tab.services":   { ru: "Услуги",                  uz: "Xizmatlar",              en: "Services" },
  "dir.tab.attendance": { ru: "Посещаемость",            uz: "Davomat",                en: "Attendance" },
  "dir.tab.chat":       { ru: "Чат",                     uz: "Chat",                   en: "Chat" },
  "dir.tab.orders":     { ru: "Заказы",                  uz: "Buyurtmalar",            en: "Orders" },
  "dir.tab.clients":    { ru: "Клиенты",                 uz: "Mijozlar",               en: "Clients" },
  "dir.tab.accounting": { ru: "Бухгалтерия",             uz: "Buxgalteriya",           en: "Accounting" },
  "dir.tab.settings":   { ru: "Настройки",               uz: "Sozlamalar",             en: "Settings" },
  "dir.tab.logs":       { ru: "Журнал",                  uz: "Jurnal",                 en: "Logs" },

  /* ============== ОБЗОР ============== */
  "dir.dashboard.title": { ru: "Обзор",                  uz: "Umumiy ko'rinish",       en: "Overview" },
  "dir.dashboard.sub":   { ru: "Сводка по системе на сегодня", uz: "Bugungi tizim xulosasi", en: "Today's system summary" },
  "dir.stat.employees":  { ru: "Сотрудников всего",      uz: "Jami xodimlar",          en: "Total employees" },
  "dir.stat.online":     { ru: "Онлайн сейчас",          uz: "Hozir onlayn",           en: "Online now" },
  "dir.stat.orders":     { ru: "Заказов сегодня",        uz: "Bugungi buyurtmalar",    en: "Orders today" },
  "dir.stat.revenue":    { ru: "Выручка (Сум)",          uz: "Daromad (So'm)",         en: "Revenue (UZS)" },
  "dir.recent":          { ru: "Последние действия",     uz: "Oxirgi amallar",         en: "Recent activity" },
  "dir.whoOnline":       { ru: "Кто онлайн",             uz: "Kim onlayn",             en: "Who's online" },

  /* ============== СОТРУДНИКИ ============== */
  "dir.emp.title":      { ru: "Сотрудники",              uz: "Xodimlar",               en: "Employees" },
  "dir.emp.sub":        { ru: "Создание и управление аккаунтами", uz: "Akkauntlarni yaratish va boshqarish", en: "Create and manage accounts" },
  "dir.emp.create":     { ru: "Создать аккаунт",         uz: "Akkaunt yaratish",       en: "Create account" },
  "dir.emp.newAccount": { ru: "Новый аккаунт",           uz: "Yangi akkaunt",          en: "New account" },
  "dir.emp.handover":   { ru: "Логин и пароль вы передадите сотруднику лично",
                          uz: "Login va parolni xodimga shaxsan beriasiz",
                          en: "Hand login and password to employee personally" },
  "dir.emp.fullName":   { ru: "ФИО / Имя",               uz: "F.I.Sh / Ism",           en: "Full name" },
  "dir.emp.fullNamePh": { ru: "Иван Иванов",             uz: "Ali Valiyev",            en: "John Smith" },
  "dir.emp.loginPh":    { ru: "ivan_worker",             uz: "ali_xodim",              en: "john_worker" },
  "dir.emp.passwordPh": { ru: "придумайте пароль",       uz: "parol o'ylab toping",    en: "create password" },
  "dir.emp.phone":      { ru: "Телефон (необязательно)", uz: "Telefon (ixtiyoriy)",    en: "Phone (optional)" },
  "dir.emp.role":       { ru: "Роль",                    uz: "Rol",                    en: "Role" },
  "dir.emp.errFill":    { ru: "Заполните ФИО, логин и пароль", uz: "F.I.Sh, login va parolni to'ldiring", en: "Fill name, login and password" },
  "dir.emp.errLoginPw": { ru: "Введите логин и пароль", uz: "Login va parolni kiriting", en: "Enter login and password" },
  "dir.emp.profileNote":{ ru: "Достаточно создать только логин, пароль и роль. Остальные данные (имя, телефон, адрес, фото) сотрудник заполнит сам при первом входе.",
                          uz: "Faqat login, parol va rolni yaratish kifoya. Qolgan ma'lumotlarni (ism, telefon, manzil, foto) xodim birinchi kirishda o'zi to'ldiradi.",
                          en: "Just create login, password and role. The rest (name, phone, address, photo) the employee fills in on first login." },
  "dir.emp.optional":   { ru: "Дополнительно (необязательно)", uz: "Qo'shimcha (ixtiyoriy)", en: "Additional (optional)" },
  "dir.emp.notFilled":  { ru: "Профиль не заполнен",      uz: "Profil to'ldirilmagan",  en: "Profile not filled" },
  "dir.emp.password":   { ru: "Пароль",                   uz: "Parol",                  en: "Password" },

  "profile.title":      { ru: "Заполните профиль",        uz: "Profilni to'ldiring",    en: "Complete your profile" },
  "profile.sub":        { ru: "Это нужно сделать один раз. Данные увидит только директор.",
                          uz: "Buni bir marta qilish kerak. Ma'lumotlarni faqat direktor ko'radi.",
                          en: "Do this once. Only the director sees this data." },
  "profile.addPhoto":   { ru: "Добавить фото",            uz: "Foto qo'shish",          en: "Add photo" },
  "profile.photoHint":  { ru: "Нажмите чтобы выбрать из галереи или снять камерой",
                          uz: "Galereyadan tanlash yoki kamera bilan suratga olish uchun bosing",
                          en: "Tap to pick from gallery or take a photo" },
  "profile.fullName":   { ru: "ФИО / Имя",                uz: "F.I.Sh / Ism",           en: "Full name" },
  "profile.fullNamePh": { ru: "Ваше полное имя",          uz: "To'liq ismingiz",        en: "Your full name" },
  "profile.firstName":  { ru: "Имя",                      uz: "Ism",                    en: "First name" },
  "profile.firstNamePh":{ ru: "Например: Алишер",         uz: "Masalan: Alisher",       en: "e.g. Alisher" },
  "profile.lastName":   { ru: "Фамилия",                  uz: "Familiya",               en: "Last name" },
  "profile.lastNamePh": { ru: "Например: Каримов",        uz: "Masalan: Karimov",       en: "e.g. Karimov" },
  "profile.photoLabel": { ru: "Фото профиля",             uz: "Profil rasmi",           en: "Profile photo" },
  "profile.takePhoto":  { ru: "Снять фото",               uz: "Suratga olish",          en: "Take photo" },
  "profile.fromGallery":{ ru: "Из галереи",               uz: "Galereyadan",            en: "From gallery" },
  "profile.photoHint2": { ru: "Сделайте селфи камерой или выберите готовое фото",
                          uz: "Kamera bilan selfi qiling yoki tayyor rasmni tanlang",
                          en: "Take a selfie with the camera or pick an existing photo" },
  "profile.errFirstName": { ru: "Введите имя",            uz: "Ismni kiriting",         en: "Enter your first name" },
  "profile.errLastName":  { ru: "Введите фамилию",        uz: "Familiyani kiriting",    en: "Enter your last name" },
  "profile.phonePh":    { ru: "+998 90 123 45 67",        uz: "+998 90 123 45 67",      en: "+998 90 123 45 67" },
  "profile.address":    { ru: "Адрес проживания",         uz: "Yashash manzili",        en: "Home address" },
  "profile.addressPh":  { ru: "Где вы проживаете",        uz: "Qayerda yashaysiz",      en: "Where you live" },
  "profile.detect":     { ru: "Определить",               uz: "Aniqlash",               en: "Detect" },
  "profile.detecting":  { ru: "Определяю...",             uz: "Aniqlanmoqda...",        en: "Detecting..." },
  "profile.geoOk":      { ru: "Адрес определён",          uz: "Manzil aniqlandi",       en: "Address detected" },
  "profile.geoCoords":  { ru: "Координаты получены",      uz: "Koordinatalar olindi",   en: "Coordinates obtained" },
  "profile.geoError":   { ru: "Не удалось определить местоположение", uz: "Joylashuvni aniqlab bo'lmadi", en: "Could not detect location" },
  "profile.geoDenied":  { ru: "Доступ к геолокации запрещён. Введите адрес вручную.",
                          uz: "Geolokatsiyaga ruxsat berilmadi. Manzilni qo'lda kiriting.",
                          en: "Geolocation denied. Enter address manually." },
  "profile.geoUnavailable": { ru: "Геолокация недоступна на этом устройстве", uz: "Bu qurilmada geolokatsiya mavjud emas", en: "Geolocation unavailable on this device" },
  "profile.submit":     { ru: "Сохранить и продолжить",   uz: "Saqlash va davom etish", en: "Save and continue" },
  "profile.saved":      { ru: "Профиль заполнен!",        uz: "Profil to'ldirildi!",    en: "Profile completed!" },
  "profile.errName":    { ru: "Введите имя",              uz: "Ismni kiriting",         en: "Enter your name" },
  "profile.errPhone":   { ru: "Введите номер телефона",   uz: "Telefon raqamini kiriting", en: "Enter phone number" },
  "profile.errPhoneBad":{ ru: "Введите корректный номер телефона", uz: "To'g'ri telefon raqamini kiriting", en: "Enter a valid phone number" },
  "profile.errAddress": { ru: "Введите адрес проживания", uz: "Yashash manzilini kiriting", en: "Enter your address" },
  "profile.errPhoto":   { ru: "Добавьте фото на аватар",  uz: "Avatar uchun foto qo'shing", en: "Add an avatar photo" },
  "dir.emp.errLen":     { ru: "Логин — от 3 символов, пароль — от 4", uz: "Login — 3 belgidan, parol — 4 belgidan", en: "Login min 3 chars, password min 4" },
  "dir.emp.created":    { ru: "Аккаунт создан",          uz: "Akkaunt yaratildi",      en: "Account created" },
  "dir.emp.changePw":   { ru: "Сменить пароль",          uz: "Parolni o'zgartirish",   en: "Change password" },
  "dir.emp.delete":     { ru: "Удалить",                 uz: "O'chirish",              en: "Delete" },
  "dir.emp.confirmDel": { ru: "Удалить аккаунт {login}?", uz: "{login} akkauntini o'chirasizmi?", en: "Delete account {login}?" },
  "dir.emp.removed":    { ru: "Удалён",                  uz: "O'chirildi",             en: "Removed" },
  "dir.emp.passwordChanged": { ru: "Пароль изменён",     uz: "Parol o'zgartirildi",    en: "Password changed" },
  "dir.emp.tooShort":   { ru: "Слишком короткий",        uz: "Juda qisqa",             en: "Too short" },
  "dir.emp.minChars":   { ru: "Минимум 4 символа",       uz: "Kamida 4 belgi",         en: "Minimum 4 characters" },
  "dir.emp.newPwPrompt": { ru: "Новый пароль для {login}:", uz: "{login} uchun yangi parol:", en: "New password for {login}:" },
  "dir.emp.empty":      { ru: "Пока нет сотрудников",    uz: "Hali xodimlar yo'q",     en: "No employees yet" },

  /* ============== УСЛУГИ (РЕДАКТОР) ============== */
  "dir.svc.title":      { ru: "Услуги",                  uz: "Xizmatlar",              en: "Services" },
  "dir.svc.sub":        { ru: "Редактирование услуг сайта — изменения сразу появятся на главной странице",
                          uz: "Sayt xizmatlarini tahrirlash — o'zgarishlar bosh sahifada darhol ko'rinadi",
                          en: "Edit site services — changes appear on home page instantly" },
  "dir.svc.new":        { ru: "Новая услуга",            uz: "Yangi xizmat",           en: "New service" },
  "dir.svc.drag":       { ru: "Перетащить",               uz: "Tortish",                en: "Drag" },
  "dir.svc.reordered":  { ru: "Порядок услуг сохранён",   uz: "Xizmatlar tartibi saqlandi", en: "Services order saved" },
  "dir.svc.editTitle":  { ru: "Редактировать услугу",    uz: "Xizmatni tahrirlash",    en: "Edit service" },
  "dir.svc.formSub":    { ru: "Заполните карточку услуги — она появится на главной странице",
                          uz: "Xizmat kartochkasini to'ldiring — u bosh sahifada paydo bo'ladi",
                          en: "Fill the service card — it'll appear on home page" },
  "dir.svc.nameRu":     { ru: "Название (RU)",           uz: "Nomi (RU)",              en: "Name (RU)" },
  "dir.svc.nameUz":     { ru: "Название (UZ)",           uz: "Nomi (UZ)",              en: "Name (UZ)" },
  "dir.svc.nameEn":     { ru: "Название (EN)",           uz: "Nomi (EN)",              en: "Name (EN)" },
  "dir.svc.descRu":     { ru: "Описание (RU)",           uz: "Tavsif (RU)",            en: "Description (RU)" },
  "dir.svc.descUz":     { ru: "Описание (UZ)",           uz: "Tavsif (UZ)",            en: "Description (UZ)" },
  "dir.svc.descEn":     { ru: "Описание (EN)",           uz: "Tavsif (EN)",            en: "Description (EN)" },
  "dir.svc.titlePh":    { ru: "напр. Уборка офиса",      uz: "masalan, Ofis tozalash", en: "e.g. Office cleaning" },
  "dir.svc.descPh":     { ru: "напр. Поддержание порядка в офисных помещениях",
                          uz: "masalan, Ofis xonalarida tozalikni saqlash",
                          en: "e.g. Keeping office spaces tidy" },
  "dir.svc.price":      { ru: "Цена (Сум)",              uz: "Narx (So'm)",            en: "Price (UZS)" },
  "dir.svc.unit":       { ru: "Единица измерения",       uz: "O'lchov birligi",        en: "Unit" },
  "dir.svc.unitPh":     { ru: "м² / шт / час",           uz: "m² / dona / soat",       en: "m² / pcs / hour" },
  "dir.svc.icon":       { ru: "Иконка",                  uz: "Belgi",                  en: "Icon" },
  "dir.svc.preview":    { ru: "Превью карточки",         uz: "Kartochka ko'rinishi",   en: "Card preview" },
  "dir.svc.iconPick":   { ru: "Выберите иконку из списка ниже", uz: "Quyidagi ro'yxatdan belgini tanlang", en: "Pick icon from list below" },
  "dir.svc.active":     { ru: "Услуга активна (видна на сайте)", uz: "Xizmat faol (saytda ko'rinadi)", en: "Service active (visible on site)" },
  "dir.svc.save":       { ru: "Сохранить услугу",        uz: "Xizmatni saqlash",       en: "Save service" },
  "dir.svc.errName":    { ru: "Название обязательно",    uz: "Nomi majburiy",          en: "Name required" },
  "dir.svc.errPrice":   { ru: "Цена должна быть больше нуля", uz: "Narx noldan katta bo'lishi kerak", en: "Price must be greater than zero" },
  "dir.svc.confirmDel": { ru: "Удалить услугу «{name}»? Восстановить её нельзя.",
                          uz: "«{name}» xizmatini o'chirasizmi? Tiklab bo'lmaydi.",
                          en: "Delete service \"{name}\"? Cannot be restored." },
  "dir.svc.deleted":    { ru: "Удалено",                 uz: "O'chirildi",             en: "Deleted" },
  "dir.svc.empty":      { ru: "Услуг пока нет. Создайте первую услугу.", uz: "Hali xizmatlar yo'q. Birinchi xizmatni yarating.", en: "No services yet. Create the first one." },
  "dir.svc.hide":       { ru: "Скрыть",                  uz: "Yashirish",              en: "Hide" },
  "dir.svc.show":       { ru: "Показать",                uz: "Ko'rsatish",             en: "Show" },
  "dir.svc.hidden":     { ru: "Скрыто на сайте",         uz: "Saytda yashirin",        en: "Hidden on site" },

  /* ============== ПОСЕЩАЕМОСТЬ ============== */
  "dir.att.title":      { ru: "Посещаемость",            uz: "Davomat",                en: "Attendance" },
  "dir.att.sub":        { ru: "Турникет: фото, время и адрес сотрудников",
                          uz: "Turniket: xodimlar fotosi, vaqti va manzili",
                          en: "Turnstile: employee photos, times and addresses" },
  "dir.att.refresh":    { ru: "Обновить",                uz: "Yangilash",              en: "Refresh" },
  "dir.att.clearAll":   { ru: "Очистить всё",            uz: "Hammasini tozalash",     en: "Clear all" },
  "dir.att.confirmClearAll": { ru: "Удалить ВСЕ записи турникета? Это действие нельзя отменить.",
                          uz: "Turniketning BARCHA yozuvlarini o'chirasizmi? Bekor qilib bo'lmaydi.",
                          en: "Delete ALL turnstile records? Cannot be undone." },
  "dir.att.confirmClearAll2": { ru: "Точно удалить все записи?", uz: "Aniq hammasini o'chirasizmi?", en: "Really delete all?" },
  "dir.att.cleared":    { ru: "Все записи турникета очищены", uz: "Turniketning barcha yozuvlari tozalandi", en: "All turnstile records cleared" },
  "dir.att.refreshed":  { ru: "Список перезагружен",     uz: "Ro'yxat yangilandi",     en: "List refreshed" },
  "dir.att.recordTitle": { ru: "Запись турникета",       uz: "Turniket yozuvi",        en: "Turnstile record" },
  "dir.att.summaryArrived": { ru: "Пришли сегодня",      uz: "Bugun keldilar",         en: "Arrived today" },
  "dir.att.summaryOnShift": { ru: "Сейчас на работе",    uz: "Hozir ishda",            en: "On shift now" },
  "dir.att.summaryLeft":  { ru: "Ушли сегодня",          uz: "Bugun ketdilar",         en: "Left today" },
  "dir.att.summaryTotal": { ru: "Всего отметок",         uz: "Jami belgilar",          en: "Total entries" },
  "dir.att.summaryFromN": { ru: "из {n} сотрудников",    uz: "{n} xodimdan",           en: "of {n} employees" },
  "dir.att.summaryDidntLeave": { ru: "не отметили уход", uz: "ketishni belgilamaganlar", en: "didn't check out" },
  "dir.att.summaryToday": { ru: "за сегодня",            uz: "bugun",                  en: "today" },
  "dir.att.summaryCheckedOut": { ru: "отметили уход",    uz: "ketishni belgiladilar",  en: "checked out" },
  "dir.att.filterUser": { ru: "Сотрудник",               uz: "Xodim",                  en: "Employee" },
  "dir.att.filterAll":  { ru: "Все сотрудники",          uz: "Barcha xodimlar",        en: "All employees" },
  "dir.att.filterType": { ru: "Тип",                     uz: "Turi",                   en: "Type" },
  "dir.att.filterTypeAll": { ru: "Все",                  uz: "Barchasi",               en: "All" },
  "dir.att.filterIn":   { ru: "Только приходы",          uz: "Faqat kelishlar",        en: "Arrivals only" },
  "dir.att.filterOut":  { ru: "Только уходы",            uz: "Faqat ketishlar",        en: "Departures only" },
  "dir.att.filterFrom": { ru: "С даты",                  uz: "Sanadan",                en: "From date" },
  "dir.att.filterTo":   { ru: "По дату",                 uz: "Sanagacha",              en: "To date" },
  "dir.att.empty":      { ru: "Нет записей по выбранным фильтрам", uz: "Tanlangan filtrlarga mos yozuv yo'q", en: "No records for selected filters" },
  "dir.att.in":         { ru: "Приход",                  uz: "Kelish",                 en: "Arrival" },
  "dir.att.out":        { ru: "Уход",                    uz: "Ketish",                 en: "Departure" },
  "dir.att.inLong":     { ru: "Приход на работу",        uz: "Ishga kelish",           en: "Arrival at work" },
  "dir.att.outLong":    { ru: "Уход с работы",           uz: "Ishdan ketish",          en: "Departure from work" },
  "dir.att.noLoc":      { ru: "Геолокация не указана",   uz: "Joylashuv ko'rsatilmagan", en: "No location" },
  "dir.att.noLocFull":  { ru: "Геолокация не была указана", uz: "Joylashuv ko'rsatilmagan edi", en: "Location wasn't provided" },
  "dir.att.notFound":   { ru: "Запись не найдена",       uz: "Yozuv topilmadi",        en: "Record not found" },
  "dir.att.confirmDel": { ru: "Удалить эту запись турникета?", uz: "Ushbu turniket yozuvini o'chirasizmi?", en: "Delete this turnstile record?" },
  "dir.att.recordDeleted": { ru: "Запись удалена",       uz: "Yozuv o'chirildi",       en: "Record deleted" },
  "dir.att.deleteRecord": { ru: "Удалить запись",        uz: "Yozuvni o'chirish",      en: "Delete record" },
  "dir.att.openMap":    { ru: "Открыть в OpenStreetMap", uz: "OpenStreetMap'da ochish", en: "Open in OpenStreetMap" },
  "dir.att.fieldType":  { ru: "Тип",                     uz: "Turi",                   en: "Type" },
  "dir.att.fieldEmp":   { ru: "Сотрудник",               uz: "Xodim",                  en: "Employee" },
  "dir.att.fieldDate":  { ru: "Дата",                    uz: "Sana",                   en: "Date" },
  "dir.att.fieldTime":  { ru: "Время",                   uz: "Vaqt",                   en: "Time" },
  "dir.att.fieldAddr":  { ru: "Адрес",                   uz: "Manzil",                 en: "Address" },
  "dir.att.addrUnknown": { ru: "Не определён",           uz: "Aniqlanmagan",           en: "Unknown" },
  "dir.att.accuracy":   { ru: "точность ~{n} м",         uz: "aniqlik ~{n} m",         en: "accuracy ~{n} m" },
  "dir.att.noPhoto":    { ru: "Фото не сохранено",       uz: "Foto saqlanmagan",       en: "Photo not saved" },

  /* ============== ЧАТ ============== */
  "dir.chat.title":     { ru: "Чат с сотрудниками",      uz: "Xodimlar bilan chat",    en: "Chat with employees" },
  "dir.chat.sub":       { ru: "Отправляйте задания и сообщения", uz: "Vazifa va xabarlar yuboring", en: "Send tasks and messages" },
  "dir.chat.pickPerson": { ru: "Выберите сотрудника слева", uz: "Chap tomondagi xodimni tanlang", en: "Pick employee on the left" },
  "dir.chat.messagePh": { ru: "Сообщение или задание...", uz: "Xabar yoki vazifa...",  en: "Message or task..." },
  "dir.chat.empty":     { ru: "Нет диалогов",            uz: "Suhbatlar yo'q",         en: "No conversations" },
  "staff.chat.dirInfo": { ru: "Здесь будут сообщения от директора.\nНапишите первым — он получит уведомление в панели.",
                          uz: "Bu yerda direktorning xabarlari ko'rinadi.\nBirinchi yozing — direktor panelda bildirishnoma oladi.",
                          en: "Director's messages will appear here.\nWrite first — they'll get a notification in panel." },
  "staff.chat.placeholder": { ru: "Сообщение директору...", uz: "Direktorga xabar...", en: "Message to director..." },
  "staff.chat.noDir":   { ru: "Директор пока не зарегистрирован", uz: "Direktor hali ro'yxatdan o'tmagan", en: "Director not registered yet" },

  /* ============== ЗАКАЗЫ (ДИРЕКТОР) ============== */
  "dir.ord.title":      { ru: "Заказы",                  uz: "Buyurtmalar",            en: "Orders" },
  "dir.ord.sub":        { ru: "Все заказы и управление статусом оплаты", uz: "Barcha buyurtmalar va to'lov holatini boshqarish", en: "All orders and payment status control" },
  "dir.ord.fAll":       { ru: "Все",                     uz: "Barchasi",               en: "All" },
  "dir.ord.fPaid":      { ru: "Оплачены",                uz: "To'langan",              en: "Paid" },
  "dir.ord.fUnpaid":    { ru: "Не оплачены",             uz: "To'lanmagan",            en: "Unpaid" },
  "dir.ord.fDraft":     { ru: "Черновики",               uz: "Qoralamalar",            en: "Drafts" },
  "dir.ord.empty":      { ru: "Нет заказов",             uz: "Buyurtmalar yo'q",       en: "No orders" },

  /* ============== КЛИЕНТЫ ============== */
  "dir.cli.title":      { ru: "Клиентская база",         uz: "Mijozlar bazasi",        en: "Client database" },
  "dir.cli.sub":        { ru: "Все клиенты, которые когда-либо делали заказ", uz: "Buyurtma bergan barcha mijozlar", en: "All clients who ever ordered" },
  "dir.cli.searchPh":   { ru: "🔎 Поиск по имени или телефону...", uz: "🔎 Ism yoki telefon bo'yicha qidirish...", en: "🔎 Search by name or phone..." },
  "dir.cli.empty":      { ru: "Пока нет клиентов",       uz: "Hali mijozlar yo'q",     en: "No clients yet" },
  "dir.cli.orders":     { ru: "заказов",                 uz: "buyurtma",               en: "orders" },

  /* ============== НАСТРОЙКИ ============== */
  "dir.set.title":      { ru: "Настройки сайта",         uz: "Sayt sozlamalari",       en: "Site settings" },
  "dir.set.sub":        { ru: "Название компании, контактные данные", uz: "Kompaniya nomi, aloqa ma'lumotlari", en: "Company name, contact details" },
  "dir.set.companyName":{ ru: "Название компании",       uz: "Kompaniya nomi",         en: "Company name" },
  "dir.set.tagline":    { ru: "Слоган",                  uz: "Shior",                  en: "Tagline" },
  "dir.set.callCenter": { ru: "Телефон Call Center",     uz: "Call Center telefoni",   en: "Call Center phone" },
  "dir.set.saved":      { ru: "Настройки сохранены",     uz: "Sozlamalar saqlandi",    en: "Settings saved" },

  /* ============== ЖУРНАЛ ============== */
  "dir.log.title":      { ru: "Журнал действий",         uz: "Amallar jurnali",        en: "Activity log" },
  "dir.log.sub":        { ru: "Все действия в системе",  uz: "Tizimdagi barcha amallar", en: "All system actions" },
  "dir.log.clear":      { ru: "Очистить журнал",         uz: "Jurnalni tozalash",      en: "Clear log" },
  "dir.log.confirmClear": { ru: "Очистить журнал действий?", uz: "Amallar jurnalini tozalaysizmi?", en: "Clear activity log?" },
  "dir.log.cleared":    { ru: "Журнал очищен",           uz: "Jurnal tozalandi",       en: "Log cleared" },
  "dir.log.empty":      { ru: "Журнал пуст",             uz: "Jurnal bo'sh",           en: "Log is empty" },

  /* ============== НОВЫЕ ПОЛЯ ЗАКАЗА ============== */
  "order.price":           { ru: "Цена (Сум)",                uz: "Narx (So'm)",                en: "Price (UZS)" },
  "order.advance":         { ru: "Аванс (Сум)",               uz: "Avans (So'm)",               en: "Advance (UZS)" },
  "order.remaining":       { ru: "К доплате",                 uz: "Qoldi to'lash",              en: "Remaining" },
  "order.errPrice":        { ru: "Введите цену больше нуля",  uz: "Noldan katta narx kiriting", en: "Enter price greater than zero" },
  "order.errAdvance":      { ru: "Введите сумму аванса (можно 0)", uz: "Avans summasini kiriting (0 mumkin)", en: "Enter advance amount (0 allowed)" },
  "order.errAdvanceHigh":  { ru: "Аванс не может быть больше цены", uz: "Avans narxdan ko'p bo'lishi mumkin emas", en: "Advance can't exceed price" },
  "order.errNotAllowed":   { ru: "Только директор и бухгалтер могут оформлять заказы", uz: "Faqat direktor va buxgalter buyurtma rasmiylashtira oladi", en: "Only director and accountant can create orders" },
  "order.detectLocation":  { ru: "Определить адрес автоматически", uz: "Manzilni avtomatik aniqlash", en: "Detect address automatically" },
  "order.locating":        { ru: "Определяем адрес...",       uz: "Manzil aniqlanmoqda...",     en: "Detecting address..." },
  "order.locationFail":    { ru: "Не удалось определить — введите адрес вручную", uz: "Aniqlanmadi — manzilni qo'lda kiriting", en: "Failed — enter address manually" },
  "order.dateAuto":        { ru: "Сейчас",                    uz: "Hozir",                      en: "Now" },
  "order.client":          { ru: "Клиент",                    uz: "Mijoz",                      en: "Client" },
  "order.priceInfo":       { ru: "Стоимость определит исполнитель", uz: "Narxni ijrochi belgilaydi", en: "Price will be set by performer" },

  /* ============== ЧЕК ============== */
  "receipt.title":         { ru: "Чек заказа",                uz: "Buyurtma cheki",             en: "Order receipt" },
  "receipt.show":          { ru: "Чек",                       uz: "Chek",                       en: "Receipt" },
  "receipt.no":            { ru: "Чек №",                     uz: "Chek №",                     en: "Receipt #" },
  "receipt.date":          { ru: "Дата",                      uz: "Sana",                       en: "Date" },
  "receipt.service":       { ru: "Услуга",                    uz: "Xizmat",                     en: "Service" },
  "receipt.client":        { ru: "Клиент",                    uz: "Mijoz",                      en: "Client" },
  "receipt.phone":         { ru: "Телефон",                   uz: "Telefon",                    en: "Phone" },
  "receipt.address":       { ru: "Адрес",                     uz: "Manzil",                     en: "Address" },
  "receipt.scheduled":     { ru: "Дата выезда",               uz: "Borish sanasi",              en: "Scheduled date" },
  "receipt.price":         { ru: "Цена",                      uz: "Narx",                       en: "Price" },
  "receipt.advance":       { ru: "Аванс",                     uz: "Avans",                      en: "Advance" },
  "receipt.remaining":     { ru: "К доплате",                 uz: "Qoldi to'lash",              en: "Remaining" },
  "receipt.paid":          { ru: "ОПЛАЧЕН",                   uz: "TO'LANGAN",                  en: "PAID" },
  "receipt.unpaid":        { ru: "НЕ ОПЛАЧЕН",                uz: "TO'LANMAGAN",                en: "UNPAID" },
  "receipt.draft":         { ru: "ЧЕРНОВИК",                  uz: "QORALAMA",                   en: "DRAFT" },
  "receipt.sendToStaff":   { ru: "Отправить сотруднику",      uz: "Xodimga yuborish",           en: "Send to staff" },
  "receipt.download":      { ru: "Скачать",                   uz: "Yuklab olish",               en: "Download" },
  "receipt.print":         { ru: "Печать",                    uz: "Chop etish",                 en: "Print" },
  "receipt.pickStaff":     { ru: "Выберите сотрудника",       uz: "Xodimni tanlang",            en: "Pick a staff member" },
  "receipt.pickStaffSub":  { ru: "Выберите кому отправить чек как задание", uz: "Chekni vazifa sifatida kimga yuborishni tanlang", en: "Choose who'll get this receipt as a task" },
  "receipt.sent":          { ru: "Чек отправлен",             uz: "Chek yuborildi",             en: "Receipt sent" },
  "receipt.sentTo":        { ru: "Отправлено: {n}",           uz: "Yuborildi: {n}",             en: "Sent to: {n}" },
  "receipt.chatLabel":     { ru: "📋 Новое задание — чек заказа", uz: "📋 Yangi vazifa — buyurtma cheki", en: "📋 New task — order receipt" },
  "receipt.noStaff":       { ru: "Нет сотрудников",           uz: "Xodimlar yo'q",              en: "No staff" },
  "receipt.thanks":        { ru: "Спасибо за заказ!",         uz: "Buyurtma uchun rahmat!",     en: "Thank you for your order!" },
  "receipt.contact":       { ru: "Контакт",                   uz: "Aloqa",                      en: "Contact" },

  /* ============== ЗАДАНИЯ (ВКЛАДКА) ============== */
  "dir.tab.tasks":         { ru: "Задания",                   uz: "Vazifalar",                  en: "Tasks" },
  "dir.tasks.title":       { ru: "Задания сотрудникам",       uz: "Xodimlarga vazifalar",       en: "Tasks for staff" },
  "dir.tasks.sub":         { ru: "Отправьте задание одному или нескольким сотрудникам", uz: "Bir yoki bir nechta xodimga vazifa yuboring", en: "Send a task to one or several employees" },
  "dir.tasks.text":        { ru: "Текст задания",             uz: "Vazifa matni",               en: "Task text" },
  "dir.tasks.textPh":      { ru: "Например: Завтра объект — ул. Ленина 5, начало в 9:00. Возьмите инструменты.",
                            uz: "Masalan: Ertaga obyekt — Lenina ko'chasi 5, soat 9:00 da. Asboblarni oling.",
                            en: "E.g.: Tomorrow's site — Lenin Str 5, start 9:00. Bring tools." },
  "dir.tasks.pickStaff":   { ru: "Кому отправить",            uz: "Kimga yuborish",             en: "Send to" },
  "dir.tasks.pickAll":     { ru: "Все сотрудники",            uz: "Barcha xodimlar",            en: "All staff" },
  "dir.tasks.clearAll":    { ru: "Снять выбор",               uz: "Tanlovni olib tashlash",     en: "Clear selection" },
  "dir.tasks.send":        { ru: "Отправить задание",         uz: "Vazifani yuborish",          en: "Send task" },
  "dir.tasks.selected":    { ru: "Выбрано: {n}",              uz: "Tanlangan: {n}",             en: "Selected: {n}" },
  "dir.tasks.errEmpty":    { ru: "Напишите текст задания",    uz: "Vazifa matnini yozing",      en: "Write task text" },
  "dir.tasks.errNobody":   { ru: "Выберите хотя бы одного сотрудника", uz: "Kamida bitta xodimni tanlang", en: "Select at least one employee" },
  "dir.tasks.sent":        { ru: "Задание отправлено",        uz: "Vazifa yuborildi",           en: "Task sent" },
  "dir.tasks.sentTo":      { ru: "Получили: {n}",             uz: "Oldilar: {n}",               en: "Recipients: {n}" },
  "dir.tasks.recent":      { ru: "Отправленные задания",      uz: "Yuborilgan vazifalar",       en: "Sent tasks" },
  "dir.tasks.empty":       { ru: "Пока заданий не отправлено", uz: "Hali vazifalar yuborilmagan", en: "No tasks sent yet" },
  "dir.tasks.recipients":  { ru: "получателей",               uz: "ta oluvchi",                 en: "recipients" },
  "dir.tasks.taskFor":     { ru: "Задание для",               uz: "Vazifa uchun:",              en: "Task for" },

  /* ============== МОИ ЗАДАНИЯ (СОТРУДНИК) ============== */
  "my.tasks.title":        { ru: "Мои задания",               uz: "Mening vazifalarim",         en: "My tasks" },
  "my.tasks.sub":          { ru: "Задания от директора",      uz: "Direktordan vazifalar",      en: "Tasks from director" },
  "my.tasks.empty":        { ru: "Пока нет заданий",          uz: "Hali vazifalar yo'q",        en: "No tasks yet" },
  "my.tasks.from":         { ru: "От",                        uz: "Kimdan:",                    en: "From" },
  "my.tasks.markDone":     { ru: "Отметить выполненным",      uz: "Bajarilgan deb belgilash",   en: "Mark as done" },
  "my.tasks.done":         { ru: "Выполнено",                 uz: "Bajarildi",                  en: "Done" },
  "my.tasks.received":     { ru: "Получено",                  uz: "Olingan",                    en: "Received" },
  "my.tasks.completed":    { ru: "Задание отмечено как выполненное", uz: "Vazifa bajarilgan deb belgilandi", en: "Task marked as done" },
  "my.tasks.new":          { ru: "Новое",                     uz: "Yangi",                      en: "New" },
  "nav.tasks":             { ru: "Задания",                   uz: "Vazifalar",                  en: "Tasks" },
  "nav.myTasksBadge":      { ru: "{n} новых",                 uz: "{n} ta yangi",               en: "{n} new" },

  /* ============== СТРАНИЦА РАБОТНИКА ============== */
  "worker.title":          { ru: "Рабочий кабинет",            uz: "Ish kabineti",               en: "Worker dashboard" },
  "worker.welcome":        { ru: "Здравствуйте",              uz: "Salom",                      en: "Welcome" },
  "worker.subtitle":       { ru: "Отмечайтесь, общайтесь с директором, выполняйте задания", uz: "Davomatni belgilang, direktor bilan muloqot qiling, vazifalarni bajaring", en: "Check in, chat with director, complete tasks" },
  "worker.card.attendance":{ ru: "Турникет",                  uz: "Turniket",                   en: "Attendance" },
  "worker.card.attendanceSub":{ ru: "Отметьте приход и уход", uz: "Kelish va ketishni belgilang", en: "Mark arrival and departure" },
  "worker.card.chat":      { ru: "Чат с директором",          uz: "Direktor bilan suhbat",      en: "Chat with director" },
  "worker.card.chatSub":   { ru: "Сообщения и обратная связь", uz: "Xabarlar va aloqa",         en: "Messages and feedback" },
  "worker.card.tasks":     { ru: "Мои задания",               uz: "Mening vazifalarim",         en: "My tasks" },
  "worker.card.tasksSub":  { ru: "Задания от директора",      uz: "Direktordan vazifalar",      en: "Tasks from director" },
  "worker.open":           { ru: "Открыть",                   uz: "Ochish",                     en: "Open" },
  "worker.stats.tasksPending": { ru: "Активных заданий",       uz: "Faol vazifalar",             en: "Active tasks" },
  "worker.stats.tasksDone":{ ru: "Выполнено сегодня",         uz: "Bugun bajarildi",            en: "Done today" },
  "worker.stats.attToday": { ru: "Отметок сегодня",           uz: "Bugungi belgilar",           en: "Check-ins today" },
};

/* ===== ДВИЖОК ===== */
function getCurrentLang() {
  const stored = localStorage.getItem(I18N_STORAGE_KEY);
  if (stored && I18N_LANGS[stored]) return stored;
  return I18N_DEFAULT;
}

function setLang(code) {
  if (!I18N_LANGS[code]) return;
  localStorage.setItem(I18N_STORAGE_KEY, code);
  applyI18n();
  document.documentElement.lang = code;
  // Уведомляем приложение что язык поменялся
  window.dispatchEvent(new CustomEvent("lang-changed", { detail: { lang: code } }));
}

function t(key, params) {
  const lang = getCurrentLang();
  const entry = I18N_DICT[key];
  if (!entry) {
    console.warn("[i18n] missing key:", key);
    return key;
  }
  let str = entry[lang] || entry[I18N_DEFAULT] || entry.ru || key;
  if (params) {
    Object.keys(params).forEach(p => {
      str = str.replaceAll("{" + p + "}", params[p]);
    });
  }
  return str;
}

// Перевод сложного объекта услуги: возвращает строку для текущего языка с фолбэками
function tService(service, field) {
  if (!service) return "";
  const lang = getCurrentLang();
  // field может быть "title" или "description"
  const key = field;
  // Поддержка нового формата (titleRu/titleUz/titleEn) и старого (title)
  const ruKey = key + "Ru";
  const uzKey = key + "Uz";
  const enKey = key + "En";
  if (lang === "uz") return service[uzKey] || service[ruKey] || service[enKey] || service[key] || "";
  if (lang === "en") return service[enKey] || service[ruKey] || service[uzKey] || service[key] || "";
  return service[ruKey] || service[uzKey] || service[enKey] || service[key] || "";
}

function applyI18n(root) {
  const scope = root || document;

  // Обычный текст
  scope.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });

  // HTML (с иконками внутри)
  scope.querySelectorAll("[data-i18n-html]").forEach(el => {
    const key = el.getAttribute("data-i18n-html");
    // Сохраняем HTML — заменяем только текст рядом с иконками
    const translated = t(key);
    // Если внутри есть <i> или <span class="btn-text"> — обновляем .btn-text
    const span = el.querySelector(".btn-text");
    if (span) {
      span.textContent = translated;
    } else {
      el.textContent = translated;
    }
  });

  // placeholder
  scope.querySelectorAll("[data-i18n-ph]").forEach(el => {
    const key = el.getAttribute("data-i18n-ph");
    el.setAttribute("placeholder", t(key));
  });

  // title
  scope.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    el.setAttribute("title", t(key));
  });

  // Обновляем title страницы если есть мета
  const titleKey = document.querySelector('meta[name="i18n-title"]');
  if (titleKey) {
    document.title = t(titleKey.getAttribute("content"));
  }
}

// HTML для переключателя языка (вставляется в навбар)
function renderLangSwitcher(activeLang) {
  const lang = activeLang || getCurrentLang();
  return `
    <div class="lang-switcher" role="group" aria-label="Language">
      ${Object.values(I18N_LANGS).map(l => `
        <button type="button"
                class="lang-btn ${l.code === lang ? 'lang-btn-active' : ''}"
                data-lang="${l.code}"
                onclick="setLang('${l.code}')"
                aria-label="${l.name}">
          <span class="lang-flag">${l.flag}</span>
          <span class="lang-code">${l.code.toUpperCase()}</span>
        </button>
      `).join("")}
    </div>
  `;
}

// Маленький переключатель только с флажками (для боковой панели директора)
function renderLangSwitcherCompact() {
  const lang = getCurrentLang();
  return `
    <div class="lang-switcher-compact">
      ${Object.values(I18N_LANGS).map(l => `
        <button type="button"
                class="lang-btn-compact ${l.code === lang ? 'lang-btn-active' : ''}"
                data-lang="${l.code}"
                onclick="setLang('${l.code}')"
                aria-label="${l.name}"
                title="${l.name}">
          ${l.flag}
        </button>
      `).join("")}
    </div>
  `;
}

// Применяем язык к <html lang> сразу
document.documentElement.lang = getCurrentLang();
