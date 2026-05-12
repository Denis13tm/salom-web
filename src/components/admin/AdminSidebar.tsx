"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSalomPreferences } from "@/lib/salomPreferences";
import { useAdminChatUnreadCount } from "@/lib/useAdminChatUnreadCount";

type Group = {
  titleKey: Parameters<ReturnType<typeof useSalomPreferences>["t"]>[0];
  subtitleKey?: Parameters<ReturnType<typeof useSalomPreferences>["t"]>[0];
  items: { href: string; labelKey: Parameters<ReturnType<typeof useSalomPreferences>["t"]>[0] }[];
};

const groups: Group[] = [
  {
    titleKey: "grpGeneral",
    subtitleKey: "grpGeneralSub",
    items: [{ href: "/admin", labelKey: "overview" }],
  },
  {
    titleKey: "grpDrivers",
    subtitleKey: "grpDriversSub",
    items: [
      { href: "/admin/drivers", labelKey: "drivers" },
      { href: "/admin/applications", labelKey: "applications" },
      { href: "/admin/vehicles", labelKey: "vehicles" },
      { href: "/admin/chat", labelKey: "driverChat" },
      { href: "/admin/notifications", labelKey: "driverNotifications" },
    ],
  },
  {
    titleKey: "grpZones",
    subtitleKey: "grpZonesSub",
    items: [
      { href: "/admin/zones", labelKey: "zones" },
      { href: "/admin/tariffs", labelKey: "tariffs" },
    ],
  },
  {
    titleKey: "grpFinance",
    subtitleKey: "grpFinanceSub",
    items: [{ href: "/admin/finance", labelKey: "finance" }],
  },
  {
    titleKey: "grpComms",
    items: [
      { href: "/admin/sms", labelKey: "sms" },
      { href: "/admin/subscriptions", labelKey: "subscriptions" },
    ],
  },
  {
    titleKey: "grpReports",
    items: [
      { href: "/admin/reports", labelKey: "reports" },
      { href: "/admin/audit", labelKey: "audit" },
      { href: "/admin/leaderboard", labelKey: "leaderboardNav" },
      { href: "/admin/xp", labelKey: "xpAdminNav" },
      { href: "/admin/champions-banners", labelKey: "championsBannersNav" },
      { href: "/admin/settings", labelKey: "settings" },
    ],
  },
];

function isActive(path: string, href: string): boolean {
  if (href === "/admin") return path === "/admin";
  return path === href || path.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const path = usePathname();
  const { t } = useSalomPreferences();
  const chatUnread = useAdminChatUnreadCount();

  return (
    <aside
      className="flex w-full min-w-0 flex-col border-b border-violet-200/60 bg-gradient-to-b from-violet-50/90 to-white/60 lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:border-violet-200/60 salom-sidebar-admin"
      aria-label={t("adminLabel")}
    >
      <div className="px-3 py-3 lg:px-2 lg:pt-5">
        <p className="px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-700 salom-sidebar-brand-label">
          {t("adminLabel")}
        </p>
        <p className="mt-0.5 px-2 text-[11px] leading-relaxed text-slate-500 salom-sidebar-brand-sub">
          {t("adminSidebarSubtitle")}
        </p>
      </div>
      <nav className="flex flex-1 flex-row gap-3 overflow-x-auto px-2 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-6 [&::-webkit-scrollbar]:hidden">
        {groups.map((g) => (
          <div key={g.titleKey} className="flex shrink-0 flex-col gap-0.5 lg:mb-4 lg:shrink">
            <div className="hidden px-2 pt-1 lg:block">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700/80">
                {t(g.titleKey)}
              </p>
              {g.subtitleKey ? (
                <p className="text-[10px] leading-snug text-slate-400">{t(g.subtitleKey)}</p>
              ) : null}
            </div>
            {g.items.map(({ href, labelKey }) => {
              const on = isActive(path, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "relative shrink-0 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors",
                    on
                      ? "bg-violet-100/90 text-violet-950 ring-1 ring-violet-300/50 salom-nav-active-admin"
                      : "text-slate-600 hover:bg-violet-50 hover:text-violet-900 salom-nav-item",
                  ].join(" ")}
                >
                  <span className="inline-flex items-center gap-2">
                    {t(labelKey)}
                    {href === "/admin/chat" && chatUnread > 0 ? (
                      <span className="inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white tabular-nums">
                        {chatUnread > 99 ? "99+" : chatUnread}
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
