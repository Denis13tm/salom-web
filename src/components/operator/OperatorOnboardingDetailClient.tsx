"use client";

import { OperatorAuthCard } from "@/components/operator/OperatorAuthCard";
import { AuthedDocImage } from "@/components/salom/AuthedDocImage";
import { Button } from "@/components/salom/Button";
import { Card } from "@/components/salom/Card";
import { toErrorMessage } from "@/lib/toErrorMessage";
import {
  BEARER_KEY,
  DEFAULT_SERVICE_ZONE_ID,
  SALOM_API_URL,
  buildOperatorHeaders,
  effectiveOperatorIdFromStorage,
  operatorNetworkErrorHint,
} from "@/lib/salomOperator";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type DriverDetail = {
  id: string;
  operationalStatus: string;
  balanceUzs: string;
  onboardingStatus?: string;
  firstName?: string | null;
  lastName?: string | null;
  passportOrId?: string | null;
  activationCode?: string | null;
  needsAppActivation?: boolean;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  user: { phone: string; status: string };
  serviceZone: { name: string; slug: string } | null;
  vehicles: { id: string; plate: string; makeModel: string; isActive: boolean }[];
  documents: { id: string; type: string; status: string; createdAt: string }[];
};

export function OperatorOnboardingDetailClient({ driverId }: { driverId: string }) {
  const searchParams = useSearchParams();
  const zoneFromQuery = searchParams.get("zone")?.trim() || DEFAULT_SERVICE_ZONE_ID;

  const [bearer, setBearer] = useState("");
  const [d, setD] = useState<DriverDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const bearerRef = useRef(bearer);
  bearerRef.current = bearer;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBearer((p) => p || (localStorage.getItem(BEARER_KEY) ?? ""));
  }, []);

  const h = useCallback(
    (b: string) => buildOperatorHeaders(b, effectiveOperatorIdFromStorage()),
    [],
  );

  const zoneQ = `serviceZoneId=${encodeURIComponent(zoneFromQuery)}`;

  const load = useCallback(async () => {
    setErr(null);
    const b = bearerRef.current.trim();
    if (!b) return;
    try {
      const r = await fetch(
        `${SALOM_API_URL}/api/v1/operator/drivers/onboarding/${encodeURIComponent(driverId)}?${zoneQ}`,
        { headers: h(b) },
      );
      if (!r.ok) throw new Error(await r.text());
      setD((await r.json()) as DriverDetail);
    } catch (e) {
      if (e instanceof TypeError) setErr(operatorNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
      setD(null);
    }
  }, [driverId, zoneQ, h]);

  useEffect(() => {
    if (!bearer.trim()) return;
    void load();
  }, [bearer, load]);

  if (!bearer.trim()) {
    return (
      <OperatorAuthCard
        onAfterExchange={(t) => setBearer(t)}
        title="Ariza tafsiloti"
        description="Arizani ko‘rish (read-only) uchun operator JWT kerak. Tasdiqlash faqat Admin panelda."
      />
    );
  }

  if (err && !d) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {err}
        </div>
        <Link href="/operator/onboarding" className="text-sm text-amber-800 underline">
          ← Arizalar ro'yxati
        </Link>
      </div>
    );
  }

  if (!d) {
    return <p className="text-sm text-slate-500">Yuklanmoqda…</p>;
  }

  return (
    <div className="space-y-6 text-sm">
      {err && <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs">{err}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/operator/onboarding" className="text-xs font-medium text-amber-800 underline">
          ← Arizalar
        </Link>
        <span className="text-slate-300">|</span>
        <span className="text-xs text-slate-500">
          Zona: <span className="font-mono">{zoneFromQuery}</span>
        </span>
        <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
          Yangilash
        </Button>
      </div>

      <Card title="Kim nima qila oladi" padding="md" accent="operator">
        <p className="text-xs text-slate-700">
          Ariza tasdiqi, rad qilish va hujjatlar bilan bog‘liq harakatlar <strong>faqat Administrator</strong> uchun. Operatorlar
          bu yerda hujjat va holatni ko‘radi — admin panel havolalari operator interfeysida mavjud emas.
        </p>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-200 bg-white p-3">
          <h3 className="text-xs font-bold uppercase text-amber-900">Aloqa</h3>
          <p className="mt-1 font-mono text-slate-900">{d.user.phone}</p>
          <p className="text-xs text-slate-500">Hisob: {d.user.status}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-white p-3">
          <h3 className="text-xs font-bold uppercase text-amber-900">Ariza</h3>
          <p className="mt-1 font-mono text-slate-800">{d.onboardingStatus}</p>
          <p className="text-xs text-slate-500">Zona: {d.serviceZone?.name ?? "—"}</p>
          {(d.firstName || d.lastName) && (
            <p className="mt-1 text-xs text-slate-600">
              {d.firstName} {d.lastName} {d.passportOrId ? `· ${d.passportOrId}` : ""}
            </p>
          )}
          {d.activationCode && (
            <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 font-mono text-xs">
              Kod (Admin tasdig‘idan keyin): {d.activationCode}
            </p>
          )}
          {d.rejectionReason && <p className="mt-1 text-xs text-rose-700">Rad: {d.rejectionReason}</p>}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase text-slate-500">Transport</h3>
        <ul className="mt-1 space-y-1">
          {d.vehicles.length === 0 && <li className="text-slate-500">—</li>}
          {d.vehicles.map((v) => (
            <li key={v.id} className="rounded border border-slate-100 bg-slate-50 px-2 py-1 font-mono text-xs">
              {v.plate} · {v.makeModel} {v.isActive ? "" : "(noaktiv)"}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase text-slate-500">Hujjatlar (ro'yxat)</h3>
        <ul className="mt-1 space-y-3 text-xs text-slate-600">
          {d.documents.length === 0 && <li>—</li>}
          {d.documents.map((x) => {
            const fileHref = `${SALOM_API_URL}/api/v1/operator/drivers/onboarding/${encodeURIComponent(driverId)}/documents/${encodeURIComponent(x.id)}/file?${zoneQ}`;
            return (
              <li key={x.id} className="rounded-lg border border-amber-100 bg-white p-2 shadow-sm">
                <p className="font-medium text-slate-800">
                  {x.type} · {x.status}
                </p>
                <AuthedDocImage
                  href={fileHref}
                  mode="operator"
                  operatorBearer={bearer}
                  alt={x.type}
                  className="mt-2 w-full max-w-md"
                />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
