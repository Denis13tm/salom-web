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

type Item = {
  id: string;
  phone: string;
  onboardingStatus: string;
  submittedAt: string | null;
  zone: { name: string; slug: string } | null;
  primaryVehicle: { plate: string; makeModel: string } | null;
};

function statusUz(s: string) {
  const m: Record<string, string> = {
    SUBMITTED: "Yuborilgan",
    UNDER_REVIEW: "Ko'rib chiqilmoqda",
  };
  return m[s] ?? s;
}

export function OperatorOnboardingListClient() {
  const [bearer, setBearer] = useState("");
  const [zoneId, setZoneId] = useState(DEFAULT_SERVICE_ZONE_ID);
  const [items, setItems] = useState<Item[]>([]);
  const [zoneName, setZoneName] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [resolvedZone, setResolvedZone] = useState<string | null>(null);
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
      const r = await fetch(`${SALOM_API_URL}/api/v1/operator/drivers/onboarding/pending${q}`, { headers: h(b) });
      if (!r.ok) {
        setErr((await r.text()) || `HTTP ${r.status}`);
        setItems([]);
        return;
      }
      const j = (await r.json()) as { total: number; serviceZoneId: string; items: Item[] };
      setTotal(j.total);
      setResolvedZone(j.serviceZoneId);
      setItems(j.items ?? []);
    } catch (e) {
      if (e instanceof TypeError) setErr(operatorNetworkErrorHint());
      else setErr(toErrorMessage(e, "Tarmoq"));
      setItems([]);
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
        title="Haydovchi arizalari"
        description="O‘z zonangizdagi arizalarni ko‘rish (read-only). Tasdiq va rad — Admin panel."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-300/80 bg-amber-50/60 px-3 py-3 text-sm text-amber-950">
        <p className="font-semibold">Operator = operatsiya · Admin = tasdiq + moliya</p>
        <p className="mt-1 text-xs text-amber-950/90">
          Bu ro‘yxat call center uchun: kutilayotganlarni kuzatish. Tasdiqlash va rad qilish uchun administrator bilan ishlang —
          operator interfeysida admin panelga havola berilmagan.
        </p>
      </div>
      {err && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <ServiceZoneSelect id="onb-zone" value={zoneId} onChange={setZoneId} className="min-w-0 flex-1" />
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
        {resolvedZone != null ? (
          <>
            <span className="font-medium text-slate-700">{zoneName ?? "Tanlangan shahar"}</span> — kutilayotgan:{" "}
            {total} ariza
          </>
        ) : null}
      </p>

      <div className="overflow-x-auto rounded-xl border border-amber-200/50 bg-white shadow-sm">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-amber-100 bg-amber-50/50 text-[10px] font-semibold uppercase tracking-wider text-amber-900/80">
              <th className="px-3 py-2">Telefon</th>
              <th className="px-3 py-2">Holat</th>
              <th className="px-3 py-2">Zona</th>
              <th className="px-3 py-2">Transport</th>
              <th className="px-3 py-2">Yuborilgan</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  Bu zonada tasdiq kutilayotgan ariza yo'q.
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.id} className="border-b border-amber-50/80 hover:bg-amber-50/30">
                <td className="px-3 py-2 font-mono text-xs text-slate-800">{row.phone}</td>
                <td className="px-3 py-2 text-slate-700">{statusUz(row.onboardingStatus)}</td>
                <td className="px-3 py-2 text-slate-600">{row.zone?.name ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {row.primaryVehicle ? `${row.primaryVehicle.plate} · ${row.primaryVehicle.makeModel}` : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {row.submittedAt
                    ? (() => {
                        try {
                          return new Date(row.submittedAt).toLocaleString("uz-UZ");
                        } catch {
                          return row.submittedAt.slice(0, 16);
                        }
                      })()
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/operator/onboarding/${encodeURIComponent(row.id)}?zone=${encodeURIComponent(zoneId.trim() || DEFAULT_SERVICE_ZONE_ID)}`}
                    className="font-medium text-amber-800 underline"
                  >
                    Ko'rish
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Aktivatsiya kodi va tasdiq SMS — faqat Admin tasdig‘idan keyin. Barcha zonalar bo‘yicha ro‘yxat: Admin →
        Haydovchilar / Arizalar.
      </p>
    </div>
  );
}
