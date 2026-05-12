"use client";

import { Button } from "@/components/salom/Button";
import { toErrorMessage } from "@/lib/toErrorMessage";
import { SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import { useSalomAdminAuthRefetch } from "@/lib/useSalomAdminAuthRefetch";
import Link from "next/link";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type Row = {
  id: string;
  phone: string;
  firstName?: string | null;
  lastName?: string | null;
  accountStatus: string;
  onboardingStatus: string;
  operationalStatus: string;
  balanceUzs: string;
  zone: { name: string; slug?: string } | null;
  primaryVehicle: { plate: string; makeModel: string } | null;
};

type ZoneOpt = { id: string; name: string };

type CreatedDriver = {
  driverId: string;
  phone: string;
  activationCode: string;
  firstName?: string | null;
  lastName?: string | null;
  zone?: { name: string; slug?: string } | null;
};

type CreateDriverForm = {
  phone: string;
  firstName: string;
  lastName: string;
  serviceZoneId: string;
  balanceUzs: string;
  activationCode: string;
  passportSeries: string;
  passportNumber: string;
  vehiclePlate: string;
  vehiclePlateRegionCode: string;
  vehicleMakeModel: string;
  vehicleColor: string;
};

function driverDisplayName(r: Row): string {
  const n = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim();
  return n || "—";
}

function onboardingUz(s: string): string {
  const m: Record<string, string> = {
    DRAFT: "Qoralama",
    SUBMITTED: "Yuborilgan",
    UNDER_REVIEW: "Ko‘rib chiqilmoqda",
    APPROVED: "Tasdiqlangan",
    REJECTED: "Rad etilgan",
  };
  return m[s] ?? s;
}

export function AdminDriversTable({ title = "Haydovchilar" }: { title?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [zones, setZones] = useState<ZoneOpt[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [createdDriver, setCreatedDriver] = useState<CreatedDriver | null>(null);
  const [createForm, setCreateForm] = useState<CreateDriverForm>({
    phone: "",
    firstName: "",
    lastName: "",
    serviceZoneId: "",
    balanceUzs: "0",
    activationCode: "",
    passportSeries: "",
    passportNumber: "",
    vehiclePlate: "",
    vehiclePlateRegionCode: "",
    vehicleMakeModel: "",
    vehicleColor: "",
  });
  const [q, setQ] = useState("");
  const qRef = useRef(q);
  qRef.current = q;
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [zoneFilter, setZoneFilter] = useState("");
  const [onboardingFilter, setOnboardingFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(`${SALOM_API_URL}/api/v1/admin/zones`, { headers: getAdminRequestHeaders() });
        if (!r.ok) throw new Error(await r.text());
        const raw = (await r.json()) as unknown;
        if (cancelled) return;
        setZones(Array.isArray(raw) ? (raw as ZoneOpt[]) : []);
      } catch {
        if (!cancelled) setZones([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const u = new URL(`${SALOM_API_URL}/api/v1/admin/drivers`);
      u.searchParams.set("take", "50");
      u.searchParams.set("skip", "0");
      const qu = qRef.current.trim();
      if (qu) u.searchParams.set("q", qu);
      if (zoneFilter.trim()) u.searchParams.set("zoneId", zoneFilter.trim());
      if (onboardingFilter.trim()) u.searchParams.set("onboardingStatus", onboardingFilter.trim());
      const r = await fetch(u.toString(), { headers: getAdminRequestHeaders() });
      if (!r.ok) throw new Error(await r.text());
      const j = (await r.json()) as { total?: number; items?: unknown };
      setTotal(typeof j.total === "number" ? j.total : 0);
      setRows(Array.isArray(j.items) ? (j.items as Row[]) : []);
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setLoading(false);
    }
  }, [zoneFilter, onboardingFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useSalomAdminAuthRefetch(() => void load());

  const deleteDriver = async (driverId: string, phone: string) => {
    if (
      !window.confirm(
        `Haydovchini o‘chirish: ${phone}\n\nTrip tarixi bo‘lsa rad etiladi. Davom etasizmi?`,
      )
    ) {
      return;
    }
    setDeletingId(driverId);
    setErr(null);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/drivers/${encodeURIComponent(driverId)}`, {
        method: "DELETE",
        headers: getAdminRequestHeaders(),
      });
      if (!r.ok) throw new Error(await r.text());
      await load();
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setDeletingId(null);
    }
  };

  const createDriver = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setCreatedDriver(null);

    const phone = createForm.phone.trim();
    if (!phone) {
      setErr("Telefon raqam kiritilishi shart");
      return;
    }

    const activationCode = createForm.activationCode.trim();
    if (activationCode && !/^\d{12}$/.test(activationCode)) {
      setErr("12 xonali kod faqat raqamlardan iborat bo‘lishi kerak");
      return;
    }

    const balanceRaw = createForm.balanceUzs.trim().replace(/[^\d]/g, "");
    const balanceUzs = balanceRaw ? Number(balanceRaw) : 0;
    if (!Number.isSafeInteger(balanceUzs) || balanceUzs < 0) {
      setErr("Boshlang‘ich balans 0 yoki undan katta butun son bo‘lishi kerak");
      return;
    }

    const payload: {
      phone: string;
      firstName?: string;
      lastName?: string;
      serviceZoneId?: string;
      balanceUzs?: number;
      activationCode?: string;
      passportSeries?: string;
      passportNumber?: string;
      vehicle?: {
        plate: string;
        plateRegionCode?: string;
        makeModel: string;
        color?: string;
      };
    } = { phone, balanceUzs };
    const firstName = createForm.firstName.trim();
    const lastName = createForm.lastName.trim();
    const serviceZoneId = createForm.serviceZoneId.trim();
    if (firstName) payload.firstName = firstName;
    if (lastName) payload.lastName = lastName;
    if (serviceZoneId) payload.serviceZoneId = serviceZoneId;
    if (activationCode) payload.activationCode = activationCode;

    const ps = createForm.passportSeries.trim();
    const pn = createForm.passportNumber.trim();
    if (ps) payload.passportSeries = ps;
    if (pn) payload.passportNumber = pn;

    const vp = createForm.vehiclePlate.trim();
    const vm = createForm.vehicleMakeModel.trim();
    if (vp && vm) {
      const rc = createForm.vehiclePlateRegionCode.trim();
      payload.vehicle = {
        plate: vp,
        makeModel: vm,
        ...(rc.match(/^\d{2}$/) ? { plateRegionCode: rc } : {}),
        ...(createForm.vehicleColor.trim() ? { color: createForm.vehicleColor.trim() } : {}),
      };
    }

    setCreating(true);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/drivers`, {
        method: "POST",
        headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = (await r.json()) as CreatedDriver;
      setCreatedDriver(j);
      setCreateForm((prev) => ({
        phone: "",
        firstName: "",
        lastName: "",
        serviceZoneId: prev.serviceZoneId,
        balanceUzs: prev.balanceUzs,
        activationCode: "",
        passportSeries: "",
        passportNumber: "",
        vehiclePlate: "",
        vehiclePlateRegionCode: "",
        vehicleMakeModel: "",
        vehicleColor: "",
      }));
      await load();
    } catch (error) {
      if (error instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(error, "xato"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <form onSubmit={(e) => void createDriver(e)} className="rounded-xl border border-lime-200 bg-lime-50/70 p-3">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Yangi haydovchi qo‘shish</h2>
            <p className="mt-0.5 text-[11px] text-slate-600">
              Admin yaratgan haydovchi darhol tasdiqlanadi va 12 xonali kod bilan ilovaga kiradi.
            </p>
          </div>
          <Button type="submit" className="!text-xs" disabled={creating}>
            {creating ? "Yaratilmoqda…" : "Haydovchi yaratish"}
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <label className="lg:col-span-2">
            <span className="text-[10px] font-medium text-slate-600">Telefon</span>
            <input
              className="mt-1 w-full rounded-lg border border-lime-200 bg-white px-2 py-1.5 text-sm"
              value={createForm.phone}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+998901234567"
            />
          </label>
          <label>
            <span className="text-[10px] font-medium text-slate-600">Ism</span>
            <input
              className="mt-1 w-full rounded-lg border border-lime-200 bg-white px-2 py-1.5 text-sm"
              value={createForm.firstName}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, firstName: e.target.value }))}
              placeholder="Otabek"
            />
          </label>
          <label>
            <span className="text-[10px] font-medium text-slate-600">Familiya</span>
            <input
              className="mt-1 w-full rounded-lg border border-lime-200 bg-white px-2 py-1.5 text-sm"
              value={createForm.lastName}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, lastName: e.target.value }))}
              placeholder="Tuychiev"
            />
          </label>
          <label>
            <span className="text-[10px] font-medium text-slate-600">Zona</span>
            <select
              className="mt-1 w-full rounded-lg border border-lime-200 bg-white px-2 py-1.5 text-sm"
              value={createForm.serviceZoneId}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, serviceZoneId: e.target.value }))}
            >
              <option value="">Tanlanmagan</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-[10px] font-medium text-slate-600">Boshlang‘ich balans</span>
            <input
              className="mt-1 w-full rounded-lg border border-lime-200 bg-white px-2 py-1.5 text-sm"
              inputMode="numeric"
              value={createForm.balanceUzs}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, balanceUzs: e.target.value }))}
              placeholder="100000"
            />
          </label>
          <label className="lg:col-span-2">
            <span className="text-[10px] font-medium text-slate-600">12 xonali kod (ixtiyoriy)</span>
            <input
              className="mt-1 w-full rounded-lg border border-lime-200 bg-white px-2 py-1.5 font-mono text-sm"
              inputMode="numeric"
              maxLength={12}
              value={createForm.activationCode}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, activationCode: e.target.value }))}
              placeholder="Bo‘sh qoldirilsa auto"
            />
          </label>
          <label>
            <span className="text-[10px] font-medium text-slate-600">Pasport seriyasi</span>
            <input
              className="mt-1 w-full rounded-lg border border-lime-200 bg-white px-2 py-1.5 text-sm font-mono uppercase"
              value={createForm.passportSeries}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, passportSeries: e.target.value }))}
              placeholder="AA"
            />
          </label>
          <label>
            <span className="text-[10px] font-medium text-slate-600">Pasport raqami</span>
            <input
              className="mt-1 w-full rounded-lg border border-lime-200 bg-white px-2 py-1.5 text-sm font-mono"
              value={createForm.passportNumber}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, passportNumber: e.target.value }))}
              placeholder="1234567"
            />
          </label>
          <label>
            <span className="text-[10px] font-medium text-slate-600">Davlat raqami (ixtiyoriy)</span>
            <input
              className="mt-1 w-full rounded-lg border border-lime-200 bg-white px-2 py-1.5 font-mono text-sm"
              value={createForm.vehiclePlate}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, vehiclePlate: e.target.value }))}
              placeholder="01 A 123 BC"
            />
          </label>
          <label>
            <span className="text-[10px] font-medium text-slate-600">Viloyat kodi</span>
            <input
              className="mt-1 w-full rounded-lg border border-lime-200 bg-white px-2 py-1.5 font-mono text-sm"
              inputMode="numeric"
              maxLength={2}
              value={createForm.vehiclePlateRegionCode}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, vehiclePlateRegionCode: e.target.value }))}
              placeholder="01"
            />
          </label>
          <label className="lg:col-span-2">
            <span className="text-[10px] font-medium text-slate-600">Model (transport bilan)</span>
            <input
              className="mt-1 w-full rounded-lg border border-lime-200 bg-white px-2 py-1.5 text-sm"
              value={createForm.vehicleMakeModel}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, vehicleMakeModel: e.target.value }))}
              placeholder="Chevrolet Cobalt"
            />
          </label>
          <label>
            <span className="text-[10px] font-medium text-slate-600">Rang</span>
            <input
              className="mt-1 w-full rounded-lg border border-lime-200 bg-white px-2 py-1.5 text-sm"
              value={createForm.vehicleColor}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, vehicleColor: e.target.value }))}
              placeholder="Oq"
            />
          </label>
        </div>
        {createdDriver && (
          <div className="mt-3 rounded-lg border border-lime-300 bg-white px-3 py-2 text-xs text-slate-800">
            <span className="font-semibold">Yaratildi:</span> {createdDriver.phone} ·{" "}
            <span className="font-semibold">12 xonali kod:</span>{" "}
            <span className="font-mono text-sm font-bold text-lime-700">{createdDriver.activationCode}</span>
          </div>
        )}
      </form>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="min-w-[10rem] sm:col-span-2">
          <span className="text-[10px] font-medium text-slate-500">
            Qidiruv (telefon, ism, raqam plastik, shah nomi/slug)
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load()}
            placeholder="masalan G‘allaorol yoki galaorol-seed"
          />
        </label>
        <label>
          <span className="text-[10px] font-medium text-slate-500">Zona</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
          >
            <option value="">Hammasi</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-[10px] font-medium text-slate-500">Onboarding holati</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={onboardingFilter}
            onChange={(e) => setOnboardingFilter(e.target.value)}
          >
            <option value="">Hammasi</option>
            <option value="DRAFT">Qoralama</option>
            <option value="SUBMITTED">Yuborilgan</option>
            <option value="UNDER_REVIEW">Ko‘rib chiqilmoqda</option>
            <option value="APPROVED">Tasdiqlangan</option>
            <option value="REJECTED">Rad etilgan</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
          Yangilash
        </Button>
      </div>
      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900" role="alert">
          {err}
        </div>
      )}
      <p className="text-xs text-slate-500">
        {title} · jami {total}
        {loading ? " · yuklanmoqda…" : ""}
      </p>
      <div className="overflow-x-auto rounded-xl border border-violet-200/80 bg-white">
        <table className="w-full min-w-[820px] border-collapse text-left text-xs">
          <thead className="border-b border-violet-200 bg-violet-50/80 text-[10px] font-bold uppercase text-violet-800">
            <tr>
              <th className="px-2 py-2">Ism</th>
              <th className="px-2 py-2">Ariza</th>
              <th className="px-2 py-2">Hisob holati</th>
              <th className="px-2 py-2">Telefon</th>
              <th className="px-2 py-2">Operatsion</th>
              <th className="px-2 py-2">Zona</th>
              <th className="px-2 py-2">Mashina</th>
              <th className="px-2 py-2">Balans</th>
              <th className="px-2 py-2" colSpan={2} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-left text-slate-600">
                  <p className="font-medium text-slate-800">Hech narsa chiqmadi.</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-slate-600">
                    <li>Filtrlarni tekshiring (zona yoki onboarding bo‘yicha).</li>
                    <li>
                      Shah bo‘yicha qidirsangiz, nom yoki zona slug yozing (misol: «Gallaorol», «gallaorol», «slug»).
                    </li>
                    <li>Admin JWT tugmasidan foydalanganligingizni tekshiring (401)</li>
                  </ul>
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-violet-50/40">
                <td className="max-w-[8rem] truncate px-2 py-1.5">{driverDisplayName(r)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-[10px]">{onboardingUz(r.onboardingStatus)}</td>
                <td className="px-2 py-1.5 font-mono text-[10px]">{r.accountStatus}</td>
                <td className="px-2 py-1.5 font-mono">{r.phone}</td>
                <td className="px-2 py-1.5">{r.operationalStatus}</td>
                <td className="max-w-[7rem] truncate px-2 py-1.5">{r.zone?.name ?? "—"}</td>
                <td className="max-w-[9rem] truncate px-2 py-1.5">
                  {r.primaryVehicle ? `${r.primaryVehicle.plate} · ${r.primaryVehicle.makeModel}` : "—"}
                </td>
                <td className="px-2 py-1.5 font-mono">{r.balanceUzs}</td>
                <td className="px-2 py-1.5">
                  <Link className="font-semibold text-violet-800 underline" href={`/admin/drivers/${r.id}`}>
                    Profil
                  </Link>
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    className="text-[11px] font-medium text-rose-700 underline disabled:opacity-50"
                    disabled={deletingId === r.id}
                    onClick={() => void deleteDriver(r.id, r.phone)}
                  >
                    O‘chirish
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
