"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { useSalomPreferences } from "@/lib/salomPreferences";

type NavItem = {
  href: string;
  label: string;
  title?: string;
  icon: (props: { className?: string }) => ReactNode;
};

function IconGrid({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 4h7v7H4V4zM13 4h7v7h-7V4zM4 13h7v7H4v-7zM13 13h7v7h-7v-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPlusOrder({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function IconRadio({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4.5 16.5c-1.5-1.5-1.5-4 0-5.5l2-2c1.5-1.5 4-1.5 5.5 0" strokeLinecap="round" />
      <path d="M14 14c2.5-2.5 7-7 7-7" strokeLinecap="round" />
      <circle cx="5" cy="19" r="2" />
    </svg>
  );
}

function IconMap({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" strokeLinejoin="round" />
      <path d="M15 9v12" strokeLinecap="round" />
    </svg>
  );
}

function IconClipboard({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 5h-.5A2.5 2.5 0 0 0 6 7.5v13A2.5 2.5 0 0 0 8.5 23h11a2.5 2.5 0 0 0 2.5-2.5v-13A2.5 2.5 0 0 0 19.5 5H19" strokeLinecap="round" />
      <rect x="9" y="2" width="6" height="4" rx="1" />
    </svg>
  );
}

function IconUsers({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 21v-1.5c0-2.5 2.5-4 6-4s6 1.5 6 4V21" strokeLinecap="round" />
      <path d="M17 11v0M21 21v-1.2c0-1.4-1.1-2.3-3-2.8" strokeLinecap="round" />
    </svg>
  );
}

function IconPhone({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        d="M6.8 4.9c.5-.9 1.7-1.2 2.6-.7l2.1 1.2c.8.5 1.1 1.5.8 2.4l-.9 3.1m-4 8.9c-.5.9-1.7 1.2-2.6.7l-2.1-1.2c-.9-.5-1.2-1.7-.7-2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 3l3 3" strokeLinecap="round" />
    </svg>
  );
}

function IconAlert({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3M12 19v3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M2 12h3M19 12h3M4.9 19.1l2.2-2.2M16.9 7.1l2.2-2.2" strokeLinecap="round" />
    </svg>
  );
}

type SectionId = "flow" | "monitor" | "team" | "system";

const sectionTitleKey: Record<SectionId, "secWorkflow" | "secMonitoring" | "secTeam" | "secSystem"> = {
  flow: "secWorkflow",
  monitor: "secMonitoring",
  team: "secTeam",
  system: "secSystem",
};

const sections: readonly { readonly id: SectionId; readonly items: readonly NavItem[] }[] =
  [
    {
      id: "flow",
      items: [
        { href: "/operator", label: "Dashboard", icon: IconGrid },
        { href: "/operator/orders/new", label: "Yangi buyurtma", icon: IconPlusOrder },
        { href: "/operator/dispatch", label: "Dispatch", icon: IconRadio },
        { href: "/operator/tracking", label: "Jonli xarita", icon: IconMap },
      ],
    },
    {
      id: "monitor",
      items: [
        { href: "/operator/orders", label: "Buyurtmalar", icon: IconClipboard },
        { href: "/operator/drivers", label: "Haydovchilar", icon: IconUsers },
      ],
    },
    {
      id: "team",
      items: [
        {
          href: "/operator/chat",
          label: "Haydovchi chat",
          title:
            "Operator ↔ haydovchi 1:1 xabarlar (messaging, haydovchi ilovasi bilan sinxron)",
          icon: IconPhone,
        },
        { href: "/operator/disputes", label: "Nizolar", icon: IconAlert },
      ],
    },
    {
      id: "system",
      items: [{ href: "/operator/settings", label: "Sozlamalar", icon: IconSettings }],
    },
  ];

const flatItems = sections.flatMap((s) => s.items);

/** Mijoz: `/operator/orders` va `/operator/orders/new` alohida; eng uzun (aniq) href g‘olib. */
function navMatchesPath(path: string, href: string): boolean {
  if (href === "/operator") return path === "/operator";
  return path === href || path.startsWith(`${href}/`);
}

function activeHrefForPath(
  path: string | null,
  nav: readonly { readonly href: string }[],
): string | null {
  if (path == null) return null;
  const matches = nav.filter((i) => navMatchesPath(path, i.href));
  if (matches.length === 0) return null;
  return matches.reduce((a, b) => (a.href.length >= b.href.length ? a : b)).href;
}

export function OperatorSidebar() {
  const path = usePathname();
  const activeHref = useMemo(() => activeHrefForPath(path, flatItems), [path]);
  const { t } = useSalomPreferences();
  const labelFor = (label: string) => {
    const m: Record<string, Parameters<typeof t>[0]> = {
      Dashboard: "dashboard",
      "Yangi buyurtma": "newOrder",
      Dispatch: "dispatch",
      "Jonli xarita": "liveMap",
      Buyurtmalar: "orders",
      Haydovchilar: "drivers",
      "Haydovchi chat": "driverChat",
      Nizolar: "disputes",
      Sozlamalar: "settings",
    };
    return m[label] ? t(m[label]) : label;
  };

  return (
    <aside
      className="flex w-full min-w-0 flex-col border-b border-emerald-900/80 bg-gradient-to-b from-emerald-950 via-emerald-950 to-[#050a07] text-white lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:border-emerald-900"
      aria-label="Operator bo‘limlari"
    >
      <div className="border-b border-white/10 px-4 py-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--salom-lime)]">
          Salom operator
        </p>
        <p className="mt-2 text-[13px] font-semibold leading-snug text-emerald-100/95">
          Dispatch boshqaruv markazi
        </p>
        <p className="mt-1 max-w-[16rem] text-[11px] leading-relaxed text-emerald-200/65">
          Buyurtmalar, xarita va jamoa bilan ishlash — bitta boshqaruv paneli.
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-4 overflow-x-auto px-2 py-4 [-ms-overflow-style:none] [scrollbar-width:none] lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {sections.map((sec) => (
          <div key={sec.id} className="space-y-1">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400/85">
              {t(sectionTitleKey[sec.id])}
            </p>
            <div className="flex flex-col gap-1">
              {sec.items.map((item) => {
                const { href, label, icon: Icon } = item;
                const title = "title" in item ? item.title : undefined;
                const on = activeHref === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    title={title}
                    className={[
                      "flex w-full shrink-0 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-colors lg:min-w-0",
                      on
                        ? "bg-[var(--salom-lime)] text-emerald-950 shadow-lg shadow-black/25 ring-1 ring-white/20"
                        : "text-emerald-50/92 hover:bg-white/10 hover:text-[var(--salom-lime)]",
                    ].join(" ")}
                  >
                    <Icon
                      className={[
                        "h-4 w-4 shrink-0",
                        on ? "text-emerald-900" : "text-emerald-200/80",
                      ].join(" ")}
                    />
                    <span className="truncate">{labelFor(label)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto hidden border-t border-white/10 px-4 py-3 lg:block">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-emerald-200/80">
          N
        </div>
      </div>
    </aside>
  );
}
