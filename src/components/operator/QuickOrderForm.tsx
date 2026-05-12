"use client";

import { ServiceZoneSelect } from "@/components/operator/ServiceZoneSelect";
import { Button } from "@/components/salom/Button";
import { InputField } from "@/components/salom/InputField";
import { toErrorMessage } from "@/lib/toErrorMessage";
import {
  BEARER_KEY,
  DEFAULT_SERVICE_ZONE_ID,
  QUICK_ORDER_LAST_PHONE_KEY,
  SALOM_API_URL,
  buildOperatorHeaders,
  effectiveOperatorIdFromStorage,
  getStoredServiceZoneId,
  operatorNetworkErrorHint,
} from "@/lib/salomOperator";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import {
  fetchPublicServiceZones,
  type PublicServiceZone,
} from "@/lib/salomServiceZones";

/** API defaultlari — shaklda ko‘rinmaydi (operator oddiy oqim) */
const DEFAULT_PAYMENT = "CASH" as const;
const DEFAULT_FARE = "METERED" as const;

export function QuickOrderForm() {
  const router = useRouter();
  const idPrefix = useId();
  const [bearer, setBearer] = useState("");
  const [zoneId, setZoneId] = useState(DEFAULT_SERVICE_ZONE_ID);
  const [phone, setPhone] = useState("");
  const [landmark, setLandmark] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zonesHint, setZonesHint] = useState<PublicServiceZone[] | null>(null);
  const [pricingRingId, setPricingRingId] = useState("");

  useEffect(() => {
    void fetchPublicServiceZones()
      .then((z) => setZonesHint(z))
      .catch(() => setZonesHint([]));
  }, []);

  const selectedZone = zonesHint?.find((x) => x.id === zoneId);
  const profile = selectedZone?.pricingProfile ?? null;
  const rings = useMemo(() => profile?.rings ?? [], [profile]);
  const selectedRing = rings.find((r) => r.id === pricingRingId) ?? rings[0] ?? null;

  useEffect(() => {
    if (!rings.length) {
      setPricingRingId("");
      return;
    }
    if (!rings.some((r) => r.id === pricingRingId)) {
      setPricingRingId(rings[0]!.id);
    }
  }, [pricingRingId, rings]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBearer((p) => p || (localStorage.getItem(BEARER_KEY) ?? ""));
    const z = getStoredServiceZoneId();
    if (z) setZoneId(z);
    const last = localStorage.getItem(QUICK_ORDER_LAST_PHONE_KEY);
    if (last) setPhone(last);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const effectiveBearer =
      bearer.trim() ||
      (typeof window !== "undefined" ? (localStorage.getItem(BEARER_KEY)?.trim() ?? "") : "");
    if (!effectiveBearer) {
      setErr("Avval tizimga kiring: Sozlamalar sahifasida kirish kodi (yoki «Token olish»).");
      setLoading(false);
      return;
    }
    try {
      const body: Record<string, string | number> = {
        serviceZoneId: zoneId.trim() || DEFAULT_SERVICE_ZONE_ID,
        customerPhone: phone.trim(),
        pickupLandmark: landmark.trim(),
        paymentType: DEFAULT_PAYMENT,
        fareMode: DEFAULT_FARE,
      };
      if (pricingRingId) body.pricingRingId = pricingRingId;
      const r = await fetch(`${SALOM_API_URL}/api/v1/operator/orders`, {
        method: "POST",
        headers: buildOperatorHeaders(effectiveBearer, effectiveOperatorIdFromStorage()),
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      const created = (await r.json()) as { id: string };
      if (phone.trim() && typeof window !== "undefined") {
        localStorage.setItem(QUICK_ORDER_LAST_PHONE_KEY, phone.trim());
      }
      setLandmark("");
      router.push(
        `/operator/dispatch?new=${encodeURIComponent(created.id)}&zone=${encodeURIComponent(zoneId.trim() || DEFAULT_SERVICE_ZONE_ID)}`,
      );
    } catch (e) {
      if (e instanceof TypeError) setErr(operatorNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 text-sm"
      autoComplete="on"
    >
      {err && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"
        >
          {err}
        </div>
      )}
      <div className="max-w-md space-y-3">
        <ServiceZoneSelect
          id={`${idPrefix}-zone`}
          value={zoneId}
          onChange={setZoneId}
          label="Shahar (pickup zonasi — starter narx shu yerdan)"
        />
        {rings.length > 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm">
            <label htmlFor={`${idPrefix}-pricing-ring`} className="text-xs font-semibold text-slate-700">
              Pickup zona / radius ring
            </label>
            <select
              id={`${idPrefix}-pricing-ring`}
              className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-lime-200"
              value={pricingRingId}
              onChange={(e) => setPricingRingId(e.target.value)}
            >
              {rings.map((ring) => (
                <option key={ring.id} value={ring.id}>
                  {ring.name} · {ring.radiusFromKm}-{ring.radiusToKm ?? "∞"} km · starter{" "}
                  {ring.starterFeeUzs.toLocaleString("uz-UZ")} · km{" "}
                  {(ring.distanceRateUzs ?? profile?.cityKmRateUzs ?? 2500).toLocaleString("uz-UZ")}
                </option>
              ))}
            </select>
            {selectedRing && profile && (
              <p className="mt-2 rounded-md border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-[11px] text-emerald-900">
                <span className="font-medium">{selectedRing.name}</span> · starter ~{selectedRing.starterFeeUzs.toLocaleString("uz-UZ")}{" "}
                so‘m · kutish: {profile.freeWaitMinutes} min tekin, keyin har minut{" "}
                {profile.waitPerMinuteUzs.toLocaleString("uz-UZ")} so‘m · yo‘lda km{" "}
                {(selectedRing.distanceRateUzs ?? profile.cityKmRateUzs).toLocaleString("uz-UZ")} so‘m (taxometr masofasi).
              </p>
            )}
          </div>
        )}
        {rings.length === 0 &&
          selectedZone &&
          selectedZone.starterFeeUzs != null &&
          (() => {
            const z = selectedZone;
            const free = z.waitingFreeMinutes ?? 10;
            const ap = z.waitingFeePerMinuteUzs ?? 1000;
            const kmDefault = profile?.cityKmRateUzs ?? null;
            return (
              <p className="rounded-md border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-[11px] text-emerald-900">
                <span className="font-medium">Starter</span> ~{z.starterFeeUzs.toLocaleString("uz-UZ")} so‘m · kutish: {free} min tekin,
                keyin har minut {ap.toLocaleString("uz-UZ")} so‘m
                {kmDefault != null ? (
                  <>
                    {" "}
                    · yo‘lda km {kmDefault.toLocaleString("uz-UZ")} so‘m (taxometr masofasi).
                  </>
                ) : (
                  <> · yo‘lda narx km (taxometr masofasi).</>
                )}
              </p>
            );
          })()}
        <p className="text-[11px] text-slate-500">
          Hisob:{" "}
          <Link href="/operator/settings" className="font-medium text-amber-800 underline">
            Sozlamalar
          </Link>
        </p>
        <InputField
          id={`${idPrefix}-phone`}
          label="Mijoz telefoni *"
          placeholder="+9989…"
          className="font-mono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          autoFocus
          autoComplete="tel"
        />
        <InputField
          id={`${idPrefix}-lm`}
          label="Qayerdan olib ketish (mo'ljal) *"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          required
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button type="submit" disabled={loading} className="!min-w-[10rem] !px-5 !py-2.5 !text-base !font-semibold">
          {loading ? "Qayta yuborilmoqda…" : "Buyurtma yaratib Dispatchga o‘tish"}
        </Button>
        <p className="w-full text-[11px] text-slate-500 sm:w-auto sm:pl-1">
          Keyingi ekran: haydovchilarga bitta e&apos;lon
        </p>
      </div>
    </form>
  );
}
