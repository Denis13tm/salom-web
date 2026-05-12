"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type SalomTheme = "light" | "dark" | "system";
export type SalomLanguage = "uz" | "ru" | "en";

const THEME_KEY = "salom_ui_theme";
const LANGUAGE_KEY = "salom_ui_language";

type PreferencesContextValue = {
  theme: SalomTheme;
  language: SalomLanguage;
  setTheme: (theme: SalomTheme) => void;
  setLanguage: (language: SalomLanguage) => void;
  t: (key: keyof typeof messages.uz) => string;
};

const messages = {
  uz: {
    /* ---------- Appearance ---------- */
    preferencesTitle: "Ko'rinish va til",
    theme: "Rejim",
    language: "Til",
    light: "Yorug'",
    dark: "Qorong'i",
    system: "Tizim",
    uz: "O'zbek",
    ru: "Rus",
    en: "English",

    /* ---------- Navigation labels ---------- */
    dashboard: "Dashboard",
    newOrder: "Yangi buyurtma",
    dispatch: "Dispatch",
    liveMap: "Jonli xarita",
    orders: "Buyurtmalar",
    drivers: "Haydovchilar",
    driverChat: "Haydovchi chat",
    driverNotifications: "Haydovchi xabarlari",
    disputes: "Nizolar",
    settings: "Sozlamalar",
    overview: "Overview",
    applications: "Arizalar",
    vehicles: "Transportlar",
    operators: "Operatorlar",
    zones: "Zonalar",
    tariffs: "Tariflar",
    finance: "Moliya",
    sms: "SMS",
    subscriptions: "Obunalar",
    reports: "Hisobotlar",
    audit: "Audit",
    leaderboardNav: "Chempionlar reytingi",
    championsBannersNav: "Chempionlar bannerlari",
    xpAdminNav: "Haydovchi XP",

    /* ---------- Operator sidebar sections ---------- */
    secWorkflow: "Ish oqimi",
    secMonitoring: "Monitoring",
    secTeam: "Jamoa",
    secSystem: "Tizim",

    /* ---------- Admin sidebar groups ---------- */
    grpGeneral: "Umumiy",
    grpGeneralSub: "Bosh sahifa va statistika",
    grpDrivers: "Haydovchilar va xodimlar",
    grpDriversSub: "Ro'yxat va tekshirish",
    grpZones: "Zonalar va narxlar",
    grpZonesSub: "Shahar zonasi va narxlash",
    grpFinance: "Moliya",
    grpFinanceSub: "Balans va hisobotlar",
    grpComms: "Aloqa va obunalar",
    grpReports: "Hisobot va sozlamalar",

    /* ---------- Admin branding ---------- */
    adminLabel: "Admin",
    adminSidebarSubtitle: "Moliya va hujjatlar — bu yerda; operator esa dispatch uchun",

    /* ---------- Operator Chrome ---------- */
    liveDispatch: "Live dispatch",
    operatorWorkflow: "Operator workflow",
    home: "Bosh",

    /* ---------- Common actions ---------- */
    loading: "Yuklanmoqda…",
    refresh: "Yangilash",
    retry: "Qayta urinish",
    save: "Saqlash",
    saving: "Saqlanmoqda…",
    add: "Qo'shish",
    edit: "Tahrirlash",
    actions: "Amallar",
    activate: "Faollashtirish",
    suspend: "To'xtatish",
    deleteItem: "O'chirish",
    confirm: "Tasdiqlash",
    updatedAt: "Yangilandi",

    /* ---------- Operator settings ---------- */
    operatorProfile: "Operator profili",
    operatorName: "Operator nomi",
    phoneNumber: "Telefon raqam",
    assignedZone: "Biriktirilgan zona",
    statusId: "Status / ID",
    savePhone: "Telefonni saqlash",
    phoneSaved: "Telefon raqam yangilandi.",
    permissions: "Ruxsatlar",
    permissionsDesc: "Operator admin panelga o'ta olmaydi. Zona, ism, status va xizmat huquqlari administrator tomonidan boshqariladi.",
    noSession: "Operator sessiyasi topilmadi. Hisobingiz admin tomonidan yaratilgan va faol bo'lishi kerak.",
    settingsPageDesc: "Operator profili, biriktirilgan zona va panel ko'rinishi. Shaxsiy ma'lumotlarni administrator boshqaradi; telefon raqamni shu yerda yangilash mumkin.",

    /* ---------- Admin dashboard stats ---------- */
    todaysOrders: "Bugungi buyurtmalar",
    completedToday: "Tugallangan (bugun)",
    cancelledToday: "Bekor (bugun)",
    cancelRate: "Bekor stavkasi (taxmin)",
    activeDriversStat: "Aktiv haydovchi (offline emas)",
    onlineDriversStat: "Online / safarda",
    openDisputesStat: "Ochiq nizo (trip)",
    gmvToday: "GMV (bugun, so'm)",
    commissionToday: "Komissiya (bugun)",
    totalDriverBalance: "Haydovchi balanslari (jami)",

    /* ---------- Table & form ---------- */
    name: "Ism",
    phone: "Telefon",
    status: "Status",
    zone: "Zona",
    balance: "Balans",
    machine: "Mashina",
    operation: "Operatsiya",
    noData: "Hech narsa chiqmadi.",
    search: "Qidirish",
    filter: "Filter",
    all: "Hammasi",
    newOperator: "Yangi operator",

    /* ---------- Status labels ---------- */
    statusActive: "Faol",
    statusSuspended: "To'xtatilgan",
    statusPending: "Kutilmoqda",
  },

  ru: {
    /* ---------- Appearance ---------- */
    preferencesTitle: "Внешний вид и язык",
    theme: "Режим",
    language: "Язык",
    light: "Светлая",
    dark: "Тёмная",
    system: "Системная",
    uz: "Узбекский",
    ru: "Русский",
    en: "English",

    /* ---------- Navigation labels ---------- */
    dashboard: "Панель",
    newOrder: "Новый заказ",
    dispatch: "Диспетчер",
    liveMap: "Живая карта",
    orders: "Заказы",
    drivers: "Водители",
    driverChat: "Чат водителей",
    driverNotifications: "Уведомления водителям",
    disputes: "Споры",
    settings: "Настройки",
    overview: "Обзор",
    applications: "Заявки",
    vehicles: "Авто",
    operators: "Операторы",
    zones: "Зоны",
    tariffs: "Тарифы",
    finance: "Финансы",
    sms: "SMS",
    subscriptions: "Подписки",
    reports: "Отчёты",
    audit: "Аудит",
    leaderboardNav: "Таблица лидеров",
    championsBannersNav: "Баннеры чемпионов",
    xpAdminNav: "XP водителей",

    /* ---------- Operator sidebar sections ---------- */
    secWorkflow: "Рабочий процесс",
    secMonitoring: "Мониторинг",
    secTeam: "Команда",
    secSystem: "Система",

    /* ---------- Admin sidebar groups ---------- */
    grpGeneral: "Общее",
    grpGeneralSub: "Главная и статистика",
    grpDrivers: "Водители и персонал",
    grpDriversSub: "Список и проверка",
    grpZones: "Зоны и цены",
    grpZonesSub: "Городские зоны и тарифы",
    grpFinance: "Финансы",
    grpFinanceSub: "Баланс и отчёты",
    grpComms: "Связь и подписки",
    grpReports: "Отчёты и настройки",

    /* ---------- Admin branding ---------- */
    adminLabel: "Админ",
    adminSidebarSubtitle: "Финансы и документы — здесь; оператор — для диспетчера",

    /* ---------- Operator Chrome ---------- */
    liveDispatch: "Диспетчер",
    operatorWorkflow: "Панель оператора",
    home: "Главная",

    /* ---------- Common actions ---------- */
    loading: "Загрузка…",
    refresh: "Обновить",
    retry: "Повторить",
    save: "Сохранить",
    saving: "Сохраняется…",
    add: "Добавить",
    edit: "Изменить",
    actions: "Действия",
    activate: "Активировать",
    suspend: "Приостановить",
    deleteItem: "Удалить",
    confirm: "Подтвердить",
    updatedAt: "Обновлено",

    /* ---------- Operator settings ---------- */
    operatorProfile: "Профиль оператора",
    operatorName: "Имя оператора",
    phoneNumber: "Номер телефона",
    assignedZone: "Привязанная зона",
    statusId: "Статус / ID",
    savePhone: "Сохранить телефон",
    phoneSaved: "Номер телефона обновлён.",
    permissions: "Разрешения",
    permissionsDesc: "Оператор не может перейти в панель администратора. Зона, имя, статус и права на сервис управляются администратором.",
    noSession: "Сессия оператора не найдена. Ваш аккаунт должен быть создан и активирован администратором.",
    settingsPageDesc: "Профиль оператора, привязанная зона и вид панели. Персональные данные управляются администратором; номер телефона можно изменить здесь.",

    /* ---------- Admin dashboard stats ---------- */
    todaysOrders: "Заказы сегодня",
    completedToday: "Завершено (сегодня)",
    cancelledToday: "Отменено (сегодня)",
    cancelRate: "Процент отмены (ориент.)",
    activeDriversStat: "Активные водители (не офлайн)",
    onlineDriversStat: "Онлайн / в поездке",
    openDisputesStat: "Открытые споры (поездка)",
    gmvToday: "ГМО (сегодня, сум)",
    commissionToday: "Комиссия (сегодня)",
    totalDriverBalance: "Балансы водителей (всего)",

    /* ---------- Table & form ---------- */
    name: "Имя",
    phone: "Телефон",
    status: "Статус",
    zone: "Зона",
    balance: "Баланс",
    machine: "Авто",
    operation: "Операция",
    noData: "Ничего не найдено.",
    search: "Поиск",
    filter: "Фильтр",
    all: "Все",
    newOperator: "Новый оператор",

    /* ---------- Status labels ---------- */
    statusActive: "Активен",
    statusSuspended: "Приостановлен",
    statusPending: "Ожидание",
  },

  en: {
    /* ---------- Appearance ---------- */
    preferencesTitle: "Appearance and language",
    theme: "Mode",
    language: "Language",
    light: "Light",
    dark: "Dark",
    system: "System",
    uz: "Uzbek",
    ru: "Russian",
    en: "English",

    /* ---------- Navigation labels ---------- */
    dashboard: "Dashboard",
    newOrder: "New order",
    dispatch: "Dispatch",
    liveMap: "Live map",
    orders: "Orders",
    drivers: "Drivers",
    driverChat: "Driver chat",
    driverNotifications: "Driver notifications",
    disputes: "Disputes",
    settings: "Settings",
    overview: "Overview",
    applications: "Applications",
    vehicles: "Vehicles",
    operators: "Operators",
    zones: "Zones",
    tariffs: "Tariffs",
    finance: "Finance",
    sms: "SMS",
    subscriptions: "Subscriptions",
    reports: "Reports",
    audit: "Audit",
    leaderboardNav: "Champions leaderboard",
    championsBannersNav: "Champions ad banners",
    xpAdminNav: "Driver XP",

    /* ---------- Operator sidebar sections ---------- */
    secWorkflow: "Workflow",
    secMonitoring: "Monitoring",
    secTeam: "Team",
    secSystem: "System",

    /* ---------- Admin sidebar groups ---------- */
    grpGeneral: "General",
    grpGeneralSub: "Home & statistics",
    grpDrivers: "Drivers & staff",
    grpDriversSub: "List & verification",
    grpZones: "Zones & pricing",
    grpZonesSub: "City zones & tariffs",
    grpFinance: "Finance",
    grpFinanceSub: "Balances & reports",
    grpComms: "Comms & subscriptions",
    grpReports: "Reports & settings",

    /* ---------- Admin branding ---------- */
    adminLabel: "Admin",
    adminSidebarSubtitle: "Finance & documents here; operator is for dispatch",

    /* ---------- Operator Chrome ---------- */
    liveDispatch: "Live dispatch",
    operatorWorkflow: "Operator workflow",
    home: "Home",

    /* ---------- Common actions ---------- */
    loading: "Loading…",
    refresh: "Refresh",
    retry: "Retry",
    save: "Save",
    saving: "Saving…",
    add: "Add",
    edit: "Edit",
    actions: "Actions",
    activate: "Activate",
    suspend: "Suspend",
    deleteItem: "Delete",
    confirm: "Confirm",
    updatedAt: "Updated",

    /* ---------- Operator settings ---------- */
    operatorProfile: "Operator profile",
    operatorName: "Operator name",
    phoneNumber: "Phone number",
    assignedZone: "Assigned zone",
    statusId: "Status / ID",
    savePhone: "Save phone",
    phoneSaved: "Phone number updated.",
    permissions: "Permissions",
    permissionsDesc: "Operator cannot access the admin panel. Zone, name, status and service rights are managed by the administrator.",
    noSession: "Operator session not found. Your account must be created and active by an administrator.",
    settingsPageDesc: "Operator profile, assigned zone and panel appearance. Personal data is managed by the administrator; phone number can be updated here.",

    /* ---------- Admin dashboard stats ---------- */
    todaysOrders: "Today's orders",
    completedToday: "Completed (today)",
    cancelledToday: "Cancelled (today)",
    cancelRate: "Cancel rate (est.)",
    activeDriversStat: "Active drivers (not offline)",
    onlineDriversStat: "Online / on trip",
    openDisputesStat: "Open disputes (trip)",
    gmvToday: "GMV (today, UZS)",
    commissionToday: "Commission (today)",
    totalDriverBalance: "Driver balances (total)",

    /* ---------- Table & form ---------- */
    name: "Name",
    phone: "Phone",
    status: "Status",
    zone: "Zone",
    balance: "Balance",
    machine: "Vehicle",
    operation: "Operation",
    noData: "Nothing found.",
    search: "Search",
    filter: "Filter",
    all: "All",
    newOperator: "New operator",

    /* ---------- Status labels ---------- */
    statusActive: "Active",
    statusSuspended: "Suspended",
    statusPending: "Pending",
  },
} as const;

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readTheme(): SalomTheme {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(THEME_KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

function readLanguage(): SalomLanguage {
  if (typeof window === "undefined") return "uz";
  const raw = localStorage.getItem(LANGUAGE_KEY);
  return raw === "uz" || raw === "ru" || raw === "en" ? raw : "uz";
}

function resolvedTheme(theme: SalomTheme): "light" | "dark" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function SalomPreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SalomTheme>("system");
  const [language, setLanguageState] = useState<SalomLanguage>("uz");

  useEffect(() => {
    setThemeState(readTheme());
    setLanguageState(readLanguage());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme(theme);
    root.dataset.themePreference = theme;
    root.lang = language;
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [theme, language]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      document.documentElement.dataset.theme = resolvedTheme("system");
    };
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [theme]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      theme,
      language,
      setTheme: setThemeState,
      setLanguage: setLanguageState,
      t: (key) => messages[language][key] ?? messages.uz[key],
    }),
    [theme, language],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useSalomPreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("useSalomPreferences must be used inside SalomPreferencesProvider");
  }
  return ctx;
}

export function PreferenceControls({ compact = false }: { compact?: boolean }) {
  const { theme, language, setTheme, setLanguage, t } = useSalomPreferences();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as SalomTheme)}
          aria-label={t("theme")}
          className="rounded-lg border border-slate-200/80 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white focus:outline-none dark-mode-select"
        >
          <option value="system">{t("system")}</option>
          <option value="light">{t("light")}</option>
          <option value="dark">{t("dark")}</option>
        </select>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as SalomLanguage)}
          aria-label={t("language")}
          className="rounded-lg border border-slate-200/80 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white focus:outline-none dark-mode-select"
        >
          <option value="uz">{t("uz")}</option>
          <option value="ru">{t("ru")}</option>
          <option value="en">{t("en")}</option>
        </select>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="salom-field-label">
        {t("theme")}
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as SalomTheme)}
          className="salom-input mt-1.5"
        >
          <option value="system">{t("system")}</option>
          <option value="light">{t("light")}</option>
          <option value="dark">{t("dark")}</option>
        </select>
      </label>
      <label className="salom-field-label">
        {t("language")}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as SalomLanguage)}
          className="salom-input mt-1.5"
        >
          <option value="uz">{t("uz")}</option>
          <option value="ru">{t("ru")}</option>
          <option value="en">{t("en")}</option>
        </select>
      </label>
    </div>
  );
}
