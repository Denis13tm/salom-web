"use client";

import { ServiceZoneSelect } from "@/components/operator/ServiceZoneSelect";
import { Badge } from "@/components/salom/Badge";
import { Button } from "@/components/salom/Button";
import { Card } from "@/components/salom/Card";
import { InputField } from "@/components/salom/InputField";
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
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type VehicleRow = { id: string; plate: string; makeModel: string; year: number | null; color: string | null };

type Profile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  passportOrId: string | null;
  referralNote: string | null;
  adminNotes: string | null;
  serviceZoneId: string | null;
  operationalStatus: string;
  onboardingStatus: string;
  user: { phone: string; status: string };
  serviceZone: { id: string; name: string; slug: string } | null;
  vehicles: VehicleRow[];
  stats?: { ordersTotal: number; tripsTotal: number };
  recentTrips?: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    order?: { customerPhone?: string | null; pickupLandmark?: string | null } | null;
  }[];
};

export function OperatorDriverProfileClient({
  driverId,
  initialServiceZoneId,
}: {
  driverId: string;
  initialServiceZoneId: string | null;
}) {
  const [bearer, setBearer] = useState("");
  const [zoneId, setZoneId] = useState(() => initialServiceZoneId ?? DEFAULT_SERVICE_ZONE_ID);
  const [data, setData] = useState<Profile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [load, setLoad] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [passportOrId, setPassportOrId] = useState("");
  const [referralNote, setReferralNote] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [vPlate, setVPlate] = useState("");
  const [vMake, setVMake] = useState("");
  const [vYear, setVYear] = useState("");
  const [vColor, setVColor] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBearer((p) => p || (localStorage.getItem(BEARER_KEY) ?? ""));
    if (initialServiceZoneId) return;
    const z = getStoredServiceZoneId();
    if (z) setZoneId(z);
  }, [initialServiceZoneId]);

  const headers = useCallback(
    () => buildOperatorHeaders(bearer, effectiveOperatorIdFromStorage()),
    [bearer],
  );

  const fetchProfile = useCallback(async () => {
    if (!bearer.trim()) return;
    setErr(null);
    setLoad(true);
    try {
      const z = zoneId.trim() || DEFAULT_SERVICE_ZONE_ID;
      const r = await fetch(
        `${SALOM_API_URL}/api/v1/operator/drivers/${encodeURIComponent(driverId)}/profile?serviceZoneId=${encodeURIComponent(z)}`,
        { headers: headers() },
      );
      if (!r.ok) {
        setErr(await r.text());
        setData(null);
        return;
      }
      const j = (await r.json()) as Profile;
      setData(j);
      setFirstName(j.firstName ?? "");
      setLastName(j.lastName ?? "");
      setPassportOrId(j.passportOrId ?? "");
      setReferralNote(j.referralNote ?? "");
      setAdminNotes(j.adminNotes ?? "");
      const primary = j.vehicles.find(() => true) ?? null;
      setVPlate(primary?.plate ?? "");
      setVMake(primary?.makeModel ?? "");
      setVYear(primary?.year != null ? String(primary.year) : "");
      setVColor(primary?.color ?? "");
    } catch (e) {
      if (e instanceof TypeError) setErr(operatorNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setLoad(false);
    }
  }, [bearer, driverId, zoneId, headers]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const onSaveNotes = async () => {
    setSaving(true);
    setErr(null);
    try {
      const z = zoneId.trim() || DEFAULT_SERVICE_ZONE_ID;
      const body: Record<string, unknown> = {
        adminNotes: adminNotes.trim() || null,
      };
      const r = await fetch(
        `${SALOM_API_URL}/api/v1/operator/drivers/${encodeURIComponent(driverId)}/profile?serviceZoneId=${encodeURIComponent(z)}`,
        {
          method: "PATCH",
          headers: { ...headers(), "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!r.ok) throw new Error(await r.text());
      const j = (await r.json()) as Profile;
      setData(j);
    } catch (e) {
      if (e instanceof TypeError) setErr(operatorNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setSaving(false);
    }
  };

  if (!bearer.trim()) {
    return (
      <Card title="Kirish" padding="md" accent="operator">
        <p className="text-sm text-slate-600">
          <Link className="font-semibold text-amber-800 underline" href="/operator/settings">
            Sozlamalar
          </Link>{" "}
          orqali operator sifatida kiring.
        </p>
      </Card>
    );
  }

  if (load && !data) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-10 text-center text-sm text-slate-600">
        Profil yuklanmoqda…
      </div>
    );
  }

  if (!data && err) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
        {err}
        <div className="mt-2">
          <Link href="/operator/drivers" className="font-medium text-amber-800 underline">
            Ro‘yxatga qaytish
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5 text-sm">
      {err && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {err}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {[data.firstName, data.lastName].filter(Boolean).join(" ") || data.user.phone}
          </h2>
          <p className="text-xs text-slate-500">
            {data.user.phone} · ID <span className="font-mono text-[10px]">{data.id}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="warning">{data.operationalStatus}</Badge>
          <Badge variant="neutral">{data.onboardingStatus}</Badge>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Bu ekran faqat yuqorida tanlangan <span className="font-medium">xizmat zonasidagi</span> haydovchilar uchun.
      </p>

      <div className="max-w-md">
        <ServiceZoneSelect
          id="profile-list-zone"
          value={zoneId}
          onChange={setZoneId}
          label="Sizning operator filtringiz (faqat ro‘yxat / profilni yuklash)"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Shaxsiy ma'lumot" padding="md" accent="operator">
          <p className="mb-2 text-[11px] text-slate-500">Operator uchun faqat ko‘rish (tahrir — Administrator).</p>
          <div className="space-y-3">
            <InputField
              id="d-fn"
              label="Ism"
              value={firstName}
              readOnly
              className="cursor-default bg-slate-50 text-slate-700"
            />
            <InputField
              id="d-ln"
              label="Familiya"
              value={lastName}
              readOnly
              className="cursor-default bg-slate-50 text-slate-700"
            />
            <InputField
              id="d-pid"
              label="Passport / JShShIR (ixtiyoriy)"
              value={passportOrId}
              readOnly
              className="cursor-default bg-slate-50 text-slate-700"
            />
            <div>
              <span className="text-xs font-medium text-slate-600">Tavsiya / izoh (referral)</span>
              <textarea
                id="d-ref"
                rows={2}
                readOnly
                className="mt-1.5 w-full cursor-default rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-700"
                value={referralNote}
              />
            </div>
          </div>
        </Card>

        <Card title="Zona (ishlash hududi)" padding="md" accent="operator">
          <p className="mb-2 text-[11px] text-slate-500">Haydovchi zonasi — faqat ko‘rish.</p>
          <div className="space-y-3">
            <div>
              <span className="text-xs font-medium text-slate-600">Shahar (haydovchi profili)</span>
              <p className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800">
                {data.serviceZone?.name ?? "—"}
              </p>
            </div>
            <p className="text-[11px] text-slate-500">
              Yukoridagi zonani o‘zgartirsangiz, faqat <span className="font-medium">qaysi haydovchilar ro‘yxatidan</span> profil ochilishini boshqarasiz (
              haydovchi zonasiga tegmaydi).
            </p>
          </div>
        </Card>

        <Card title="Transport" padding="md" accent="operator">
          <p className="mb-2 text-[11px] text-slate-500">Birinchi (asosiy) avtomobil — faqat ko‘rish.</p>
          <div className="space-y-3">
            <InputField
              id="d-plate"
              label="Davlat raqami"
              value={vPlate}
              readOnly
              className="cursor-default bg-slate-50 text-slate-700"
            />
            <InputField
              id="d-make"
              label="Model"
              value={vMake}
              readOnly
              className="cursor-default bg-slate-50 text-slate-700"
            />
            <div className="grid grid-cols-2 gap-2">
              <InputField
                id="d-y"
                label="Yil"
                value={vYear}
                readOnly
                className="cursor-default bg-slate-50 text-slate-700"
                inputMode="numeric"
              />
              <InputField
                id="d-color"
                label="Rang"
                value={vColor}
                readOnly
                className="cursor-default bg-slate-50 text-slate-700"
              />
            </div>
          </div>
        </Card>

        <Card title="Operator eslatmasi" padding="md" accent="operator">
          <label htmlFor="d-admin" className="text-xs font-medium text-slate-600">
            Ichki eslatma (barcha operatorlar)
          </label>
          <textarea
            id="d-admin"
            rows={5}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Mijoz bilan kelishuv, maxsus holat…"
          />
        </Card>
      </div>

      <Card title="So‘nggi safarlar (qisqa)" padding="md" accent="operator">
        <p className="mb-2 text-[11px] text-slate-500">
          Batafsil tarix va toʻlov summalari operator panelida toʻliq yoʻq — kerak boʻlsa administrator bilan bog‘laning.
        </p>
        <ul className="space-y-1 text-xs">
          {(data.recentTrips ?? []).slice(0, 3).map((t) => {
            const end = t.endedAt ? new Date(t.endedAt).toLocaleString("uz-UZ", { dateStyle: "short" }) : "—";
            const line = t.order?.pickupLandmark?.trim() || t.order?.customerPhone || t.id.slice(0, 8);
            return (
              <li key={t.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 py-1.5">
                <span className="font-medium text-slate-800">{t.status}</span>
                <span className="text-slate-500">{end}</span>
                <span className="w-full truncate text-[11px] text-slate-600">{line}</span>
              </li>
            );
          })}
          {(data.recentTrips ?? []).length === 0 && <li className="text-slate-500">Hozircha safar yo‘q</li>}
        </ul>
      </Card>

      {data.stats && (
        <p className="text-xs text-slate-500">
          Qisqa statistika: buyurtmalar {data.stats.ordersTotal}, safarlar {data.stats.tripsTotal}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={saving} variant="primary" onClick={() => void onSaveNotes()}>
          {saving ? "Saqlanmoqda…" : "Operator eslatmasini saqlash"}
        </Button>
        <Link href="/operator/drivers">
          <Button type="button" variant="secondary">
            Haydovchilarga qaytish
          </Button>
        </Link>
      </div>
    </div>
  );
}
