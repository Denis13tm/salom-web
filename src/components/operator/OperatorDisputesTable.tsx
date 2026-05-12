"use client";

import { Button } from "@/components/salom/Button";
import { phoneToTelHref } from "@/lib/phoneCall";
import { toErrorMessage } from "@/lib/toErrorMessage";
import { BEARER_KEY, DEFAULT_SERVICE_ZONE_ID, SALOM_API_URL, buildOperatorHeaders, defaultOperatorId, operatorNetworkErrorHint } from "@/lib/salomOperator";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type DisputeRow = {
  tripId: string;
  orderId: string;
  updatedAt: string;
  disputeNote: string | null;
  driverPhone: string;
  customerPhone: string;
  pickupLandmark: string;
  /** Buyurtma holati — `complete` yechimi faqat odatda PASSENGER_ONBOARD da */
  orderStatus: string;
};

export function OperatorDisputesTable() {
  const [bearer, setBearer] = useState("");
  const [rows, setRows] = useState<DisputeRow[]>([]);
  const opId = defaultOperatorId();
  const [err, setErr] = useState<string | null>(null);
  const [zoneFilter, setZoneFilter] = useState<"pilot" | "all">("pilot");
  const [busyTripId, setBusyTripId] = useState<string | null>(null);
  const [actionFor, setActionFor] = useState<Record<string, "cancel" | "complete">>({});
  const [fareFor, setFareFor] = useState<Record<string, string>>({});

  const headers = useCallback(() => buildOperatorHeaders(bearer, opId), [bearer, opId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBearer((p) => p || (localStorage.getItem(BEARER_KEY) ?? ""));
  }, []);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const q =
        zoneFilter === "pilot" ? `?serviceZoneId=${encodeURIComponent(DEFAULT_SERVICE_ZONE_ID)}` : "";
      const r = await fetch(`${SALOM_API_URL}/api/v1/operator/trips/disputed${q}`, { headers: headers() });
      if (!r.ok) throw new Error(await r.text());
      setRows((await r.json()) as DisputeRow[]);
    } catch (e) {
      if (e instanceof TypeError) setErr(operatorNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    }
  }, [headers, zoneFilter]);

  useEffect(() => {
    if (!bearer.trim()) return;
    void load();
  }, [load, bearer]);

  const submitResolve = useCallback(
    async (row: DisputeRow) => {
      const outcome = actionFor[row.tripId] ?? "cancel";
      if (outcome === "complete" && row.orderStatus !== "PASSENGER_ONBOARD") {
        setErr("«Tugatish» faqat yo'lovchi mashinada (PASSENGER_ONBOARD) bo'lganda mumkin. Aks holda «Bekor».");
        return;
      }
      const fareRaw = (fareFor[row.tripId] ?? "").trim();
      let fareNum: number | undefined;
      if (outcome === "complete" && fareRaw !== "") {
        const p = parseFloat(fareRaw.replace(",", "."));
        if (Number.isNaN(p) || p < 0) {
          setErr("Yo'l haqi musbat son bo'lsin.");
          return;
        }
        fareNum = Math.round(p);
      }
      setErr(null);
      setBusyTripId(row.tripId);
      try {
        const body: { outcome: "cancel" | "complete"; fareUzs?: number } = { outcome };
        if (outcome === "complete" && fareNum !== undefined) {
          body.fareUzs = fareNum;
        }
        const r = await fetch(`${SALOM_API_URL}/api/v1/operator/trips/${row.tripId}/dispute/resolve`, {
          method: "POST",
          headers: { ...headers(), "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(await r.text());
        await load();
      } catch (e) {
        if (e instanceof TypeError) setErr(operatorNetworkErrorHint());
        else setErr(toErrorMessage(e, "xato"));
      } finally {
        setBusyTripId(null);
      }
    },
    [actionFor, fareFor, headers, load],
  );

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
          Yangilash
        </Button>
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <span>Zona</span>
          <select
            className="rounded border border-amber-200/80 bg-white px-2 py-1 text-xs"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value as "pilot" | "all")}
          >
            <option value="pilot">Pilot (default)</option>
            <option value="all">Barcha zonalar</option>
          </select>
        </label>
        <p className="text-[10px] text-slate-500">
          <code className="rounded bg-slate-100 px-1">GET …/disputed</code> ·{" "}
          <code className="rounded bg-slate-100 px-1">POST …/trips/:id/dispute/resolve</code>
        </p>
      </div>
      {err && <p className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-900">{err}</p>}
      <div className="overflow-x-auto rounded-xl border border-amber-200/60">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="border-b border-amber-200/60 bg-amber-50/90 text-[10px] font-bold uppercase tracking-wide text-amber-950/80">
            <tr>
              <th className="px-2 py-2">Yangilangan</th>
              <th className="px-2 py-2">Buyurtma</th>
              <th className="px-2 py-2">Mijoz</th>
              <th className="px-2 py-2">Haydovchi</th>
              <th className="px-2 py-2">Manzil</th>
              <th className="px-2 py-2">Izoh</th>
              <th className="px-2 py-2">Yechim</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const canComplete = r.orderStatus === "PASSENGER_ONBOARD";
              const outcome = actionFor[r.tripId] ?? "cancel";
              return (
                <tr key={r.tripId} className="border-b border-amber-100/80">
                  <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[10px] text-slate-600">
                    {new Date(r.updatedAt).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[10px]">{r.orderStatus}</td>
                  <td className="px-2 py-1.5 font-mono">
                    <a className="text-amber-900 underline" href={phoneToTelHref(r.customerPhone)}>
                      {r.customerPhone}
                    </a>
                  </td>
                  <td className="px-2 py-1.5 font-mono">
                    <a className="text-amber-900 underline" href={phoneToTelHref(r.driverPhone)}>
                      {r.driverPhone}
                    </a>
                  </td>
                  <td className="max-w-[200px] truncate px-2 py-1.5" title={r.pickupLandmark}>
                    {r.pickupLandmark}
                  </td>
                  <td className="max-w-[220px] px-2 py-1.5 text-[10px] text-slate-700">{r.disputeNote ?? "—"}</td>
                  <td className="min-w-[200px] px-2 py-1.5 align-top">
                    <div className="flex flex-col gap-1">
                      <select
                        className="max-w-full rounded border border-amber-200/80 bg-white px-1 py-0.5 text-[10px]"
                        value={outcome}
                        onChange={(e) =>
                          setActionFor((prev) => ({
                            ...prev,
                            [r.tripId]: e.target.value as "cancel" | "complete",
                          }))
                        }
                      >
                        <option value="cancel">Bekor (buyurtma)</option>
                        <option value="complete" disabled={!canComplete}>
                          Tugatish (safar)
                        </option>
                      </select>
                      {outcome === "complete" && (
                        <input
                          className="w-full rounded border px-1 py-0.5 font-mono text-[10px]"
                          placeholder="Yo'l haqi (ixt.)"
                          inputMode="numeric"
                          value={fareFor[r.tripId] ?? ""}
                          onChange={(e) =>
                            setFareFor((prev) => ({ ...prev, [r.tripId]: e.target.value }))
                          }
                        />
                      )}
                      <Button
                        type="button"
                        className="!text-[10px] !py-0.5"
                        disabled={busyTripId !== null}
                        onClick={() => void submitResolve(r)}
                      >
                        {busyTripId === r.tripId ? "…" : "Yuborish"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && !err && (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-slate-500">
                  Ochiq nizo yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-500">
        <strong>Bekor</strong> — buyurtma operator tomonidan bekor (dispute yopiladi).{" "}
        <strong>Tugatish</strong> — faqat holat <code className="rounded bg-slate-100 px-0.5">PASSENGER_ONBOARD</code>{" "}
        bo'lganda; METERED bo'lsa narx odatda metrdan olinadi.{" "}
        <Link className="text-amber-800 underline" href="/operator/orders">
          Buyurtmalar
        </Link>
      </p>
    </div>
  );
}
