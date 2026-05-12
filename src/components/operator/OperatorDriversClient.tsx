"use client";

import { OperatorAuthCard } from "@/components/operator/OperatorAuthCard";
import { ServiceZoneSelect } from "@/components/operator/ServiceZoneSelect";
import { toErrorMessage } from "@/lib/toErrorMessage";
import {
  BEARER_KEY,
  DEFAULT_SERVICE_ZONE_ID,
  SALOM_API_URL,
  buildOperatorHeaders,
  effectiveOperatorIdFromStorage,
  getStoredServiceZoneId,
  operatorNetworkErrorHint,
} from "@/lib/salomOperator";
import { fetchPublicServiceZones, publicZoneLabel } from "@/lib/salomServiceZones";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type RosterItem = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  userStatus: string;
  operationalStatus: string;
  onboardingStatus: string;
  lastKnown: {
    lat: number;
    lng: number;
    recordedAt: string;
    accuracyM?: number;
    speedKmh?: number;
  } | null;
};

function nameOf(d: RosterItem) {
  const n = [d.firstName, d.lastName].filter(Boolean).join(" ");
  return n || d.phone;
}

function opLabel(s: string) {
  const m: Record<string, string> = {
    OFFLINE: "Oflayn",
    ONLINE_IDLE: "Onlayn · bo‘sh",
    ON_TRIP: "Safarda",
    PAUSED: "Pauza",
  };
  return m[s] ?? s;
}

function onboardLabel(s: string) {
  const m: Record<string, string> = {
    DRAFT: "Qoralama",
    SUBMITTED: "Yuborilgan",
    UNDER_REVIEW: "Ko‘rib chiqilmoqda",
    APPROVED: "Tasdiqlangan",
    REJECTED: "Rad",
  };
  return m[s] ?? s;
}

export function OperatorDriversClient() {
  const [bearer, setBearer] = useState("");
  const [zoneId, setZoneId] = useState(DEFAULT_SERVICE_ZONE_ID);
  const [zoneName, setZoneName] = useState<string | null>(null);
  const [rows, setRows] = useState<RosterItem[]>([]);
  const [serviceZoneId, setSvcZone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bearerRef = useRef(bearer);
  bearerRef.current = bearer;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBearer((p) => p || (localStorage.getItem(BEARER_KEY) ?? ""));
    const z = getStoredServiceZoneId();
    if (z) setZoneId(z);
  }, []);

  useEffect(() => {
    void fetchPublicServiceZones()
      .then((zones) => setZoneName(publicZoneLabel(zones, zoneId)))
      .catch(() => setZoneName(null));
  }, [zoneId]);

  const h = useCallback(
    (b: string) => buildOperatorHeaders(b, effectiveOperatorIdFromStorage()),
    [],
  );

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    const b = bearerRef.current.trim();
    if (!b) {
      setLoading(false);
      return;
    }
    try {
      const q = `?serviceZoneId=${encodeURIComponent(zoneId.trim() || DEFAULT_SERVICE_ZONE_ID)}`;
      const r = await fetch(`${SALOM_API_URL}/api/v1/operator/drivers${q}`, { headers: h(b) });
      if (!r.ok) {
        setErr((await r.text()) || `HTTP ${r.status}`);
        setRows([]);
        return;
      }
      const j = (await r.json()) as { serviceZoneId: string; items: RosterItem[] };
      setSvcZone(j.serviceZoneId);
      setRows(j.items ?? []);
    } catch (e) {
      if (e instanceof TypeError) setErr(operatorNetworkErrorHint());
      else setErr(toErrorMessage(e, "Tarmoq"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [zoneId, h]);

  useEffect(() => {
    if (!bearer.trim()) return;
    void load();
  }, [bearer, load]);

  if (!bearer.trim()) {
    return (
      <OperatorAuthCard
        onAfterExchange={(t) => setBearer(t)}
        title="Haydovchilar ro‘yxati"
        description="Zonadagi haydovchilarni ko‘rish uchun operator JWT kerak (dispatch kabi)."
      />
    );
  }

  return (
    <div className="space-y-4">
      {err && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <ServiceZoneSelect id="op-drivers-zone" value={zoneId} onChange={setZoneId} className="min-w-0 flex-1" />
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? "Yuklanmoqda…" : "Yangilash"}
        </button>
      </div>

      <p className="text-xs text-slate-500">
        {serviceZoneId != null ? (
            <>
              <span className="font-medium text-slate-700">{zoneName ?? "Tanlangan shahar"}</span> — {rows.length}{" "}
              haydovchi
            </>
        ) : null}
      </p>

      <div className="overflow-x-auto rounded-xl border border-amber-200/50 bg-white shadow-sm">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-amber-100 bg-amber-50/50 text-[10px] font-semibold uppercase tracking-wider text-amber-900/80">
              <th className="px-3 py-2">Haydovchi</th>
              <th className="px-3 py-2">Telefon</th>
              <th className="px-3 py-2">Ish holati</th>
              <th className="px-3 py-2">Ariza</th>
              <th className="px-3 py-2">So‘nggi GPS</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  Bu zonada haydovchi yo‘q yoki hali yuklanmadi.
                </td>
              </tr>
            )}
            {rows.map((d) => {
              const gps = d.lastKnown
                ? (() => {
                    try {
                      return new Date(d.lastKnown!.recordedAt).toLocaleString("uz-UZ", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    } catch {
                      return d.lastKnown!.recordedAt.slice(0, 16);
                    }
                  })()
                : "—";
              return (
                <tr key={d.id} className="border-b border-amber-50/80 hover:bg-amber-50/30">
                  <td className="px-3 py-2 font-medium text-slate-900">{nameOf(d)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">{d.phone}</td>
                  <td className="px-3 py-2 text-slate-700">{opLabel(d.operationalStatus)}</td>
                  <td className="px-3 py-2 text-slate-600">{onboardLabel(d.onboardingStatus)}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{gps}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link
                      href={`/operator/drivers/${encodeURIComponent(d.id)}?serviceZoneId=${encodeURIComponent(zoneId.trim() || DEFAULT_SERVICE_ZONE_ID)}`}
                      className="font-semibold text-amber-900 underline"
                    >
                      Profil
                    </Link>
                    <span className="text-slate-300"> · </span>
                    <Link
                      href={`/operator/chat?driver=${encodeURIComponent(d.id)}`}
                      className="text-amber-800 underline font-medium"
                    >
                      Aloqa
                    </Link>
                    <span className="text-slate-300"> · </span>
                    <Link className="text-violet-800 underline" href="/operator/tracking">
                      Xarita
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Tasdiqlash / rad uchun kutilayotgan arizalar:{" "}
        <Link className="font-medium text-amber-800 underline" href="/operator/onboarding">
          Ariza tasdiqlash (faqat koʻrish — harakat Administrator uchun)
        </Link>
        . Barcha haydovchilarni toʻliq qoʻllab tuzatish — faqat Administrator.
      </p>
    </div>
  );
}
