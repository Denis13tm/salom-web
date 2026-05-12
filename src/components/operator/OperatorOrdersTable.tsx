"use client";

import { Button } from "@/components/salom/Button";
import { ServiceZoneSelect } from "@/components/operator/ServiceZoneSelect";
import { phoneToTelHref } from "@/lib/phoneCall";
import { toErrorMessage } from "@/lib/toErrorMessage";
import {
  BEARER_KEY,
  DEFAULT_SERVICE_ZONE_ID,
  SALOM_API_URL,
  buildOperatorHeaders,
  defaultOperatorId,
  getStoredServiceZoneId,
  operatorNetworkErrorHint,
  setStoredServiceZoneId,
} from "@/lib/salomOperator";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  status: string;
  customerPhone: string;
  pickupLandmark: string;
  pickupPricingZoneName?: string | null;
  starterFeeUzs?: string | number | null;
  distanceRateUzs?: string | number | null;
  freeWaitMinutes?: number | null;
  waitingFeePerMinuteUzs?: string | number | null;
  pricingOverridden?: boolean;
  pricingOverrideReason?: string | null;
  trip?: {
    status: string;
    distanceMeters?: string | number | null;
    distanceFeeUzs?: string | number | null;
    waitingFeeUzs?: string | number | null;
    paidWaitMinutes?: number | null;
    finalFareUzs?: string | number | null;
    commissionUzs?: string | number | null;
    netUzs?: string | number | null;
  } | null;
  createdAt: string;
};

function money(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? `${Math.round(n).toLocaleString("uz-UZ")} so‘m` : String(v);
}

export function OperatorOrdersTable() {
  const [bearer, setBearer] = useState("");
  const [opId] = useState(defaultOperatorId);
  const [all, setAll] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [zoneId, setZoneId] = useState(DEFAULT_SERVICE_ZONE_ID);
  const [openId, setOpenId] = useState<string | null>(null);

  const headers = useCallback(() => buildOperatorHeaders(bearer, opId), [bearer, opId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBearer((p) => p || (localStorage.getItem(BEARER_KEY) ?? ""));
    const z = getStoredServiceZoneId();
    if (z) setZoneId(z);
  }, []);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const r = await fetch(
        `${SALOM_API_URL}/api/v1/operator/orders?serviceZoneId=${encodeURIComponent(zoneId || DEFAULT_SERVICE_ZONE_ID)}`,
        { headers: headers() },
      );
      if (!r.ok) throw new Error(await r.text());
      setAll((await r.json()) as Row[]);
    } catch (e) {
      if (e instanceof TypeError) setErr(operatorNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    }
  }, [headers, zoneId]);

  useEffect(() => {
    if (!bearer.trim()) return;
    void load();
  }, [load, bearer]);

  const rows = useMemo(() => {
    const f = q.trim();
    if (!f) return all;
    return all.filter(
      (o) =>
        o.customerPhone.includes(f) ||
        o.pickupLandmark.toLowerCase().includes(f.toLowerCase()) ||
        o.id.toLowerCase().includes(f.toLowerCase()),
    );
  }, [all, q]);

  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs text-slate-500">So'nggi 30 buyurtma: pricing, dispatch va fare breakdown bilan.</p>
      <div className="grid gap-2 sm:grid-cols-[minmax(14rem,1fr)_minmax(12rem,1fr)_auto]">
        <ServiceZoneSelect
          value={zoneId}
          onChange={(v) => {
            setZoneId(v);
            setStoredServiceZoneId(v);
          }}
          label="Shahar"
        />
        <input
          className="self-end rounded border border-emerald-200 px-2 py-2.5 text-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-lime-200"
          placeholder="Filtr: telefon, mo‘ljal, order id"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="button" variant="secondary" className="self-end !text-xs" onClick={() => void load()}>
          Qo‘llash
        </Button>
      </div>
      {err && <p className="text-xs text-rose-800">{err}</p>}
      <div className="overflow-x-auto rounded-xl border border-emerald-200/80">
        <table className="w-full min-w-[600px] text-left text-xs">
          <thead className="border-b border-emerald-200 bg-emerald-50/80 text-[10px] font-bold uppercase text-emerald-950">
            <tr>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Telefon</th>
              <th className="px-2 py-2">Pickup</th>
              <th className="px-2 py-2">Pricing</th>
              <th className="px-2 py-2">Vaqt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const open = openId === o.id;
              return (
                <Fragment key={o.id}>
                  <tr className="border-b border-slate-100 align-top">
                    <td className="px-2 py-1.5 font-mono text-[10px]">{o.status}</td>
                    <td className="px-2 py-1.5 font-mono">
                      <a className="text-emerald-900 underline" href={phoneToTelHref(o.customerPhone)}>
                        {o.customerPhone}
                      </a>
                    </td>
                    <td className="px-2 py-1.5">{o.pickupLandmark}</td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-left text-[11px] hover:bg-emerald-50"
                        onClick={() => setOpenId(open ? null : o.id)}
                      >
                        {o.pickupPricingZoneName ?? "Ring"} · {money(o.starterFeeUzs)}
                      </button>
                    </td>
                    <td className="px-2 py-1.5 text-slate-500">{new Date(o.createdAt).toLocaleString("uz-UZ")}</td>
                  </tr>
                  {open && (
                    <tr className="border-b border-emerald-100 bg-emerald-50/30">
                      <td colSpan={5} className="px-3 py-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-emerald-200 bg-white p-3">
                            <p className="font-semibold text-emerald-950">Pickup pricing</p>
                            <p>Ring: {o.pickupPricingZoneName ?? "—"}</p>
                            <p>Starter: {money(o.starterFeeUzs)}</p>
                            <p>Km: {money(o.distanceRateUzs)}/km</p>
                          </div>
                          <div className="rounded-xl border border-emerald-200 bg-white p-3">
                            <p className="font-semibold text-emerald-950">Waiting</p>
                            <p>Free: {o.freeWaitMinutes ?? 10} min</p>
                            <p>Paid rate: {money(o.waitingFeePerMinuteUzs)}/min</p>
                            {o.pricingOverridden && <p className="text-amber-900">Override: {o.pricingOverrideReason}</p>}
                          </div>
                          <div className="rounded-xl border border-emerald-200 bg-white p-3">
                            <p className="font-semibold text-emerald-950">Trip total</p>
                            <p>Distance: {money(o.trip?.distanceFeeUzs)}</p>
                            <p>Waiting: {o.trip?.paidWaitMinutes ?? 0} min · {money(o.trip?.waitingFeeUzs)}</p>
                            <p className="font-bold">Jami: {money(o.trip?.finalFareUzs)}</p>
                            <p>Net: {money(o.trip?.netUzs)}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
