"use client";

import { phoneToTelHref } from "@/lib/phoneCall";
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
  setStoredServiceZoneId,
} from "@/lib/salomOperator";
import { Badge } from "@/components/salom/Badge";
import { Button } from "@/components/salom/Button";
import { Card } from "@/components/salom/Card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type OrderRow = {
  id: string;
  status: string;
  customerPhone: string;
  pickupLandmark: string;
  dropoffText?: string | null;
  paymentType?: string;
  fareMode?: string;
  createdAt: string;
  pickupPricingZoneName?: string | null;
  pickupDistanceFromCenterKm?: string | number | null;
  starterFeeUzs?: string | number | null;
  distanceRateUzs?: string | number | null;
  freeWaitMinutes?: number | null;
  waitingFeePerMinuteUzs?: string | number | null;
  pricingOverridden?: boolean;
  pricingOverrideReason?: string | null;
  pricingRing?: { code: string; name: string; radiusFromKm: string | number; radiusToKm?: string | number | null } | null;
  assignedDriver?: { id: string } | null;
  trip?: {
    id: string;
    status: string;
    waitingStartedAt?: string | null;
    waitingEndedAt?: string | null;
    freeWaitMinutes?: number | null;
    paidWaitMinutes?: number | null;
    waitingFeeUzs?: string | number | null;
    distanceMeters?: string | number | null;
    distanceRateUzs?: string | number | null;
    distanceFeeUzs?: string | number | null;
    finalFareUzs?: string | number | null;
    commissionUzs?: string | number | null;
    netUzs?: string | number | null;
    startedAt?: string | null;
    endedAt?: string | null;
  } | null;
};

type CancellationReason = { id: string; code: string; labelUz: string };

const COLUMNS: { id: string; label: string; match: (s: string) => boolean }[] = [
  { id: "new", label: "Yangi", match: (s) => s === "CREATED" },
  { id: "bc", label: "E'lon", match: (s) => s === "BROADCASTED" },
  {
    id: "run",
    label: "Safar",
    match: (s) => s === "ACCEPTED" || s === "DRIVER_ARRIVING" || s === "PASSENGER_ONBOARD",
  },
  { id: "ok", label: "Tugallangan", match: (s) => s === "COMPLETED" },
  { id: "bad", label: "Bekor", match: (s) => s === "EXPIRED" || s.startsWith("CANCELLED") },
];

function orderStatusVariant(s: string): "neutral" | "warning" | "success" | "danger" | "info" {
  if (s === "COMPLETED") return "success";
  if (s.startsWith("CANCELLED") || s === "EXPIRED") return "danger";
  if (s === "CREATED" || s === "BROADCASTED") return "warning";
  if (s === "ACCEPTED" || s === "DRIVER_ARRIVING" || s === "PASSENGER_ONBOARD") return "info";
  return "neutral";
}

function timeSince(iso: string): string {
  const t = Date.now() - new Date(iso).getTime();
  const m = Math.floor(t / 60000);
  if (m < 1) return "hozir";
  if (m < 60) return `${m} daq`;
  const h = Math.floor(m / 60);
  return `${h} soat`;
}

function money(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `${Math.round(n).toLocaleString("uz-UZ")} so‘m`;
}

function km(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `${(n / 1000).toFixed(2)} km`;
}

type DispatchPanelProps = {
  /** `?new=` tezkor buyurtma keyingi qadam */
  newOrderIdFromQuery?: string | null;
  /** `?zone=` yaratilgan buyurtma zonasiga mos ro'yxat */
  orderZoneIdFromQuery?: string | null;
};

export function DispatchPanel({ newOrderIdFromQuery, orderZoneIdFromQuery }: DispatchPanelProps) {
  const router = useRouter();
  const [bearer, setBearer] = useState("");
  const [zoneId, setZoneId] = useState(DEFAULT_SERVICE_ZONE_ID);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [log, setLog] = useState<string | null>(null);
  const [reasons, setReasons] = useState<CancellationReason[]>([]);
  const [cancelFor, setCancelFor] = useState<string | null>(null);
  const [cancelReasonId, setCancelReasonId] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flowOrderId, setFlowOrderId] = useState<string | null>(null);
  const [dismissedFlow, setDismissedFlow] = useState(false);
  const highlightSeenRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBearer((prev) => prev || (localStorage.getItem(BEARER_KEY) ?? ""));
    const z = getStoredServiceZoneId();
    if (z) setZoneId(z);
  }, []);

  /** Tezkor buyurtma ketma-ketligi: to'g'ri shahar + ro'yxat */
  useEffect(() => {
    if (orderZoneIdFromQuery) {
      setZoneId(orderZoneIdFromQuery);
      setStoredServiceZoneId(orderZoneIdFromQuery);
    }
  }, [orderZoneIdFromQuery]);

  const clearQueryParams = useCallback(() => {
    router.replace("/operator/dispatch", { scroll: false });
  }, [router]);

  useEffect(() => {
    if (newOrderIdFromQuery) {
      setFlowOrderId(newOrderIdFromQuery);
      setDismissedFlow(false);
      highlightSeenRef.current = false;
    }
  }, [newOrderIdFromQuery]);

  useEffect(() => {
    if (!flowOrderId || !rows.length) return;
    if (!rows.some((o) => o.id === flowOrderId)) return;
    setSelectedId(flowOrderId);
    if (highlightSeenRef.current) return;
    highlightSeenRef.current = true;
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-dispatch-order="${flowOrderId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    clearQueryParams();
  }, [flowOrderId, rows, clearQueryParams]);

  useEffect(() => {
    const onVis = () => {
      if (typeof document === "undefined" || document.visibilityState !== "visible") return;
      const t = localStorage.getItem(BEARER_KEY) ?? "";
      if (t.trim()) setBearer(t);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const headers = useCallback(
    () => buildOperatorHeaders(bearer, effectiveOperatorIdFromStorage()),
    [bearer],
  );

  const load = useCallback(async () => {
    setErr(null);
    try {
      const r = await fetch(
        `${SALOM_API_URL}/api/v1/operator/orders?serviceZoneId=${encodeURIComponent(
          zoneId.trim() || DEFAULT_SERVICE_ZONE_ID,
        )}`,
        { headers: headers() },
      );
      if (!r.ok) {
        setErr(await r.text());
        return;
      }
      const j = (await r.json()) as OrderRow[];
      setRows(j);
    } catch (e) {
      if (e instanceof TypeError) {
        setErr(operatorNetworkErrorHint());
        return;
      }
      setErr(toErrorMessage(e, "xato"));
    }
  }, [zoneId, headers]);

  useEffect(() => {
    if (!bearer.trim()) return;
    void load();
  }, [load, bearer]);

  const loadReasons = useCallback(async () => {
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/operator/orders/meta/cancellation-reasons`, {
        headers: headers(),
      });
      if (r.ok) {
        setReasons((await r.json()) as CancellationReason[]);
      }
    } catch (e) {
      if (e instanceof TypeError) {
        setErr((prev) => prev ?? operatorNetworkErrorHint());
      }
    }
  }, [headers]);

  useEffect(() => {
    if (!bearer.trim()) return;
    void loadReasons();
  }, [loadReasons, bearer]);

  const isTerminal = (s: string) =>
    s === "COMPLETED" || s === "EXPIRED" || s.startsWith("CANCELLED");
  const canCancel = (o: OrderRow) => !isTerminal(o.status) && o.status !== "COMPLETED";
  const canNoShow = (o: OrderRow) => o.status === "DRIVER_ARRIVING" && o.trip?.status === "NOT_STARTED";

  const onCancel = async (id: string) => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/operator/orders/${id}/cancel`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(cancelReasonId ? { cancellationReasonId: cancelReasonId } : {}),
      });
      if (!r.ok) throw new Error(await r.text());
      setLog("Bekor qilindi; SMS (log) yozildi.");
      setCancelFor(null);
      setCancelReasonId("");
      await load();
    } catch (e) {
      if (e instanceof TypeError) {
        setErr(operatorNetworkErrorHint());
      } else {
        setErr(toErrorMessage(e, "xato"));
      }
    } finally {
      setLoading(false);
    }
  };

  const onNoShow = async (id: string) => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/operator/orders/${id}/passenger-no-show`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({}),
      });
      if (!r.ok) throw new Error(await r.text());
      setLog("No-show yopildi.");
      await load();
    } catch (e) {
      if (e instanceof TypeError) {
        setErr(operatorNetworkErrorHint());
      } else {
        setErr(toErrorMessage(e, "xato"));
      }
    } finally {
      setLoading(false);
    }
  };

  const onBroadcast = async (id: string) => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/operator/orders/${id}/broadcast`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ offerTtlSec: 60, maxDrivers: 5 }),
      });
      if (!r.ok) throw new Error(await r.text());
      setLog("E'lon yuborildi — haydovchilar endi buyurtmani ko‘rishi kerak.");
      if (id === flowOrderId) {
        setFlowOrderId(null);
        setDismissedFlow(true);
      }
      await load();
    } catch (e) {
      if (e instanceof TypeError) {
        setErr(operatorNetworkErrorHint());
      } else {
        setErr(toErrorMessage(e, "xato"));
      }
    } finally {
      setLoading(false);
    }
  };

  const selected = selectedId ? rows.find((o) => o.id === selectedId) : undefined;
  const flowOrderRow = flowOrderId ? rows.find((o) => o.id === flowOrderId) : undefined;
  const showFlowCta = Boolean(flowOrderId && !dismissedFlow);
  const flowMissing = Boolean(
    showFlowCta && rows.length > 0 && !flowOrderRow,
  );

  if (!bearer.trim()) {
    return (
      <div className="space-y-4 text-sm">
        <Card title="Kirish kerak" padding="md">
          <p className="text-sm text-slate-600">
            Buyurtmalar taxtasi va e&apos;lon faqat tizimga kirgandan keyin ochiladi. Bu yerga texnik token
            maydonlari chiqarilmaydi — ular{" "}
            <Link href="/operator/settings" className="font-semibold text-amber-800 underline">
              Sozlamalar
            </Link>{" "}
            sahifasida saqlanadi.
          </p>
          <div className="mt-4">
            <Link href="/operator/settings">
              <Button type="button" variant="primary">
                Sozlamalarga o&apos;tish
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      {err && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
        >
          {err}
        </div>
      )}
      {log && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {log}
        </div>
      )}

      {showFlowCta && bearer.trim() && (
        <div
          className="relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-lime-50/95 via-white to-emerald-50/70 p-4 shadow-md ring-1 ring-lime-100/80 sm:p-5"
          role="region"
          aria-label="E'lon qilish"
        >
          <div className="absolute right-0 top-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-emerald-200/20 blur-2xl" aria-hidden />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1.5 pr-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800/80">2-qadam</p>
              <h2 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">Haydovchilarga e&apos;lon</h2>
              {flowOrderRow && (
                <p className="text-sm text-slate-600">
                  <a className="font-mono font-medium text-emerald-900 underline" href={phoneToTelHref(flowOrderRow.customerPhone)}>
                    {flowOrderRow.customerPhone}
                  </a>
                  <span className="text-slate-300"> · </span>
                  {flowOrderRow.pickupLandmark}
                </p>
              )}
              {flowMissing && (
                <p className="text-sm font-medium text-amber-900">
                  Bu buyurtma hozirgi ro&apos;yxatda yo&apos;q. Yuqoridagi <span className="font-semibold">shaharni</span> aynan yaratishda
                  tanlaganingizga o&apos;xshatib tanlang, keyin &quot;Yangilash&quot;.
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {flowOrderRow && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={loading}
                  className="!min-w-[10.5rem] !px-5 !py-3 !text-sm !font-bold shadow-md"
                  onClick={() => void onBroadcast(flowOrderRow.id)}
                >
                  {loading ? "…" : "Haydovchilarga e'lon qilish"}
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                className="!px-3 !py-2 !text-xs"
                onClick={() => {
                  setDismissedFlow(true);
                  setFlowOrderId(null);
                  clearQueryParams();
                }}
              >
                Yopish
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card
        title="Sizning hududingiz"
        description={
          <span>
            Yangi buyurtma:{" "}
            <Link className="font-semibold text-amber-800 underline" href="/operator/orders/new">
              Tezkor buyurtma
            </Link>
            . Ro&apos;yxat tanlangan shahardagi buyurtmalarni ko&apos;rsatadi.
          </span>
        }
        padding="md"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <ServiceZoneSelect id="dispatch-zone" value={zoneId} onChange={setZoneId} className="flex-1" />
          <Button variant="secondary" type="button" onClick={() => void load()}>
            Ro&apos;yxatni yangilash
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-3">
          <div className="mb-0 border-b border-violet-200/80 pb-2">
            <h2 className="text-sm font-semibold text-slate-900">Dispatch taxtasi</h2>
            <p className="text-[11px] text-slate-500">Status bo'yicha; kartochkani bosing (tafsilot o'ngda)</p>
          </div>

          <div className="flex min-h-[10rem] gap-1.5 overflow-x-auto pb-1">
            {COLUMNS.map((col) => {
              const inCol = rows.filter((o) => col.match(o.status));
              return (
                <div
                  key={col.id}
                  className="flex w-44 min-w-44 max-w-[11rem] shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50/90"
                >
                  <div className="border-b border-slate-200 px-1.5 py-1.5 text-[10px] font-bold uppercase text-slate-500">
                    {col.label} <span className="font-mono text-slate-400">({inCol.length})</span>
                  </div>
                  <ul className="max-h-72 min-h-0 space-y-1.5 overflow-y-auto p-1.5">
                    {inCol.map((o) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          data-dispatch-order={o.id}
                          onClick={() => setSelectedId(o.id)}
                          className={[
                            "w-full rounded-lg border bg-white p-1.5 text-left text-[11px] leading-tight transition hover:border-amber-400",
                            selectedId === o.id
                              ? "border-amber-500 ring-1 ring-amber-300/80"
                              : "border-slate-200",
                            flowOrderId === o.id ? "ring-2 ring-emerald-300/90" : "",
                          ].join(" ")}
                        >
                          <Badge variant={orderStatusVariant(o.status)} className="!text-[9px]">
                            {o.status}
                          </Badge>
                          <a
                            className="mt-1 block break-all font-mono text-[10px] text-amber-900 underline"
                            href={phoneToTelHref(o.customerPhone)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {o.customerPhone}
                          </a>
                          <p className="line-clamp-2 text-slate-600">{o.pickupLandmark}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{timeSince(o.createdAt)}</p>
                        </button>
                      </li>
                    ))}
                    {inCol.length === 0 && (
                      <li className="px-0.5 py-3 text-center text-[10px] text-slate-400">—</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>

          <section>
            <div className="mb-2 border-b border-violet-200 pb-2">
              <h2 className="text-sm font-semibold text-slate-900">To'liq ro'yxat</h2>
            </div>
            <ul className="space-y-2">
              {rows.length === 0 && (
                <li className="rounded-xl border border-dashed border-violet-200 bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                  Buyurtma yo'q
                </li>
              )}
              {rows.map((o) => (
                <li
                  key={o.id}
                  data-dispatch-order={o.id}
                  className={[
                    "cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition",
                    selectedId === o.id ? "border-amber-500 ring-1 ring-amber-300/60" : "border-violet-200",
                    flowOrderId === o.id ? "ring-2 ring-emerald-300/80" : "",
                  ].join(" ")}
                  onClick={() => setSelectedId(o.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedId(o.id);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={orderStatusVariant(o.status)}>{o.status}</Badge>
                    {o.trip && <Badge variant="neutral">Trip: {o.trip.status}</Badge>}
                    <span className="ml-auto font-mono text-[10px] text-slate-400">{o.id.slice(0, 8)}…</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-800">
                    <a className="font-mono text-amber-900 underline" href={phoneToTelHref(o.customerPhone)}>
                      {o.customerPhone}
                    </a>{" "}
                    <span className="text-slate-400">·</span> {o.pickupLandmark}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside
          className={[
            "lg:sticky lg:top-24 h-fit min-h-[12rem] rounded-2xl border p-4 transition",
            flowOrderRow && selectedId === flowOrderRow.id && showFlowCta
              ? "border-lime-300 bg-gradient-to-b from-lime-50/90 to-white shadow-lg ring-2 ring-lime-200/60"
              : "border-emerald-200/80 bg-emerald-50/30",
          ].join(" ")}
        >
          <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-900">Amal</h3>
          {!selected && <p className="mt-2 text-xs text-slate-500">Chapdan buyurtma tanlang.</p>}
          {selected && (
            <div className="mt-2 space-y-2 text-xs">
              <p>
                <span className="text-slate-500">ID</span>{" "}
                <code className="break-all text-[10px]">{selected.id}</code>
              </p>
              <p>
                <span className="text-slate-500">Telefon</span>{" "}
                <a className="font-mono font-medium text-emerald-900 underline" href={phoneToTelHref(selected.customerPhone)}>
                  {selected.customerPhone}
                </a>
              </p>
              <p>
                <span className="text-slate-500">Pickup</span> {selected.pickupLandmark}
              </p>
              {selected.dropoffText && (
                <p>
                  <span className="text-slate-500">Manzil</span> {selected.dropoffText}
                </p>
              )}
              <p>
                <span className="text-slate-500">Yaratilgan</span> {new Date(selected.createdAt).toLocaleString("uz-UZ")}
              </p>
              <div className="rounded-xl border border-emerald-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-900">Pricing</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <dt className="text-slate-500">Ring</dt>
                  <dd className="text-right font-medium text-slate-900">{selected.pickupPricingZoneName ?? selected.pricingRing?.name ?? "—"}</dd>
                  <dt className="text-slate-500">Radius</dt>
                  <dd className="text-right">
                    {selected.pickupDistanceFromCenterKm != null
                      ? `${Number(selected.pickupDistanceFromCenterKm).toFixed(2)} km`
                      : selected.pricingRing
                        ? `${selected.pricingRing.radiusFromKm}-${selected.pricingRing.radiusToKm ?? "∞"} km`
                        : "—"}
                  </dd>
                  <dt className="text-slate-500">Starter</dt>
                  <dd className="text-right font-semibold">{money(selected.starterFeeUzs)}</dd>
                  <dt className="text-slate-500">Km narxi</dt>
                  <dd className="text-right font-semibold">{money(selected.distanceRateUzs)}/km</dd>
                  <dt className="text-slate-500">Kutish</dt>
                  <dd className="text-right">{selected.freeWaitMinutes ?? 10} min free · {money(selected.waitingFeePerMinuteUzs)}/min</dd>
                </dl>
                {selected.pricingOverridden && (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-950">
                    Override: {selected.pricingOverrideReason || "sababsiz"}
                  </p>
                )}
              </div>
              {selected.trip && (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700">Fare breakdown</p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <dt className="text-slate-500">Masofa</dt>
                    <dd className="text-right">{km(selected.trip.distanceMeters)}</dd>
                    <dt className="text-slate-500">Distance fee</dt>
                    <dd className="text-right">{money(selected.trip.distanceFeeUzs)}</dd>
                    <dt className="text-slate-500">Kutish</dt>
                    <dd className="text-right">{selected.trip.paidWaitMinutes ?? 0} paid min · {money(selected.trip.waitingFeeUzs)}</dd>
                    <dt className="text-slate-500">Jami</dt>
                    <dd className="text-right font-bold text-emerald-900">{money(selected.trip.finalFareUzs)}</dd>
                    <dt className="text-slate-500">Komissiya</dt>
                    <dd className="text-right">{money(selected.trip.commissionUzs)}</dd>
                    <dt className="text-slate-500">Haydovchi net</dt>
                    <dd className="text-right">{money(selected.trip.netUzs)}</dd>
                  </dl>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(selected.status === "CREATED" || selected.status === "BROADCASTED") && (
                  <Button
                    variant="primary"
                    type="button"
                    disabled={loading}
                    onClick={() => void onBroadcast(selected.id)}
                    className="!w-full !py-2.5 !text-sm !font-semibold"
                  >
                    {selected.status === "CREATED" ? "Haydovchilarga e'lon" : "Qayta e'lon"}
                  </Button>
                )}
                {canCancel(selected) && (
                  <>
                    {cancelFor === selected.id ? (
                      <div className="w-full space-y-1.5 rounded-lg border border-violet-200 bg-slate-50 p-2">
                        <span className="text-[10px] text-slate-500">Sabab</span>
                        <select
                          className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px]"
                          value={cancelReasonId}
                          onChange={(e) => setCancelReasonId(e.target.value)}
                        >
                          <option value="">(ixtiyoriy)</option>
                          {reasons.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.labelUz}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-1">
                          <Button
                            variant="danger"
                            type="button"
                            disabled={loading}
                            onClick={() => void onCancel(selected.id)}
                            className="!py-1 !text-xs"
                          >
                            Tasdiqlash
                          </Button>
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() => {
                              setCancelFor(null);
                              setCancelReasonId("");
                            }}
                            className="!py-1 !text-xs"
                          >
                            Yopish
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="danger"
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setCancelFor(selected.id);
                          setCancelReasonId("");
                        }}
                        className="!py-1.5 !text-xs"
                      >
                        Operatsion bekor
                      </Button>
                    )}
                  </>
                )}
                {canNoShow(selected) && (
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={loading}
                    onClick={() => void onNoShow(selected.id)}
                    className="!py-1.5 !text-xs"
                  >
                    No-show
                  </Button>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
