"use client";

import { toErrorMessage } from "@/lib/toErrorMessage";
import { ServiceZoneSelect } from "@/components/operator/ServiceZoneSelect";
import {
  BEARER_KEY,
  DEFAULT_SERVICE_ZONE_ID,
  SALOM_API_URL,
  buildOperatorHeaders,
  effectiveOperatorIdFromStorage,
  getStoredServiceZoneId,
  operatorNetworkErrorHint,
} from "@/lib/salomOperator";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type OrderRow = {
  id: string;
  status: string;
  customerPhone: string;
  pickupLandmark: string;
  createdAt: string;
  trip?: { id: string; status: string } | null;
};

function fmt(v: string | number): string {
  if (typeof v === "number" && Number.isFinite(v)) return v.toLocaleString("en-US");
  return String(v);
}

function kpiTile(
  label: string,
  value: string | number,
  surfaceClass: string,
  tones?: { label?: string; value?: string },
): ReactNode {
  return (
    <div
      className={[
        "flex min-h-[88px] flex-col justify-center rounded-xl border px-4 py-3 shadow-sm transition-shadow hover:shadow-md",
        surfaceClass,
      ].join(" ")}
    >
      <p
        className={[
          "text-[10px] font-semibold uppercase tracking-wider",
          tones?.label ?? "text-slate-600",
        ].join(" ")}
      >
        {label}
      </p>
      <p
        className={[
          "mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight",
          tones?.value ?? "text-slate-900",
        ].join(" ")}
      >
        {fmt(value)}
      </p>
    </div>
  );
}

function ZigzagIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 17l4-14 4 8 6-14 4 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function isTerminal(s: string) {
  return s === "COMPLETED" || s === "EXPIRED" || s.startsWith("CANCELLED");
}

export function OperatorDashboardClient() {
  const [zoneId, setZoneId] = useState(DEFAULT_SERVICE_ZONE_ID);
  const [bearer, setBearer] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const bearerRef = useRef(bearer);
  bearerRef.current = bearer;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBearer((p) => p || (localStorage.getItem(BEARER_KEY) ?? ""));
    const z = getStoredServiceZoneId();
    if (z) setZoneId(z);
  }, []);

  const headersFor = useCallback(
    (b: string) => buildOperatorHeaders(b, effectiveOperatorIdFromStorage()),
    [],
  );

  const load = useCallback(
    async (bearerForRequest?: string) => {
      setErr(null);
      const b = bearerForRequest ?? bearerRef.current;
      if (!b.trim()) {
        setOrders([]);
        setOnlineDrivers(null);
        return;
      }
      try {
        const h = headersFor(b);
        const [or, sn] = await Promise.all([
          fetch(
            `${SALOM_API_URL}/api/v1/operator/orders?serviceZoneId=${encodeURIComponent(zoneId)}`,
            { headers: h },
          ),
          fetch(`${SALOM_API_URL}/api/v1/tracking/snapshots/${encodeURIComponent(zoneId)}`),
        ]);
        if (or.ok) {
          setOrders((await or.json()) as OrderRow[]);
        } else {
          setErr(await or.text());
        }
        if (sn.ok) {
          const j = (await sn.json()) as { drivers?: { driverId: string }[] };
          setOnlineDrivers(j.drivers?.length ?? 0);
        } else {
          setOnlineDrivers(null);
        }
      } catch (e) {
        if (e instanceof TypeError) setErr(operatorNetworkErrorHint());
        else setErr(toErrorMessage(e, "xato"));
      }
    },
    [zoneId, headersFor],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let active = 0;
  let waiting = 0;
  let completedToday = 0;
  let cancelled = 0;

  for (const o of orders) {
    if (!isTerminal(o.status)) active += 1;
    if (o.status === "CREATED" || o.status === "BROADCASTED") waiting += 1;
    if (o.status === "COMPLETED" && new Date(o.createdAt).getTime() >= startOfDay) completedToday += 1;
    if (o.status.startsWith("CANCELLED") || o.status === "EXPIRED") cancelled += 1;
  }

  return (
    <div className="space-y-8 text-sm">
      {err && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"
        >
          {err}
        </div>
      )}

      {!bearer.trim() && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Operator sessiyasi topilmadi. Hisobingiz admin tomonidan yaratilgan va faol bo‘lishi kerak; qayta kirish uchun
          administrator bilan bog‘laning.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch">
        <div className="grid gap-3 sm:grid-cols-3 lg:col-span-8">
          <Link
            href="/operator/orders/new"
            className="group relative flex min-h-[140px] flex-col overflow-hidden rounded-2xl border border-emerald-900/30 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 px-5 py-4 shadow-lg shadow-emerald-950/40 ring-1 ring-black/40 transition hover:ring-[var(--salom-lime)]/50"
          >
            <div className="pointer-events-none absolute -right-2 -top-2 h-24 w-24 rounded-full bg-[var(--salom-lime)]/15 blur-2xl" />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/80">Buyurtma</p>
                <p className="mt-3 text-[15px] font-semibold leading-snug text-white">
                  Yangi buyurtma yaratish va tarqatish
                </p>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black/35 text-[var(--salom-lime)] shadow-inner ring-1 ring-white/10">
                <ZigzagIcon className="h-7 w-7" />
              </span>
            </div>
            <span className="mt-auto inline-flex items-center gap-2 pt-6 text-[11px] font-semibold text-[var(--salom-lime)]">
              Ochilish
              <span className="inline-block translate-x-0 transition group-hover:translate-x-1" aria-hidden>
                →
              </span>
            </span>
          </Link>

          <Link
            href="/operator/dispatch"
            className="flex min-h-[140px] flex-col rounded-2xl border border-emerald-200/90 bg-white/95 px-5 py-4 shadow-md shadow-slate-200/40 transition hover:border-[var(--salom-lime)]/60 hover:shadow-lg"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Dispatch</p>
            <p className="mt-3 text-[15px] font-semibold leading-snug text-slate-900">
              Navbatchilik va haydovchi taklifi
            </p>
            <span className="mt-auto pt-6 text-[11px] font-semibold text-emerald-800">Tanlash →</span>
          </Link>

          <Link
            href="/operator/tracking"
            className="flex min-h-[140px] flex-col rounded-2xl border border-emerald-200/90 bg-white/95 px-5 py-4 shadow-md shadow-slate-200/40 transition hover:border-[var(--salom-lime)]/60 hover:shadow-lg"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Jonli xarita</p>
            <p className="mt-3 text-[15px] font-semibold leading-snug text-slate-900">GPS haydovchilar xaritada</p>
            <span className="mt-auto pt-6 text-[11px] font-semibold text-emerald-800">Tanlash →</span>
          </Link>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 to-white px-4 py-4 shadow-inner lg:col-span-4">
          <ServiceZoneSelect
            id="dash-zone"
            className="min-w-0 flex-1"
            value={zoneId}
            onChange={setZoneId}
            label="Boshqarilayotgan shahar (xizmat zonasi)"
          />
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--salom-lime)] px-4 text-sm font-bold text-emerald-950 shadow-md shadow-lime-900/25 ring-1 ring-black/10 transition hover:brightness-[1.03]"
            onClick={() => void load()}
          >
            Ma&apos;lumotni yangilash
          </button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Bugungi ko‘rsatkichlar</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {kpiTile("Onlayn haydovchilar", onlineDrivers ?? "—", "border-emerald-100 bg-emerald-50/95")}
          {kpiTile("Aktiv buyurtmalar", active, "border-amber-100 bg-amber-50/90")}
          {kpiTile("Kutilayotgan", waiting, "border-slate-700 bg-slate-900", {
            label: "text-emerald-200/85",
            value: "text-[var(--salom-lime)]",
          })}
          {kpiTile("Tugallangan (bugun)", completedToday, "border-slate-200 bg-slate-50/95")}
          {kpiTile("Bekor / Timeout", cancelled, "border-rose-100 bg-rose-50/95")}
          {kpiTile("No-show", "—", "border-emerald-100/80 bg-white")}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {kpiTile("Nizo / keyingi API", "—", "border-emerald-100/80 bg-slate-50/80")}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/operator/orders/new"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[var(--salom-lime)] px-5 text-sm font-bold text-emerald-950 shadow-md shadow-lime-900/25 ring-1 ring-emerald-950/15 transition hover:brightness-[1.03] sm:flex-none sm:min-w-[12rem]"
        >
          Tezkor buyurtma
        </Link>
        <Link
          href="/operator/dispatch"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border-2 border-emerald-900/35 bg-white px-5 text-sm font-semibold text-emerald-900 shadow-sm hover:border-emerald-800 hover:bg-emerald-50 sm:flex-none sm:min-w-[10rem]"
        >
          Dispatch
        </Link>
        <Link
          href="/operator/chat"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-5 text-sm font-semibold text-emerald-950 hover:border-emerald-300 sm:flex-none sm:min-w-[10rem]"
        >
          Haydovchi chat
        </Link>
      </div>

    </div>
  );
}
