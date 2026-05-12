"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OperatorBearerStrip } from "@/components/operator/OperatorBearerStrip";
import { OperatorSidebar } from "@/components/operator/OperatorSidebar";
import { PreferenceControls, useSalomPreferences } from "@/lib/salomPreferences";

import { OperatorAppGate } from "@/components/operator/OperatorAppGate";
import { OperatorAuthBootstrap } from "@/components/operator/OperatorAuthBootstrap";
import { SALOM_OPERATOR_AUTH_CHANGED } from "@/lib/salomOperator";

function BrandCarIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.5 6.2A2.7 2.7 0 0 0 15.2 5H8.8a2.7 2.7 0 0 0-2.4 1.3L4.6 10H3.5c-.7 0-1.4.6-1.5 1.3L2 12.3V18c0 .8.6 1.4 1.4 1.4h1.2a1.7 1.7 0 0 0 3.3 0h9a1.7 1.7 0 0 0 3.3 0H21c.8 0 1.4-.6 1.4-1.4v-4.2c0-.6-.3-1-.8-1.2L19.8 8.3l-2.3-2.1ZM7.3 9.5 8.9 7.2a.8.8 0 0 1 .6-.3h5a.8.8 0 0 1 .7.4l1.3 2.2H7.3Zm-1.9 6.2a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm12.2 0a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Z" />
    </svg>
  );
}

/**
 * Operator marshruti uchun yagona client chegara: server layout faqat shu modulni import qiladi
 * (Webpack / HMR da `__webpack_modules__[moduleId] is not a function` oldini olish).
 */
export function OperatorChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const liveMapFullBleed = pathname === "/operator/tracking";
  const onDispatch = pathname.startsWith("/operator/dispatch");
  const { t } = useSalomPreferences();
  const [authEpoch, setAuthEpoch] = useState(0);

  useEffect(() => {
    const onAuth = () => setAuthEpoch((e) => e + 1);
    window.addEventListener(SALOM_OPERATOR_AUTH_CHANGED, onAuth);
    return () => window.removeEventListener(SALOM_OPERATOR_AUTH_CHANGED, onAuth);
  }, []);

  return (
    <OperatorAppGate>
    <div className="flex min-h-screen flex-col bg-[var(--background)] lg:flex-row">
      <OperatorAuthBootstrap />
      <div className="shrink-0">
        <OperatorSidebar />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-emerald-200/65 bg-white/90 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
            <Link
              href="/operator"
              className="group flex min-w-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--salom-lime)]/70"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--salom-lime)] text-emerald-950 shadow-md ring-1 ring-emerald-900/15"
                aria-hidden
              >
                <BrandCarIcon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-semibold text-slate-900 salom-chrome-title">Salom Taxi</span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 salom-chrome-sub">
                  {t("operatorWorkflow")}
                </span>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden xl:block">
                <PreferenceControls compact />
              </div>
              <Link
                href="/operator/dispatch"
                aria-current={onDispatch ? "page" : undefined}
                className={[
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ring-2",
                  onDispatch
                    ? "bg-[var(--salom-lime)] text-emerald-950 ring-emerald-800/40"
                    : "border-2 border-transparent bg-emerald-50/90 text-emerald-900 ring-[var(--salom-lime)] hover:bg-emerald-100/95 salom-dispatch-btn",
                ].join(" ")}
              >
                {t("liveDispatch")}
              </Link>
              <Link
                href="/"
                className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 salom-home-btn"
              >
                {t("home")}
              </Link>
            </div>
          </div>
        </header>
        <OperatorBearerStrip />
        <main
          key={authEpoch}
          className={
            liveMapFullBleed
              ? "mx-auto w-full min-h-0 min-w-0 max-w-none flex-1 overflow-y-auto py-0"
              : "mx-auto w-full min-h-0 min-w-0 max-w-7xl flex-1 overflow-y-auto px-3 py-5 sm:px-5 sm:py-7"
          }
        >
          {children}
        </main>
      </div>
    </div>
    </OperatorAppGate>
  );
}
