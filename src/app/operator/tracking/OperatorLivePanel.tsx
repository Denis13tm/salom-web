"use client";

import { ServiceZoneSelect } from "@/components/operator/ServiceZoneSelect";
import {
  BEARER_KEY,
  DEFAULT_SERVICE_ZONE_ID,
  buildOperatorHeaders,
  effectiveOperatorIdFromStorage,
  getStoredServiceZoneId,
} from "@/lib/salomOperator";
import dynamic from "next/dynamic";
import { toErrorMessage } from "@/lib/toErrorMessage";
import {
  fetchPublicServiceZones,
  mapFocusForServiceZone,
  type PublicServiceZone,
} from "@/lib/salomServiceZones";
import { useCallback, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";

const OperatorMap = dynamic(
  () => import("./OperatorMap").then((m) => m.OperatorMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(66dvh,640px)] min-h-[340px] max-h-[min(76dvh,760px)] w-full items-center justify-center bg-slate-100/80 sm:h-[min(68dvh,680px)]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-amber-500"
            aria-hidden
          />
          <span className="text-sm font-medium">Xarita yuklanmoqda…</span>
        </div>
      </div>
    ),
  },
);

/** Admin dashboard bilan bir xil — “onlayn” hisob */
const OPERATIONAL_ONLINE = new Set([
  "ONLINE_IDLE",
  "ORDER_OFFERED",
  "EN_ROUTE_PICKUP",
  "ARRIVED_PICKUP",
  "IN_TRIP",
]);

type DriverLoc = {
  driverId: string;
  serviceZoneId: string | null;
  lat: number;
  lng: number;
  recordedAt: string;
  accuracyM?: number;
  speedKmh?: number;
};

type RosterItem = {
  id: string;
  operationalStatus: string;
  lastKnown: {
    lat: number;
    lng: number;
    recordedAt: string;
    accuracyM?: number;
    speedKmh?: number;
  } | null;
};

function getApiBase() {
  return process.env.NEXT_PUBLIC_SALOM_API_URL ?? "http://localhost:3000";
}

function rosterToRows(
  items: RosterItem[],
  zoneId: string,
): Record<string, DriverLoc> {
  const next: Record<string, DriverLoc> = {};
  for (const it of items) {
    const lk = it.lastKnown;
    if (!lk) continue;
    next[it.id] = {
      driverId: it.id,
      serviceZoneId: zoneId.trim() || null,
      lat: lk.lat,
      lng: lk.lng,
      recordedAt: lk.recordedAt,
      accuracyM: lk.accuracyM,
      speedKmh: lk.speedKmh,
    };
  }
  return next;
}

function countSystemOnline(items: RosterItem[]): number {
  return items.filter((it) => OPERATIONAL_ONLINE.has(it.operationalStatus))
    .length;
}

export function OperatorLivePanel() {
  const [zoneId, setZoneId] = useState(DEFAULT_SERVICE_ZONE_ID);
  const [zonesForMap, setZonesForMap] = useState<PublicServiceZone[]>([]);
  const [rows, setRows] = useState<Record<string, DriverLoc>>({});
  const [systemOnline, setSystemOnline] = useState<number | null>(null);
  const [driversInZone, setDriversInZone] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("Ulanmoqda…");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const z = getStoredServiceZoneId();
    if (z) setZoneId(z);
  }, []);

  useEffect(() => {
    void fetchPublicServiceZones().then(setZonesForMap);
  }, []);

  const mapFocus = useMemo(
    () => mapFocusForServiceZone(zonesForMap, zoneId),
    [zonesForMap, zoneId],
  );

  const applyPayload = useCallback((p: DriverLoc) => {
    setRows((m) => ({ ...m, [p.driverId]: p }));
  }, []);

  useEffect(() => {
    const base = getApiBase();
    let socket: Socket | null = null;
    setErr(null);
    setStatus("Yuklanmoqda…");

    void (async () => {
      const bearer =
        typeof window !== "undefined"
          ? localStorage.getItem(BEARER_KEY)?.trim()
          : undefined;
      if (!bearer) {
        setErr(
          "Jonli xarita uchun operator JWT kerak: Sozlamalar sahifasida kirish kodini saqlang.",
        );
        setStatus("Kirish kerak");
        setSystemOnline(null);
        setDriversInZone(null);
        setRows({});
        return;
      }

      const q = `?serviceZoneId=${encodeURIComponent(zoneId.trim() || DEFAULT_SERVICE_ZONE_ID)}`;
      try {
        const r = await fetch(`${base}/api/v1/operator/drivers${q}`, {
          headers: buildOperatorHeaders(bearer, effectiveOperatorIdFromStorage()),
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || r.statusText);
        }
        const j = (await r.json()) as { items?: RosterItem[] };
        const items = j.items ?? [];
        setDriversInZone(items.length);
        setSystemOnline(countSystemOnline(items));
        setRows(rosterToRows(items, zoneId.trim() || DEFAULT_SERVICE_ZONE_ID));
        setStatus("WebSocket…");
      } catch (e) {
        setErr(toErrorMessage(e, "Haydovchilar ro‘yxati yuklanmadi"));
        setStatus("Xato");
        setSystemOnline(null);
        setDriversInZone(null);
        return;
      }

      const extraHeaders = { Authorization: `Bearer ${bearer}` };
      socket = io(`${base}/operator`, {
        path: "/socket.io/",
        transports: ["websocket"],
        withCredentials: true,
        extraHeaders,
        auth: { token: bearer },
      });
      socket.on("connect", () => {
        setStatus("Jonli");
        socket?.emit(
          "join",
          {
            scope: "zone",
            serviceZoneId: zoneId.trim() || DEFAULT_SERVICE_ZONE_ID,
          },
          (resp: unknown) => {
            const r = resp as { ok?: boolean; error?: string } | undefined;
            if (r?.ok === false && r.error === "zone_mismatch") {
              setErr(
                "Operator profilingiz boshqa xizmat zonasiga biriktirilgan — jonli GPS xonasiga kira olmadingiz. Admin yoki Sozlamalar orqali zonani moslang yoki xaritada o‘z zonangizni tanlang.",
              );
            }
          },
        );
      });
      socket.on("connect_error", (c: unknown) => {
        setErr(
          toErrorMessage(
            c,
            "WebSocket ulanmadi. API `npm run dev:api` (port 3000) va CORS .env da veb manzilingiz bo‘lsin.",
          ),
        );
        setStatus("WS xatosi");
      });
      socket.on("driver:location", (payload: DriverLoc) => {
        const sel = zoneId.trim() || DEFAULT_SERVICE_ZONE_ID;
        if (
          payload.serviceZoneId != null &&
          payload.serviceZoneId !== sel
        ) {
          return;
        }
        applyPayload(payload);
      });
    })();

    return () => {
      socket?.disconnect();
    };
  }, [applyPayload, zoneId]);

  const live = status === "Jonli";
  const list = Object.values(rows);
  const nGps = list.length;
  const sys = systemOnline;

  return (
    <div className="w-full">
      {err && (
        <div
          role="alert"
          className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 sm:px-6"
        >
          {err}
        </div>
      )}

      <div className="w-full px-3 pb-4 pt-1 sm:px-5 sm:pb-6">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-200/40 shadow-md dark:border-slate-600/60 dark:bg-slate-800/40">
          <div className="absolute left-4 right-4 top-4 z-10 flex max-w-sm flex-col gap-2 sm:left-5 sm:right-auto">
            <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-lg shadow-slate-900/5 backdrop-blur-sm dark:border-slate-600/50 dark:bg-slate-900/90">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Hudud
              </p>
              <p className="mb-2 text-[11px] font-medium leading-snug text-slate-600 dark:text-slate-400">
                Qaysi shahar (xizmat zonasi)?
              </p>
              <ServiceZoneSelect
                id="live-map-zone"
                value={zoneId}
                onChange={setZoneId}
              />
            </div>
            <div className="inline-flex w-fit max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-emerald-200/80 bg-white/95 px-3.5 py-2.5 shadow-md backdrop-blur-sm dark:border-emerald-800/50 dark:bg-slate-900/90">
              <span
                className={[
                  "h-2 w-2 shrink-0 rounded-full",
                  live ? "bg-emerald-500 shadow-sm" : "bg-amber-500",
                  live && "animate-pulse",
                ].join(" ")}
                aria-hidden
              />
              <span className="text-[10px] font-medium uppercase text-slate-500">
                Jonli
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {status}
              </span>
              <span className="hidden h-3 w-px bg-slate-200 sm:block" />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Tizim:{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {sys ?? "—"}
                </span>{" "}
                onlayn
              </span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-600 dark:text-slate-300">
                GPS:{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {nGps}
                </span>
                {" / hudud hayd."}{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {driversInZone ?? "—"}
                </span>
              </span>
            </div>
          </div>

          <OperatorMap
            focus={mapFocus}
            rows={list.map((d) => ({
              driverId: d.driverId,
              lat: d.lat,
              lng: d.lng,
            }))}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/90 px-3 py-2.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400 sm:px-4">
          <div className="flex items-center gap-2">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-4 w-4 text-[var(--salom-dark-green)] dark:text-[var(--salom-lime)]"
              fill="currentColor"
            >
              <path d="M6.2 7.4A3 3 0 0 1 9 5.5h6a3 3 0 0 1 2.8 1.9L19 10.5h.5a1.5 1.5 0 0 1 1.5 1.5v4.5a1 1 0 0 1-1 1h-1.2a2.25 2.25 0 0 1-4.35 0h-4.9a2.25 2.25 0 0 1-4.35 0H4a1 1 0 0 1-1-1V12a1.5 1.5 0 0 1 1.5-1.5H5l1.2-3.1Zm1.4 3.1h8.8l-.9-2.4a1.5 1.5 0 0 0-1.4-.9H9.9a1.5 1.5 0 0 0-1.4.9l-.9 2.4ZM7.3 18a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm9.4 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
            </svg>
            <span>Marker = so‘nggi GPS (mobil ilova yuborgan)</span>
          </div>
          <span className="text-right">
            Tizim soni — DB; GPS — safar/onlayn paytida ping
          </span>
        </div>
      </div>
    </div>
  );
}
