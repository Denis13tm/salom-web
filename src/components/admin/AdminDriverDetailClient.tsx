"use client";

import { AuthedDocImage } from "@/components/salom/AuthedDocImage";
import { Button } from "@/components/salom/Button";
import { toErrorMessage } from "@/lib/toErrorMessage";
import { SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type DriverDetail = {
  id: string;
  operationalStatus: string;
  balanceUzs: string;
  payoutIban: string | null;
  payoutAccountName: string | null;
  onboardingStatus?: string;
  firstName?: string | null;
  lastName?: string | null;
  passportOrId?: string | null;
  passportSeries?: string | null;
  passportNumber?: string | null;
  activationCode?: string | null;
  needsAppActivation?: boolean;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  user: { phone: string; status: string; lastLoginAt: string | null; createdAt: string };
  serviceZone: { name: string; slug: string } | null;
  vehicles: { id: string; plate: string; plateRegionCode?: string | null; makeModel: string; year?: number | null; color?: string | null; isActive: boolean }[];
  documents: { id: string; type: string; status: string; createdAt: string }[];
  recentTrips: {
    id: string;
    status: string;
    grossUzs?: string | null;
    commissionUzs?: string | null;
    netUzs?: string | null;
    order: { customerPhone: string; status: string; pickupLandmark?: string | null } | null;
  }[];
  recentEarnings: {
    id: string;
    type: string;
    amountUzs: string;
    balanceAfterUzs?: string | null;
    createdAt: string;
    note?: string | null;
  }[];
  financeSummary?: {
    walletStatus: string;
    minRequiredUzs: string;
    lowBalanceThresholdUzs: string;
    topUpUzs: string;
    commissionDebitedUzs: string;
    payoutOutUzs: string;
    adjustmentNetUzs: string;
    debtUzs: string;
    platformCommissionBps?: number;
  };
  balanceReconciliation?: {
    cachedBalanceUzs: string;
    ledgerBalanceUzs: string;
    driftUzs: string;
    ok: boolean;
  };
  stats: { ordersTotal: number; tripsTotal: number };
};

const DOC_TYPES = [
  "LICENSE_FRONT",
  "LICENSE_BACK",
  "LICENSE_HOLD",
  "LICENSE",
  "VEHICLE_REG",
  "PHOTO",
  "OTHER",
] as const;

function moneyText(v: string | number | null | undefined) {
  const n = typeof v === "number" ? v : Number(String(v ?? "0").replace(/,/g, ""));
  if (!Number.isFinite(n)) return String(v ?? "0");
  return new Intl.NumberFormat("en-US").format(n);
}

async function fetchDriver(id: string): Promise<DriverDetail> {
  const r = await fetch(`${SALOM_API_URL}/api/v1/admin/drivers/${id}`, { headers: getAdminRequestHeaders() });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<DriverDetail>;
}

export function AdminDriverDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [d, setD] = useState<DriverDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [tab, setTab] = useState<"overview" | "finance" | "trips" | "documents">("overview");
  const [docUploadBusy, setDocUploadBusy] = useState(false);
  const [docDeleteBusy, setDocDeleteBusy] = useState<string | null>(null);
  const [docKind, setDocKind] = useState<string>("LICENSE_FRONT");
  const fileRef = useRef<HTMLInputElement>(null);
  const [vehPlate, setVehPlate] = useState("");
  const [vehRegion, setVehRegion] = useState("");
  const [vehModel, setVehModel] = useState("");
  const [vehColor, setVehColor] = useState("");
  const [vehYear, setVehYear] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [newRegion, setNewRegion] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newYear, setNewYear] = useState("");
  const [vehBusy, setVehBusy] = useState(false);
  const [editVid, setEditVid] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const next = await fetchDriver(id);
      setD(next);
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (path: "approve" | "suspend" | "under-review" | "reject") => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/drivers/${id}/${path}`, {
        method: "POST",
        headers: { ...getAdminRequestHeaders(), ...(path === "reject" ? { "Content-Type": "application/json" } : {}) },
        body: path === "reject" ? JSON.stringify({ reason: rejectReason.trim() || "Rad" }) : "{}",
      });
      if (!r.ok) throw new Error(await r.text());
      await load();
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!d) return;
    if (
      !window.confirm(
        `Hisobni butunlay o‘chirish: ${d.user.phone}\nSafarlar: ${d.stats.tripsTotal}. Trip bo‘lsa API rad qiladi. Davom?`,
      )
    ) {
      return;
    }
    setDeleteBusy(true);
    setErr(null);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/drivers/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: getAdminRequestHeaders(),
      });
      if (!r.ok) throw new Error(await r.text());
      router.push("/admin/drivers");
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setDeleteBusy(false);
    }
  };

  const uploadDriverDoc = async (file: File) => {
    setDocUploadBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", docKind);
      const headers = { ...getAdminRequestHeaders() };
      delete headers["Content-Type"];
      const r = await fetch(
        `${SALOM_API_URL}/api/v1/admin/drivers/${encodeURIComponent(id)}/documents/upload`,
        {
          method: "POST",
          headers,
          body: fd,
        },
      );
      if (!r.ok) throw new Error(await r.text());
      await load();
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setDocUploadBusy(false);
    }
  };

  const deleteDriverDoc = async (docId: string) => {
    if (!window.confirm("Bu hujjatni o‘chirish?")) return;
    setDocDeleteBusy(docId);
    setErr(null);
    try {
      const r = await fetch(
        `${SALOM_API_URL}/api/v1/admin/drivers/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}`,
        { method: "DELETE", headers: getAdminRequestHeaders() },
      );
      if (!r.ok) throw new Error(await r.text());
      await load();
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setDocDeleteBusy(null);
    }
  };

  if (err && !d) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
        {err}
      </div>
    );
  }
  if (!d) return <p className="text-sm text-slate-500">Yuklanmoqda…</p>;

  const onboarding = d.onboardingStatus ?? "";
  const accSuspended = d.user.status === "SUSPENDED";
  const isApproved = onboarding === "APPROVED";
  /** Ariza tasdiqlangan, hisob bloklanmagan — faqat to‘xtatish. */
  const showSuspendApproved = isApproved && !accSuspended;
  /** Yuborilgan yoki tekshiruvda — klasik tasdiq oqimi */
  const inApplicationPipeline =
    onboarding === "SUBMITTED" || onboarding === "UNDER_REVIEW";
  /** SUBMITTED → UNDER_REVIEW (API boshqa holatda rad qiladi) */
  const showUnderReview = onboarding === "SUBMITTED";
  /** Ariza uchun tasdiqlash yoki bloklangan tasdiqlangan haydovchini qayta faollashtirish */
  const showApprovePrimary = inApplicationPipeline || (isApproved && accSuspended);
  const approvePrimaryLabel =
    isApproved && accSuspended
      ? "Qayta tasdiqlash (hisobni qayta faollashtirish + kod)"
      : "Ariza: tasdiqlash + 12 raqamli kod";

  return (
    <div className="space-y-6 text-sm">
      {err && (
        <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs" role="status">
          {err}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {showApprovePrimary && (
          <Button type="button" className="!text-xs" disabled={busy} onClick={() => void act("approve")}>
            {approvePrimaryLabel}
          </Button>
        )}
        {showUnderReview && (
          <Button type="button" variant="secondary" className="!text-xs" disabled={busy} onClick={() => void act("under-review")}>
            Ko‘rib chiqilmoqda
          </Button>
        )}
        {showSuspendApproved && (
          <Button type="button" variant="danger" className="!text-xs" disabled={busy} onClick={() => void act("suspend")}>
            To‘xtatish (SUSPENDED)
          </Button>
        )}
        <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
          Yangilash
        </Button>
        <Link
          href={`/admin/chat?driver=${encodeURIComponent(id)}`}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
        >
          Chatni ochish
        </Link>
        <Button
          type="button"
          variant="danger"
          className="!text-xs"
          disabled={deleteBusy || busy}
          onClick={() => void deleteAccount()}
        >
          {deleteBusy ? "…" : "Hisobni o‘chirish"}
        </Button>
        <Link href="/admin/drivers" className="text-xs font-medium text-violet-800 underline">
          ← Ro‘yxat
        </Link>
      </div>
      {inApplicationPipeline && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] text-slate-600">
            Rad etish sababi
            <input
              className="mt-0.5 block w-64 max-w-full rounded border border-slate-200 px-2 py-1 text-xs"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="qisqa izoh"
            />
          </label>
          <Button type="button" variant="danger" className="!text-xs" disabled={busy} onClick={() => void act("reject")}>
            Rad etish
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-xl border border-violet-100 bg-violet-50/40 p-1">
        {[
          ["overview", "Overview"],
          ["finance", "Finance"],
          ["trips", "Trips"],
          ["documents", "Documents"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              tab === key ? "bg-white text-violet-900 shadow-sm" : "text-slate-600 hover:bg-white/70"
            }`}
            onClick={() => setTab(key as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-violet-200 bg-white p-3">
          <h3 className="text-xs font-bold uppercase text-violet-800">Aloqa</h3>
          <p className="mt-1 font-mono text-slate-900">{d.user.phone}</p>
          <p className="text-xs text-slate-500">Hisob: {d.user.status}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-white p-3">
          <h3 className="text-xs font-bold uppercase text-violet-800">Status</h3>
          <p className="mt-1">{d.operationalStatus}</p>
          <p className="text-xs text-slate-500">Zona: {d.serviceZone?.name ?? "—"}</p>
          {d.onboardingStatus && (
            <p className="mt-1 text-xs text-violet-900">
              Ariza: <span className="font-mono">{d.onboardingStatus}</span>
              {d.needsAppActivation ? " · ilova kutilmoqda" : ""}
            </p>
          )}
          {(d.firstName || d.lastName) && (
            <p className="text-xs text-slate-600">
              {d.firstName} {d.lastName}{" "}
              {(d.passportSeries || d.passportNumber) && (
                <span className="font-mono">
                  · pasport {d.passportSeries ?? ""} {d.passportNumber ?? ""}
                </span>
              )}
              {!d.passportSeries && !d.passportNumber && d.passportOrId ? `· ${d.passportOrId}` : ""}
            </p>
          )}
          {d.activationCode && (
            <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 font-mono text-xs">
              12 xonali kod: {d.activationCode}
            </p>
          )}
          {d.rejectionReason && <p className="mt-1 text-xs text-rose-700">Rad: {d.rejectionReason}</p>}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase text-slate-500">Transportlar</h3>
        <ul className="mt-1 space-y-2">
          {d.vehicles.length === 0 && <li className="text-slate-500">—</li>}
          {d.vehicles.map((v) => (
            <li
              key={v.id}
              className="rounded border border-slate-100 bg-slate-50 px-2 py-2 text-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="font-mono">
                  <span className="text-slate-800">
                    {v.plateRegionCode ? `${v.plateRegionCode} ` : ""}
                    {v.plate}
                  </span>
                  <span className="text-slate-600"> · {v.makeModel}</span>
                  {v.color ? <span className="text-slate-500"> · {v.color}</span> : null}
                  {v.year ? <span className="text-slate-500"> · {v.year}</span> : null}
                  {!v.isActive ? <span className="text-rose-600"> (o‘chirilgan)</span> : null}
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    className="!text-[11px]"
                    disabled={vehBusy}
                    onClick={() => {
                      setEditVid(editVid === v.id ? null : v.id);
                      setVehPlate(v.plate);
                      setVehRegion(v.plateRegionCode ?? "");
                      setVehModel(v.makeModel);
                      setVehColor(v.color ?? "");
                      setVehYear(v.year != null ? String(v.year) : "");
                    }}
                  >
                    {editVid === v.id ? "Yopish" : "Tahrir"}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="!text-[11px]"
                    disabled={vehBusy || !v.isActive}
                    onClick={() => {
                      if (!window.confirm("Transportni ro‘yxatdan olib tashlash (soft)?")) return;
                      setVehBusy(true);
                      void (async () => {
                        try {
                          const r = await fetch(
                            `${SALOM_API_URL}/api/v1/admin/drivers/${encodeURIComponent(id)}/vehicles/${encodeURIComponent(v.id)}`,
                            { method: "DELETE", headers: getAdminRequestHeaders() },
                          );
                          if (!r.ok) throw new Error(await r.text());
                          await load();
                        } catch (e) {
                          setErr(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "xato"));
                        } finally {
                          setVehBusy(false);
                        }
                      })();
                    }}
                  >
                    O‘chirish
                  </Button>
                </div>
              </div>
              {editVid === v.id && (
                <div className="mt-2 grid gap-2 border-t border-slate-200 pt-2 sm:grid-cols-2 lg:grid-cols-6">
                  <label className="text-[10px] text-slate-600">
                    Raqam
                    <input
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 font-mono"
                      value={vehPlate}
                      onChange={(e) => setVehPlate(e.target.value)}
                    />
                  </label>
                  <label className="text-[10px] text-slate-600">
                    Viloyat kodi
                    <input
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 font-mono"
                      maxLength={2}
                      value={vehRegion}
                      onChange={(e) => setVehRegion(e.target.value)}
                    />
                  </label>
                  <label className="text-[10px] text-slate-600 lg:col-span-2">
                    Model
                    <input
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1"
                      value={vehModel}
                      onChange={(e) => setVehModel(e.target.value)}
                    />
                  </label>
                  <label className="text-[10px] text-slate-600">
                    Rang
                    <input
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1"
                      value={vehColor}
                      onChange={(e) => setVehColor(e.target.value)}
                    />
                  </label>
                  <label className="text-[10px] text-slate-600">
                    Yil
                    <input
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1"
                      inputMode="numeric"
                      value={vehYear}
                      onChange={(e) => setVehYear(e.target.value)}
                    />
                  </label>
                  <div className="flex items-end lg:col-span-6">
                    <Button
                      type="button"
                      className="!text-xs"
                      disabled={vehBusy}
                      onClick={() => {
                        setVehBusy(true);
                        void (async () => {
                          try {
                            const yearRaw = vehYear.trim();
                            const yearNum =
                              yearRaw && !Number.isNaN(Number(yearRaw)) ? parseInt(yearRaw, 10) : undefined;
                            const rc = vehRegion.trim();
                            const body: Record<string, unknown> = {
                              plate: vehPlate.trim(),
                              makeModel: vehModel.trim(),
                              color: vehColor.trim() || null,
                              plateRegionCode: rc.match(/^\d{2}$/) ? rc : null,
                            };
                            if (yearNum !== undefined && Number.isFinite(yearNum)) body.year = yearNum;
                            const r = await fetch(
                              `${SALOM_API_URL}/api/v1/admin/drivers/${encodeURIComponent(id)}/vehicles/${encodeURIComponent(v.id)}`,
                              {
                                method: "PATCH",
                                headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
                                body: JSON.stringify(body),
                              },
                            );
                            if (!r.ok) throw new Error(await r.text());
                            setEditVid(null);
                            await load();
                          } catch (e) {
                            setErr(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "xato"));
                          } finally {
                            setVehBusy(false);
                          }
                        })();
                      }}
                    >
                      Saqlash
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white p-3">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Yangi transport</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <label className="text-[10px] text-slate-600">
              Davlat raqami
              <input
                className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value)}
                placeholder="01 A 123 BC"
              />
            </label>
            <label className="text-[10px] text-slate-600">
              Viloyat kodi
              <input
                className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                maxLength={2}
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                placeholder="01"
              />
            </label>
            <label className="text-[10px] text-slate-600 lg:col-span-2">
              Model
              <input
                className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
              />
            </label>
            <label className="text-[10px] text-slate-600">
              Rang
              <input
                className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
              />
            </label>
            <label className="text-[10px] text-slate-600">
              Yil
              <input
                className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                inputMode="numeric"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
              />
            </label>
          </div>
          <Button
            type="button"
            className="!mt-2 !text-xs"
            disabled={vehBusy || !newPlate.trim() || !newModel.trim()}
            onClick={() => {
              setVehBusy(true);
              void (async () => {
                try {
                  const yearRaw = newYear.trim();
                  const yearNum =
                    yearRaw && !Number.isNaN(Number(yearRaw)) ? parseInt(yearRaw, 10) : undefined;
                  const rc = newRegion.trim();
                  const r = await fetch(
                    `${SALOM_API_URL}/api/v1/admin/drivers/${encodeURIComponent(id)}/vehicles`,
                    {
                      method: "POST",
                      headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
                      body: JSON.stringify({
                        plate: newPlate.trim(),
                        makeModel: newModel.trim(),
                        color: newColor.trim() || null,
                        year: yearNum,
                        plateRegionCode: rc.match(/^\d{2}$/) ? rc : null,
                      }),
                    },
                  );
                  if (!r.ok) throw new Error(await r.text());
                  setNewPlate("");
                  setNewRegion("");
                  setNewModel("");
                  setNewColor("");
                  setNewYear("");
                  await load();
                } catch (e) {
                  setErr(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "xato"));
                } finally {
                  setVehBusy(false);
                }
              })();
            }}
          >
            Qoʻshish
          </Button>
        </div>
      </section>
        </>
      )}

      {tab === "documents" && (
      <section>
        <h3 className="text-xs font-bold uppercase text-slate-500">Hujjatlar</h3>
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-violet-100 bg-violet-50/40 p-3">
          <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase text-slate-500">
            Tur
            <select
              value={docKind}
              onChange={(e) => setDocKind(e.target.value)}
              className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800"
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadDriverDoc(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            disabled={docUploadBusy}
            onClick={() => fileRef.current?.click()}
          >
            {docUploadBusy ? "Yuklanmoqda…" : "Rasm yuklash"}
          </Button>
        </div>
        <ul className="mt-3 space-y-3 text-xs">
          {d.documents.length === 0 && <li className="text-slate-500">—</li>}
          {d.documents.map((x) => (
            <li key={x.id} className="rounded-lg border border-violet-100 bg-white p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-800">
                  {x.type} · {x.status}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="!text-[11px]"
                  disabled={docDeleteBusy === x.id}
                  onClick={() => void deleteDriverDoc(x.id)}
                >
                  {docDeleteBusy === x.id ? "…" : "O‘chirish"}
                </Button>
              </div>
              <AuthedDocImage
                href={`${SALOM_API_URL}/api/v1/admin/drivers/${encodeURIComponent(id)}/documents/${encodeURIComponent(x.id)}/file`}
                mode="admin"
                alt={x.type}
                className="mt-2 w-full max-w-md"
              />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-slate-400">
          Rasmlarni administrator bevosita yuklashi yoki o‘chirishi mumkin (JWT).
        </p>
      </section>
      )}

      {tab === "trips" && (
      <section>
        <h3 className="text-xs font-bold uppercase text-slate-500">So‘nggi turlar</h3>
        <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto text-xs">
          {d.recentTrips.map((t) => (
            <li key={t.id} className="flex justify-between gap-2 border-b border-slate-100 py-0.5">
              <span>
                {t.status}
                <span className="ml-2 text-slate-500">{t.order?.pickupLandmark ?? t.order?.customerPhone}</span>
              </span>
              <span className="font-mono text-slate-700">
                {t.grossUzs ? `${moneyText(t.grossUzs)} so'm` : "—"}
              </span>
            </li>
          ))}
        </ul>
      </section>
      )}

      {tab === "finance" && (
      <section>
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          {[
            ["Balans", d.balanceUzs],
            ["Top-up", d.financeSummary?.topUpUzs ?? "0"],
            ["Komissiya", d.financeSummary?.commissionDebitedUzs ?? "0"],
            ["Payout", d.financeSummary?.payoutOutUzs ?? "0"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-violet-100 bg-white p-2">
              <p className="text-[10px] uppercase text-slate-500">{k}</p>
              <p className="font-mono font-semibold">{moneyText(v)}</p>
            </div>
          ))}
        </div>
        {d.balanceReconciliation && !d.balanceReconciliation.ok && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Reconciliation warning: cached {moneyText(d.balanceReconciliation.cachedBalanceUzs)} / ledger{" "}
            {moneyText(d.balanceReconciliation.ledgerBalanceUzs)} / drift {moneyText(d.balanceReconciliation.driftUzs)}
          </div>
        )}
        <h3 className="text-xs font-bold uppercase text-slate-500">Daromad (ledger)</h3>
        <ul className="mt-1 text-xs">
          {d.recentEarnings.map((e) => (
            <li key={e.id + e.createdAt} className="flex justify-between border-b border-slate-50 py-0.5">
              <span>
                {e.type}
                {e.note ? <span className="ml-2 text-slate-500">{e.note}</span> : null}
              </span>
              <span className="font-mono">
                {moneyText(e.amountUzs)}
                {e.balanceAfterUzs ? ` → ${moneyText(e.balanceAfterUzs)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>
      )}
    </div>
  );
}
