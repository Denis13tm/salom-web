"use client";

import { Button } from "@/components/salom/Button";
import { toErrorMessage } from "@/lib/toErrorMessage";
import { SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import { useSalomAdminAuthRefetch } from "@/lib/useSalomAdminAuthRefetch";
import { clearPublicServiceZonesCache } from "@/lib/salomServiceZones";
import { useCallback, useEffect, useState } from "react";
import { ZonePickupPricingEditor } from "@/components/admin/ZonePickupPricingEditor";

function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1${path}`, { headers: getAdminRequestHeaders() });
      if (!r.ok) throw new Error(await r.text());
      setData((await r.json()) as T);
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, err, loading, load };
}

type ZoneRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  meterBaseUzs: string | null;
  meterPerKmUzs: string | null;
};

function ZoneMeterEditor({ z, onSaved }: { z: ZoneRow; onSaved: () => void }) {
  const [base, setBase] = useState(() => (z.meterBaseUzs != null ? z.meterBaseUzs : ""));
  const [per, setPer] = useState(() => (z.meterPerKmUzs != null ? z.meterPerKmUzs : ""));
  const [saving, setSaving] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  useEffect(() => {
    setBase(z.meterBaseUzs != null ? z.meterBaseUzs : "");
    setPer(z.meterPerKmUzs != null ? z.meterPerKmUzs : "");
  }, [z.meterBaseUzs, z.meterPerKmUzs]);

  const save = async () => {
    setLocalErr(null);
    setSaving(true);
    try {
      const b = base.trim() === "" ? undefined : parseFloat(base.replace(",", "."));
      const p = per.trim() === "" ? undefined : parseFloat(per.replace(",", "."));
      if (b === undefined && p === undefined) {
        setLocalErr("Ikkala narxni kiriting yoki global narxga qaytarish uchun «Standartga».");
        return;
      }
      if ((b === undefined) !== (p === undefined)) {
        setLocalErr("Bazaviy va km ikkalasi ham to‘ldirilishi yoki ikkalasi bo‘sh qoldirilishi.");
        return;
      }
      if (b !== undefined && (Number.isNaN(b) || Number.isNaN(p!) || b < 0 || p! < 0)) {
        setLocalErr("Musbat son kiriting.");
        return;
      }
      const body = { meterBaseUzs: b, meterPerKmUzs: p };
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/zones/${z.id}/meter`, {
        method: "PATCH",
        headers: getAdminRequestHeaders(),
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "xato"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-xs">
      <p className="text-[10px] text-slate-500">
        METER: ikkalasi to‘ldirilsa, global narx o‘rnida shu zona ishlatiladi. Bo‘sh + «Standartga» = global env.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-500">Boshlangʻich (soʻm)</span>
          <input
            className="w-28 rounded border px-1.5 py-1 font-mono"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            inputMode="decimal"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-500">Km narxi (soʻm)</span>
          <input
            className="w-28 rounded border px-1.5 py-1 font-mono"
            value={per}
            onChange={(e) => setPer(e.target.value)}
            inputMode="decimal"
          />
        </label>
        <Button type="button" className="!text-xs" disabled={saving} onClick={() => void save()}>
          {saving ? "…" : "Saqlash"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="!text-xs"
          disabled={saving}
          onClick={() => {
            setBase("");
            setPer("");
            void (async () => {
              setSaving(true);
              setLocalErr(null);
              try {
                const r = await fetch(`${SALOM_API_URL}/api/v1/admin/zones/${z.id}/meter`, {
                  method: "PATCH",
                  headers: getAdminRequestHeaders(),
                  body: JSON.stringify({ clearMeter: true }),
                });
                if (!r.ok) throw new Error(await r.text());
                onSaved();
              } catch (e) {
                setLocalErr(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "xato"));
              } finally {
                setSaving(false);
              }
            })();
          }}
        >
          Standartga
        </Button>
      </div>
      {localErr && <p className="text-[10px] text-rose-700">{localErr}</p>}
    </div>
  );
}

export function AdminZonesView() {
  const { data, err, load } = useLoad<ZoneRow[]>("/admin/zones");
  const [zName, setZName] = useState("");
  const [zSlug, setZSlug] = useState("");
  const [zLat, setZLat] = useState("");
  const [zLng, setZLng] = useState("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const fillGallaorolTemplate = () => {
    setZName("G'allaorol");
    setZSlug("gallaorol");
    setZLat("40.125");
    setZLng("67.83");
  };

  const createZone = async () => {
    setCreateErr(null);
    const name = zName.trim();
    const slug = zSlug.trim().toLowerCase();
    if (!name || !slug) {
      setCreateErr("Nom va slug majburiy.");
      return;
    }
    const latEmpty = zLat.trim() === "";
    const lngEmpty = zLng.trim() === "";
    if (latEmpty !== lngEmpty) {
      setCreateErr("Kenglik va uzunlik ikkalasi birga kiriting yoki ikkalasini ham bo‘sh qoldiring.");
      return;
    }
    const latN = latEmpty ? undefined : Number(zLat.replace(",", "."));
    const lngN = lngEmpty ? undefined : Number(zLng.replace(",", "."));
    if (latN !== undefined && (Number.isNaN(latN!) || Number.isNaN(lngN!))) {
      setCreateErr("Koordinatalar raqam bo‘lishi kerak.");
      return;
    }
    if (latN !== undefined && lngN !== undefined && (latN < -90 || latN > 90 || lngN < -180 || lngN > 180)) {
      setCreateErr("Koordinata diapazoni noto‘g‘ri.");
      return;
    }
    setCreating(true);
    try {
      const body: Record<string, unknown> = { name, slug, isActive: true };
      if (latN !== undefined && lngN !== undefined) {
        body.centerLat = latN;
        body.centerLng = lngN;
      }
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/zones`, {
        method: "POST",
        headers: getAdminRequestHeaders(),
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      clearPublicServiceZonesCache();
      setZName("");
      setZSlug("");
      setZLat("");
      setZLng("");
      await load();
    } catch (e) {
      setCreateErr(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "xato"));
    } finally {
      setCreating(false);
    }
  };

  if (err) return <ErrBox e={err} onRetry={load} />;
  if (!data) return <p className="text-xs text-slate-500">Yuklanmoqda…</p>;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-3 text-xs">
        <p className="font-semibold text-violet-900">Yangi xizmat zonasi</p>
        <p className="mt-1 text-[10px] text-slate-600">
          Slug: kichik harf, raqam, tire (masalan <span className="font-mono">gallaorol</span>). Operator xaritasi markazi uchun
          kenglik/uzunlik ixtiyoriy.
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-500">Nom</span>
            <input
              className="w-40 rounded border border-slate-200 px-2 py-1"
              value={zName}
              onChange={(e) => setZName(e.target.value)}
              placeholder="G'allaorol"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-500">Slug</span>
            <input
              className="w-36 rounded border border-slate-200 px-2 py-1 font-mono"
              value={zSlug}
              onChange={(e) => setZSlug(e.target.value)}
              placeholder="gallaorol"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-500">Kenglik</span>
            <input
              className="w-24 rounded border border-slate-200 px-2 py-1 font-mono"
              value={zLat}
              onChange={(e) => setZLat(e.target.value)}
              placeholder="40.125"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-500">Uzunlik</span>
            <input
              className="w-24 rounded border border-slate-200 px-2 py-1 font-mono"
              value={zLng}
              onChange={(e) => setZLng(e.target.value)}
              placeholder="67.83"
            />
          </label>
          <Button type="button" className="!text-xs" disabled={creating} onClick={() => void createZone()}>
            {creating ? "…" : "Qo‘shish"}
          </Button>
          <Button type="button" variant="secondary" className="!text-xs" disabled={creating} onClick={fillGallaorolTemplate}>
            G'allaorol namunasi
          </Button>
        </div>
        {createErr && <p className="mt-2 text-[11px] text-rose-700">{createErr}</p>}
      </div>
      <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
        Yangilash
      </Button>
      <ul className="space-y-2 text-sm">
        {data.map((z) => {
          const has = z.meterBaseUzs != null && z.meterPerKmUzs != null;
          return (
            <li key={z.id} className="rounded border border-slate-200 bg-white px-2 py-1.5">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-medium">{z.name}</span>
                <span className="text-xs text-slate-500">
                  {z.slug} {z.isActive ? "" : "(o‘chirilgan)"}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-slate-600">
                {has ? (
                  <>
                    {z.meterBaseUzs} + km × {z.meterPerKmUzs} (zona)
                  </>
                ) : (
                  <span>Global METER narx (env)</span>
                )}
              </p>
              <ZoneMeterEditor z={z} onSaved={() => void load()} />
              <ZonePickupPricingEditor zoneId={z.id} zoneName={z.name} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AdminOperatorsView() {
  const { data, err, load } = useLoad<
    {
      id: string;
      displayName: string;
      user: { phone: string; status: string };
      serviceZone: { id: string; name: string; slug: string } | null;
      updatedAt: string;
    }[]
  >("/admin/operators");
  const { data: zones } = useLoad<ZoneRow[]>("/admin/zones");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [opPassword, setOpPassword] = useState("");
  const [rowPwd, setRowPwd] = useState<Record<string, string>>({});
  const [zoneId, setZoneId] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const create = async () => {
    setActionErr(null);
    const pwd = opPassword.trim();
    if (pwd && pwd.length < 8) {
      setActionErr("Operator panel paroli kamida 8 belgi bo‘lishi kerak (yoki bo‘sh qoldiring va keyin «Parolni saqlash» bilan qo‘shing).");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/operators`, {
        method: "POST",
        headers: getAdminRequestHeaders(),
        body: JSON.stringify({
          displayName: name.trim(),
          phone: phone.trim(),
          serviceZoneId: zoneId || null,
          status,
          ...(pwd.length >= 8 ? { password: pwd } : {}),
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      setName("");
      setPhone("");
      setOpPassword("");
      setZoneId("");
      setStatus("ACTIVE");
      await load();
    } catch (e) {
      setActionErr(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "operator yaratish"));
    } finally {
      setSaving(false);
    }
  };

  const patch = async (
    id: string,
    body: {
      displayName?: string;
      phone?: string;
      serviceZoneId?: string | null;
      status?: string;
      password?: string;
    },
  ): Promise<boolean> => {
    setActionErr(null);
    setSaving(true);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/operators/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: getAdminRequestHeaders(),
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      await load();
      return true;
    } catch (e) {
      setActionErr(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "operator yangilash"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (id: string, action: "activate" | "suspend" | "delete") => {
    setActionErr(null);
    setSaving(true);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/operators/${encodeURIComponent(id)}${action === "delete" ? "" : `/${action}`}`, {
        method: action === "delete" ? "DELETE" : "POST",
        headers: getAdminRequestHeaders(),
      });
      if (!r.ok) throw new Error(await r.text());
      await load();
    } catch (e) {
      setActionErr(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "operator amali"));
    } finally {
      setSaving(false);
    }
  };

  if (err) return <ErrBox e={err} onRetry={load} />;
  if (!data) return <p className="text-xs">…</p>;
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-3">
        <p className="text-xs font-semibold text-violet-950">Yangi operator</p>
        <p className="mt-1 text-[11px] leading-snug text-violet-900/80">
          Operator web panelga kirishi uchun parol bering (kamida 8 belgi). Keyinroq jadvaldan ham yangilash mumkin.
        </p>
        <div className="mt-2 grid gap-2 md:grid-cols-6">
          <input
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            placeholder="Ism familiya"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs"
            placeholder="+998..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs"
            placeholder="Panel paroli (≥8)"
            type="password"
            autoComplete="new-password"
            value={opPassword}
            onChange={(e) => setOpPassword(e.target.value)}
          />
          <select
            onChange={(e) => setZoneId(e.target.value)}
          >
            <option value="">Zona tanlanmagan</option>
            {(zones ?? []).map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING_VERIFICATION">PENDING</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
          <Button type="button" className="!text-xs" disabled={saving} onClick={() => void create()}>
            Qo‘shish
          </Button>
        </div>
        {actionErr && <p className="mt-2 text-xs text-rose-700">{actionErr}</p>}
      </div>
      <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
        Yangilash
      </Button>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="border-b bg-violet-50/80 text-[10px] font-bold uppercase">
            <tr>
              <th className="px-2 py-2">Ism</th>
              <th className="px-2 py-2">Telefon</th>
              <th className="px-2 py-2">Panel paroli</th>
              <th className="px-2 py-2">Zona</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {data.map((o) => (
              <tr key={o.id} className="border-b align-top">
                <td className="px-2 py-1.5">
                  <input
                    className="w-44 rounded border border-slate-200 px-2 py-1"
                    defaultValue={o.displayName}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== o.displayName) void patch(o.id, { displayName: v });
                    }}
                  />
                  <p className="mt-1 font-mono text-[9px] text-slate-400">{o.id}</p>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="w-36 rounded border border-slate-200 px-2 py-1 font-mono"
                    defaultValue={o.user.phone}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== o.user.phone) void patch(o.id, { phone: v });
                    }}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex max-w-[200px] flex-col gap-1">
                    <input
                      type="password"
                      autoComplete="new-password"
                      className="w-full rounded border border-slate-200 px-2 py-1 text-[10px]"
                      placeholder="Yangi parol"
                      value={rowPwd[o.id] ?? ""}
                      onChange={(e) => setRowPwd((p) => ({ ...p, [o.id]: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="!text-[9px]"
                      disabled={saving}
                      onClick={() =>
                        void (async () => {
                          const p = (rowPwd[o.id] ?? "").trim();
                          if (p.length < 8) {
                            setActionErr("Parol kamida 8 belgi.");
                            return;
                          }
                          setActionErr(null);
                          const ok = await patch(o.id, { password: p });
                          if (ok) setRowPwd((prev) => ({ ...prev, [o.id]: "" }));
                        })()
                      }
                    >
                      Parolni saqlash
                    </Button>
                  </div>
                </td>
                <td className="px-2 py-1.5">
                  <select
                    className="w-44 rounded border border-slate-200 px-2 py-1"
                    value={o.serviceZone?.id ?? ""}
                    onChange={(e) => void patch(o.id, { serviceZoneId: e.target.value || null })}
                  >
                    <option value="">—</option>
                    {(zones ?? []).map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <span className={["rounded-full px-2 py-1 text-[10px] font-semibold", o.user.status === "ACTIVE" ? "bg-emerald-50 text-emerald-800" : o.user.status === "SUSPENDED" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-900"].join(" ")}>
                    {o.user.status}
                  </span>
                </td>
                <td className="space-x-1 px-2 py-1.5 whitespace-nowrap">
                  <Button type="button" variant="secondary" className="!text-[10px]" disabled={saving} onClick={() => void runAction(o.id, "activate")}>
                    Tasdiqlash
                  </Button>
                  <Button type="button" variant="secondary" className="!text-[10px]" disabled={saving} onClick={() => void runAction(o.id, "suspend")}>
                    To‘xtatish
                  </Button>
                  <Button type="button" variant="danger" className="!text-[10px]" disabled={saving} onClick={() => void runAction(o.id, "delete")}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type PayoutRow = {
  id: string;
  type?: string;
  amountUzs: string;
  balanceAfterUzs?: string | null;
  createdAt: string;
  driver: { user: { phone: string } };
  note?: string | null;
};

type BalanceRow = { id: string; balanceUzs: string; user: { phone: string; status: string } };

type FinanceLedgerRow = {
  id: string;
  driverId: string;
  type: string;
  amountUzs: string;
  balanceAfterUzs: string | null;
  createdAt: string;
  note?: string | null;
  driver: { phone: string; firstName?: string | null; lastName?: string | null; balanceUzs: string };
  order?: { pickupLandmark?: string | null; customerPhone?: string | null } | null;
};

function moneyText(v: string | number | null | undefined) {
  const n = typeof v === "number" ? v : Number(String(v ?? "0").replace(/,/g, ""));
  if (!Number.isFinite(n)) return String(v ?? "0");
  return new Intl.NumberFormat("en-US").format(n);
}

export function AdminFinanceView() {
  const { data, err, load } = useLoad<{
    windowDays: number;
    earningsNetSum30dUzs: string;
    commissionSum30dUzs: string;
    payoutSum30dUzs: number;
    totalDriverBalanceUzs: string;
  }>("/admin/finance/summary");
  const [payouts, setPayouts] = useState<PayoutRow[] | null>(null);
  const [topUps, setTopUps] = useState<PayoutRow[] | null>(null);
  const [adjustments, setAdjustments] = useState<PayoutRow[] | null>(null);
  const [balances, setBalances] = useState<BalanceRow[] | null>(null);
  const [ledger, setLedger] = useState<{ total: number; items: FinanceLedgerRow[] } | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [driverId, setDriverId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [extraErr, setExtraErr] = useState<string | null>(null);

  const loadExtras = useCallback(async () => {
    setExtraErr(null);
    try {
      const h = getAdminRequestHeaders();
      const params = new URLSearchParams({ take: "50" });
      if (q.trim()) params.set("q", q.trim());
      if (type.trim()) params.set("type", type.trim());
      if (driverId.trim()) params.set("driverId", driverId.trim());
      if (from.trim()) params.set("from", from.trim());
      if (to.trim()) params.set("to", to.trim());
      const [a, b, c, d, e] = await Promise.all([
        fetch(`${SALOM_API_URL}/api/v1/admin/finance/payouts-recent?take=30`, { headers: h }),
        fetch(`${SALOM_API_URL}/api/v1/admin/finance/top-ups-recent?take=30`, { headers: h }),
        fetch(`${SALOM_API_URL}/api/v1/admin/finance/adjustments-recent?take=30`, { headers: h }),
        fetch(`${SALOM_API_URL}/api/v1/admin/finance/balances-top?take=20`, { headers: h }),
        fetch(`${SALOM_API_URL}/api/v1/admin/finance/ledger?${params.toString()}`, { headers: h }),
      ]);
      if (!a.ok) throw new Error(await a.text());
      if (!b.ok) throw new Error(await b.text());
      if (!c.ok) throw new Error(await c.text());
      if (!d.ok) throw new Error(await d.text());
      if (!e.ok) throw new Error(await e.text());
      setPayouts((await a.json()) as PayoutRow[]);
      setTopUps((await b.json()) as PayoutRow[]);
      setAdjustments((await c.json()) as PayoutRow[]);
      setBalances((await d.json()) as BalanceRow[]);
      setLedger((await e.json()) as { total: number; items: FinanceLedgerRow[] });
    } catch (e) {
      if (e instanceof TypeError) setExtraErr(adminNetworkErrorHint());
      else setExtraErr(toErrorMessage(e, "xato"));
    }
  }, [driverId, from, q, to, type]);

  useEffect(() => {
    void loadExtras();
  }, [loadExtras]);

  useSalomAdminAuthRefetch(() => void loadExtras());

  const refreshAll = useCallback(() => {
    void load();
    void loadExtras();
  }, [load, loadExtras]);

  if (err) return <ErrBox e={err} onRetry={load} />;
  if (!data) return <p className="text-xs">…</p>;
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" className="!text-xs" onClick={refreshAll}>
          Yangilash
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="!text-xs"
          onClick={async () => {
            try {
              const r = await fetch(`${SALOM_API_URL}/api/v1/admin/finance/export/payouts-bank.csv?take=2000`, {
                headers: getAdminRequestHeaders(),
              });
              if (!r.ok) throw new Error(await r.text());
              const blob = await r.blob();
              const u = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = u;
              a.download = "salom-payouts-bank.csv";
              a.click();
              URL.revokeObjectURL(u);
            } catch (e) {
              alert(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "eksport"));
            }
          }}
        >
          CSV (bank · payoutlar)
        </Button>
      </div>
      <div className="rounded-xl border border-violet-200/80 bg-violet-50/30 p-3">
        <p className="text-xs font-bold uppercase text-slate-500">Ledger (manba)</p>
        <p className="mt-1 text-[10px] text-slate-600">
          So‘nggi payout / top-up jadvali <strong>butun tizim</strong> bo‘yicha (faqat ko‘rinish). Haydovchi tanlash:
          pastdagi &quot;Top balanslar&quot; yoki operatsion forma.
        </p>
        <div className="mt-2 grid gap-2 md:grid-cols-5">
          <input
            className="rounded border border-slate-200 px-2 py-1 text-xs"
            placeholder="Telefon / izoh"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded border border-slate-200 px-2 py-1 text-xs"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Barcha type</option>
            {[
              "TOP_UP",
              "TRIP_COMMISSION_DEBIT",
              "MANUAL_ADJUSTMENT_PLUS",
              "MANUAL_ADJUSTMENT_MINUS",
              "PAYOUT",
              "REFUND",
              "BONUS",
              "TRIP_EARNINGS",
            ].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            className="rounded border border-slate-200 px-2 py-1 font-mono text-xs"
            placeholder="driverId"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
          />
          <input className="rounded border border-slate-200 px-2 py-1 text-xs" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="rounded border border-slate-200 px-2 py-1 text-xs" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" className="!text-xs" onClick={loadExtras}>
            Filtrlash
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="!text-xs"
            onClick={async () => {
              const params = new URLSearchParams({ take: "5000" });
              if (q.trim()) params.set("q", q.trim());
              if (type.trim()) params.set("type", type.trim());
              if (driverId.trim()) params.set("driverId", driverId.trim());
              if (from.trim()) params.set("from", from.trim());
              if (to.trim()) params.set("to", to.trim());
              const r = await fetch(`${SALOM_API_URL}/api/v1/admin/finance/export/ledger.csv?${params.toString()}`, {
                headers: getAdminRequestHeaders(),
              });
              if (!r.ok) {
                alert(await r.text());
                return;
              }
              const blob = await r.blob();
              const u = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = u;
              a.download = "salom-ledger-large.csv";
              a.click();
              URL.revokeObjectURL(u);
            }}
          >
            Ledger CSV (filtr bilan, 5000 gacha)
          </Button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          ["30 kun: ledger (net)", data.earningsNetSum30dUzs],
          ["30 kun: komissiya (platform)", data.commissionSum30dUzs],
          ["30 kun: payout (absolute)", String(data.payoutSum30dUzs)],
          ["Haydovchi balanslari (joriy)", data.totalDriverBalanceUzs],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-violet-200 bg-white px-2 py-2">
            <p className="text-[10px] text-slate-500">{k}</p>
            <p className="font-mono font-semibold">{v}</p>
          </div>
        ))}
      </div>
      {extraErr && <ErrBox e={extraErr} onRetry={loadExtras} />}
      {!extraErr && (!payouts || !topUps || !adjustments || !balances || !ledger) && (
        <p className="text-[10px] text-slate-500">Jadvallar yuklanmoqda…</p>
      )}
      {!extraErr && payouts && topUps && adjustments && balances && ledger && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase text-slate-500">
              Full ledger ({ledger.total} qator)
            </h3>
            <div className="mt-1 max-h-80 overflow-y-auto rounded border text-xs">
              <table className="w-full text-left">
                <thead className="sticky top-0 border-b bg-slate-50 text-[10px] font-bold uppercase">
                  <tr>
                    <th className="px-2 py-1">Sana</th>
                    <th className="px-2 py-1">Driver</th>
                    <th className="px-2 py-1">Type</th>
                    <th className="px-2 py-1">Amount</th>
                    <th className="px-2 py-1">Balans keyin</th>
                    <th className="px-2 py-1">Izoh / order</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.items.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="px-2 py-1 font-mono text-[10px]">{new Date(r.createdAt).toISOString().slice(0, 16).replace("T", " ")}</td>
                      <td className="px-2 py-1">
                        <div className="font-mono">{r.driver.phone}</div>
                        <div className="text-[10px] text-slate-500">{r.driverId.slice(0, 8)}</div>
                      </td>
                      <td className="px-2 py-1 font-mono text-[10px]">{r.type}</td>
                      <td className="px-2 py-1 font-mono">{moneyText(r.amountUzs)}</td>
                      <td className="px-2 py-1 font-mono">{r.balanceAfterUzs ? moneyText(r.balanceAfterUzs) : "—"}</td>
                      <td className="max-w-[16rem] truncate px-2 py-1 text-[10px]" title={r.note ?? r.order?.pickupLandmark ?? ""}>
                        {r.note ?? r.order?.pickupLandmark ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {ledger.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-2 py-3 text-slate-500">
                        Filtr bo‘yicha ledger topilmadi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-500">So‘nggi top-uplar (driver to‘lovi)</h3>
            <div className="mt-1 max-h-56 overflow-y-auto rounded border text-xs">
              <table className="w-full text-left">
                <thead className="sticky top-0 border-b bg-slate-50 text-[10px] font-bold uppercase">
                  <tr>
                    <th className="px-2 py-1">Sana (UTC)</th>
                    <th className="px-2 py-1">Telefon</th>
                    <th className="px-2 py-1">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {topUps.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="px-2 py-1 font-mono text-[10px] text-slate-600">
                        {new Date(p.createdAt).toISOString().slice(0, 16).replace("T", " ")}
                      </td>
                      <td className="px-2 py-1 font-mono">{p.driver.user.phone}</td>
                      <td className="px-2 py-1 font-mono">{moneyText(p.amountUzs)}</td>
                    </tr>
                  ))}
                  {topUps.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-2 py-2 text-slate-500">
                        TOP_UP yozuvi yo‘q
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-500">So‘nggi payoutlar (ledger)</h3>
            <div className="mt-1 max-h-56 overflow-y-auto rounded border text-xs">
              <table className="w-full text-left">
                <thead className="sticky top-0 border-b bg-slate-50 text-[10px] font-bold uppercase">
                  <tr>
                    <th className="px-2 py-1">Sana (UTC)</th>
                    <th className="px-2 py-1">Telefon</th>
                    <th className="px-2 py-1">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="px-2 py-1 font-mono text-[10px] text-slate-600">
                        {new Date(p.createdAt).toISOString().slice(0, 16).replace("T", " ")}
                      </td>
                      <td className="px-2 py-1 font-mono">{p.driver.user.phone}</td>
                      <td className="px-2 py-1 font-mono">{moneyText(p.amountUzs)}</td>
                    </tr>
                  ))}
                  {payouts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-2 py-2 text-slate-500">
                        Payout yozuvi yo‘q
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-500">So‘nggi ADJUSTMENT (tuzatish)</h3>
            <div className="mt-1 max-h-56 overflow-y-auto rounded border text-xs">
              <table className="w-full text-left">
                <thead className="sticky top-0 border-b bg-slate-50 text-[10px] font-bold uppercase">
                  <tr>
                    <th className="px-2 py-1">Sana (UTC)</th>
                    <th className="px-2 py-1">Telefon</th>
                    <th className="px-2 py-1">Delta</th>
                    <th className="px-2 py-1">Izoh</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="px-2 py-1 font-mono text-[10px] text-slate-600">
                        {new Date(p.createdAt).toISOString().slice(0, 16).replace("T", " ")}
                      </td>
                      <td className="px-2 py-1 font-mono">{p.driver.user.phone}</td>
                      <td className="px-2 py-1 font-mono">{moneyText(p.amountUzs)}</td>
                      <td className="max-w-[10rem] truncate px-2 py-1 text-[10px] text-slate-600" title={p.note ?? ""}>
                        {p.note ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {adjustments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-2 py-2 text-slate-500">
                        ADJUSTMENT yozuvi yo‘q
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase text-slate-500">Eng yuqori balanslar (top 20)</h3>
            <div className="mt-1 max-h-56 overflow-y-auto rounded border text-xs">
              <table className="w-full text-left">
                <thead className="sticky top-0 border-b bg-slate-50 text-[10px] font-bold uppercase">
                  <tr>
                    <th className="px-2 py-1">Telefon</th>
                    <th className="px-2 py-1">Balans (soʻm)</th>
                    <th className="px-2 py-1">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((d) => (
                    <tr key={d.id} className="border-b border-slate-100">
                      <td className="px-2 py-1 font-mono">{d.user.phone}</td>
                      <td className="px-2 py-1 font-mono">{moneyText(d.balanceUzs)}</td>
                      <td className="px-2 py-1 text-[10px]">{d.user.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type PilotReport = {
  window: { fromUtc: string; toUtc: string; days: number };
  ordersCreated: number;
  ordersCompleted: number;
  ordersCancelled: number;
  completionRate: number;
  gmvUzs: number;
  commissionUzs: number;
  cancelReasons: { reasonId: string | null; label: string; count: number }[];
  zoneStats: { serviceZoneId: string | null; name: string; orders: number }[];
  driverPerformance: { driverId: string; phone: string; tripsCompleted: number }[];
  orderFinanceByDay?: {
    date: string;
    created: number;
    completed: number;
    gmvUzs: number;
    commissionUzs: number;
  }[];
  pilotChecklist: string[];
};

export function AdminPilotReportView() {
  const { data, err, load } = useLoad<PilotReport>("/admin/reports/pilot?days=14");
  if (err) return <ErrBox e={err} onRetry={load} />;
  if (!data) return <p className="text-xs">…</p>;
  const pilotDays = data.window.days;
  return (
    <div className="space-y-3 text-sm">
      <p className="text-[10px] text-slate-500">
        Oynasi: {data.window.fromUtc.slice(0, 10)} — {data.window.toUtc.slice(0, 10)} (UTC, {data.window.days} kun)
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
          Yangilash
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="!text-xs"
          onClick={async () => {
            try {
              const r = await fetch(
                `${SALOM_API_URL}/api/v1/admin/reports/pilot.csv?days=${encodeURIComponent(String(pilotDays))}`,
                { headers: getAdminRequestHeaders() },
              );
              if (!r.ok) throw new Error(await r.text());
              const blob = await r.blob();
              const u = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = u;
              a.download = "salom-pilot-report.csv";
              a.click();
              URL.revokeObjectURL(u);
            } catch (e) {
              alert(
                e instanceof TypeError
                  ? adminNetworkErrorHint()
                  : toErrorMessage(e, "eksport"),
              );
            }
          }}
        >
          CSV (pilot KPI)
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="!text-xs"
          onClick={async () => {
            try {
              const r = await fetch(
                `${SALOM_API_URL}/api/v1/admin/reports/daily.csv?days=${encodeURIComponent(String(pilotDays))}`,
                { headers: getAdminRequestHeaders() },
              );
              if (!r.ok) throw new Error(await r.text());
              const blob = await r.blob();
              const u = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = u;
              a.download = "salom-daily-orders.csv";
              a.click();
              URL.revokeObjectURL(u);
            } catch (e) {
              alert(
                e instanceof TypeError
                  ? adminNetworkErrorHint()
                  : toErrorMessage(e, "eksport"),
              );
            }
          }}
        >
          CSV (kunlik qator, shu oyna)
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Buyurtmalar (yaratilgan)", String(data.ordersCreated)],
          ["Tugallangan", String(data.ordersCompleted)],
          ["Bekor", String(data.ordersCancelled)],
          ["Tugatish nisbati (completed/(completed+cancel))", String(data.completionRate)],
          ["GMV (tug. safar, soʻm)", String(data.gmvUzs)],
          ["Komissiya (soʻm)", String(data.commissionUzs)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-violet-200 bg-white px-2 py-2 text-xs">
            <p className="text-[10px] text-slate-500">{k}</p>
            <p className="font-mono font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-500">Bekor sabablari</h3>
          <ul className="mt-1 list-inside list-disc text-xs text-slate-800">
            {data.cancelReasons.map((c, i) => (
              <li key={i}>
                {c.label}: {c.count}
              </li>
            ))}
            {data.cancelReasons.length === 0 && <li>—</li>}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-500">Zonalar (buyurtma soni)</h3>
          <ul className="mt-1 list-inside list-disc text-xs text-slate-800">
            {data.zoneStats.map((z) => (
              <li key={z.name}>
                {z.name}: {z.orders}
              </li>
            ))}
            {data.zoneStats.length === 0 && <li>—</li>}
          </ul>
        </div>
      </div>
      {data.orderFinanceByDay && data.orderFinanceByDay.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-500">
            So‘nggi {data.orderFinanceByDay.length} kun (UTC) — buyurtma + GMV + komissiya
          </h3>
          <div className="mt-1 max-h-60 overflow-y-auto overflow-x-auto rounded border text-xs">
            <table className="w-full min-w-[480px] text-left">
              <thead className="sticky top-0 border-b bg-slate-50 text-[10px]">
                <tr>
                  <th className="px-2 py-1">Sana</th>
                  <th className="px-2 py-1">Yaratilgan</th>
                  <th className="px-2 py-1">Tugallangan</th>
                  <th className="px-2 py-1">GMV</th>
                  <th className="px-2 py-1">Komissiya</th>
                </tr>
              </thead>
              <tbody>
                {data.orderFinanceByDay.map((r) => (
                  <tr key={r.date} className="border-b border-slate-100">
                    <td className="px-2 py-1 font-mono">{r.date}</td>
                    <td className="px-2 py-1">{r.created}</td>
                    <td className="px-2 py-1">{r.completed}</td>
                    <td className="px-2 py-1 font-mono">{r.gmvUzs}</td>
                    <td className="px-2 py-1 font-mono">{r.commissionUzs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div>
        <h3 className="text-xs font-bold uppercase text-slate-500">Top haydovchilar (tug. safar)</h3>
        <div className="mt-1 overflow-x-auto rounded border text-xs">
          <table className="w-full text-left">
            <thead className="border-b bg-slate-50 text-[10px]">
              <tr>
                <th className="px-2 py-1">Telefon</th>
                <th className="px-2 py-1">Safar</th>
              </tr>
            </thead>
            <tbody>
              {data.driverPerformance.map((d) => (
                <tr key={d.driverId} className="border-b border-slate-100">
                  <td className="px-2 py-1 font-mono">{d.phone}</td>
                  <td className="px-2 py-1">{d.tripsCompleted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-bold uppercase text-slate-500">Pilot checklist (SOP)</h3>
        <ul className="mt-1 list-inside list-decimal text-[11px] text-slate-600">
          {data.pilotChecklist.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AdminReportsView() {
  const { data, err, load } = useLoad<{
    days: number;
    series: { date: string; created: number; completed: number; gmvUzs: number; commissionUzs: number }[];
  }>("/admin/reports/daily?days=14");
  if (err) return <ErrBox e={err} onRetry={load} />;
  if (!data) return <p className="text-xs">…</p>;
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
          Yangilash
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="!text-xs"
          onClick={async () => {
            try {
              const r = await fetch(
                `${SALOM_API_URL}/api/v1/admin/reports/daily.csv?days=${encodeURIComponent(String(data.days))}`,
                { headers: getAdminRequestHeaders() },
              );
              if (!r.ok) throw new Error(await r.text());
              const blob = await r.blob();
              const u = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = u;
              a.download = "salom-daily-orders.csv";
              a.click();
              URL.revokeObjectURL(u);
            } catch (e) {
              alert(
                e instanceof TypeError
                  ? adminNetworkErrorHint()
                  : toErrorMessage(e, "eksport"),
              );
            }
          }}
        >
          CSV yuklab olish
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="border-b bg-slate-50 text-[10px] font-bold uppercase">
            <tr>
              <th className="px-2 py-2">Sana (UTC)</th>
              <th className="px-2 py-2">Yaratilgan</th>
              <th className="px-2 py-2">Tugallangan</th>
              <th className="px-2 py-2">GMV (soʻm)</th>
              <th className="px-2 py-2">Komissiya (soʻm)</th>
            </tr>
          </thead>
          <tbody>
            {data.series.map((r) => (
              <tr key={r.date} className="border-b">
                <td className="px-2 py-1.5 font-mono">{r.date}</td>
                <td className="px-2 py-1.5">{r.created}</td>
                <td className="px-2 py-1.5">{r.completed}</td>
                <td className="px-2 py-1.5 font-mono">{r.gmvUzs}</td>
                <td className="px-2 py-1.5 font-mono">{r.commissionUzs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type SmsLogRow = {
  id: string;
  toPhone: string;
  body: string;
  status: string;
  error: string | null;
  createdAt: string;
  sentAt: string | null;
  order: { id: string; status: string } | null;
};

export function AdminSmsLogsView() {
  const [status, setStatus] = useState("");
  const path = `/admin/notifications/sms-logs?take=100${status ? `&status=${encodeURIComponent(status)}` : ""}`;
  const { data, err, load } = useLoad<SmsLogRow[]>(path);
  if (err) return <ErrBox e={err} onRetry={load} />;
  if (!data) return <p className="text-xs">…</p>;
  return (
    <div className="space-y-2 text-sm">
      <p className="text-[10px] text-slate-600">
        Faqat o‘qish (SMSLog). Holat filtri. Haqiqiy provayder — Phase 14.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[10px] text-slate-500">
          Holat
          <select
            className="ml-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Hammasi</option>
            <option value="QUEUED">QUEUED</option>
            <option value="SENT">SENT</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </label>
        <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
          Yangilash
        </Button>
      </div>
      <div className="max-h-[28rem] overflow-x-auto overflow-y-auto rounded border text-xs">
        <table className="w-full min-w-[640px] text-left">
          <thead className="sticky top-0 border-b bg-slate-50 text-[10px] font-bold uppercase">
            <tr>
              <th className="px-2 py-1.5">Vaqt (UTC)</th>
              <th className="px-2 py-1.5">Raqam</th>
              <th className="px-2 py-1.5">Holat</th>
              <th className="px-2 py-1.5">Buyurtma</th>
              <th className="px-2 py-1.5">Matn</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="whitespace-nowrap px-2 py-1 font-mono text-[10px] text-slate-600">
                  {new Date(r.createdAt).toISOString().replace("T", " ").slice(0, 19)}
                </td>
                <td className="px-2 py-1 font-mono">{r.toPhone}</td>
                <td className="px-2 py-1 text-[10px]">
                  {r.status}
                  {r.error && <span className="ml-1 text-rose-700">({r.error})</span>}
                </td>
                <td className="px-2 py-1 font-mono text-[10px]">{r.order?.id?.slice(0, 8) ?? "—"}</td>
                <td className="max-w-xs truncate px-2 py-1 text-[10px] text-slate-700" title={r.body}>
                  {r.body}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-slate-500">
                  Yozuvlar yo‘q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminAuditView() {
  const [actionQ, setActionQ] = useState("");
  const path = `/admin/audit-logs?take=80${actionQ.trim() ? `&action=${encodeURIComponent(actionQ.trim())}` : ""}`;
  const { data, err, load } = useLoad<
    { id: string; action: string; entityType: string; createdAt: string; metadata: unknown; actor: { phone: string } | null }[]
  >(path);
  if (err) return <ErrBox e={err} onRetry={load} />;
  if (!data) return <p className="text-xs">…</p>;
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[10px] text-slate-500">
          Action (qismi)
          <input
            className="ml-1 w-40 rounded border border-slate-200 px-1.5 py-0.5 font-mono text-xs"
            value={actionQ}
            onChange={(e) => setActionQ(e.target.value)}
            placeholder="mas. finance"
          />
        </label>
        <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
          Yangilash
        </Button>
      </div>
      <ul className="max-h-96 space-y-1 overflow-y-auto font-mono text-[10px] text-slate-800">
        {data.map((a) => (
          <li key={a.id} className="border-b border-slate-100 pb-1">
            {new Date(a.createdAt).toISOString()} · {a.action} · {a.entityType} · {a.actor?.phone ?? "—"}
          </li>
        ))}
        {data.length === 0 && <li>Audit yozuvlari hozircha yo‘q.</li>}
      </ul>
    </div>
  );
}

export function AdminSubscriptionsView() {
  const [packs, setPacks] = useState<{ id: string; name: string; priceUzs: string; durationDays: number }[] | null>(null);
  const [subs, setSubs] = useState<{
    total: number;
    items: { id: string; status: string; endAt: string; package: { name: string }; driver: { user: { phone: string } } }[];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const h = getAdminRequestHeaders();
      const [a, b] = await Promise.all([
        fetch(`${SALOM_API_URL}/api/v1/admin/subscription-packages`, { headers: h }),
        fetch(`${SALOM_API_URL}/api/v1/admin/subscriptions?take=40`, { headers: h }),
      ]);
      if (!a.ok) throw new Error(await a.text());
      if (!b.ok) throw new Error(await b.text());
      setPacks((await a.json()) as typeof packs);
      setSubs((await b.json()) as typeof subs);
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (err) return <ErrBox e={err} onRetry={load} />;
  if (!packs || !subs) return <p className="text-xs">…</p>;
  return (
    <div className="space-y-6 text-sm">
      <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
        Yangilash
      </Button>
      <div>
        <h3 className="text-xs font-bold uppercase text-slate-500">Paketlar</h3>
        <ul className="mt-1 space-y-1">
          {packs.map((p) => (
            <li key={p.id} className="rounded border px-2 py-1 text-xs">
              {p.name} — {p.durationDays} kun · narx: {p.priceUzs}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-xs font-bold uppercase text-slate-500">Obunalar ({subs.total})</h3>
        <div className="mt-1 max-h-64 overflow-y-auto rounded border">
          <table className="w-full text-left text-xs">
            <tbody>
              {subs.items.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="px-2 py-1 font-mono">{s.driver.user.phone}</td>
                  <td className="px-2 py-1">{s.package.name}</td>
                  <td className="px-2 py-1">{s.status}</td>
                  <td className="px-2 py-1 font-mono text-[10px]">{s.endAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type CommissionMonthlyRow = {
  driverId: string;
  phone: string;
  tripCount: number;
  commissionDueUzs: number;
};

type CommissionMonthlyPreview = {
  periodYm: string;
  fromUtc: string;
  toUtcExcl: string;
  driverCount: number;
  totalCommissionUzs: number;
  items: CommissionMonthlyRow[];
};

type SettlementListItem = {
  id: string;
  driverId: string;
  phone: string;
  periodYm: string;
  tripCount: number;
  commissionDueUzs: string;
  status: string;
  confirmedAt: string | null;
  chargedAt: string | null;
  createdAt: string;
};

/** Phase 20: oyma-oy komissiya hisoblash, `DriverMonthSettlement` jadvali, qo'lda tasdiq. */
export function AdminMonthSettlementsPanel() {
  const [periodYm, setPeriodYm] = useState(() => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const [preview, setPreview] = useState<CommissionMonthlyPreview | null>(null);
  const [settlements, setSettlements] = useState<{
    total: number;
    items: SettlementListItem[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const pullSettlements = useCallback(async () => {
    const h = getAdminRequestHeaders();
    const r = await fetch(
      `${SALOM_API_URL}/api/v1/admin/finance/settlements?periodYm=${encodeURIComponent(periodYm.trim())}`,
      { headers: h },
    );
    if (!r.ok) throw new Error(await r.text());
    setSettlements((await r.json()) as { total: number; items: SettlementListItem[] });
  }, [periodYm]);

  useSalomAdminAuthRefetch(() => {
    void pullSettlements().catch((e) => {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    });
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await pullSettlements();
      } catch (e) {
        if (cancelled) return;
        if (e instanceof TypeError) setErr(adminNetworkErrorHint());
        else setErr(toErrorMessage(e, "xato"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pullSettlements]);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setBusy(false);
    }
  }, []);

  const loadCommission = () =>
    run(async () => {
      const h = getAdminRequestHeaders();
      const r = await fetch(
        `${SALOM_API_URL}/api/v1/admin/finance/commission-monthly?periodYm=${encodeURIComponent(periodYm.trim())}`,
        { headers: h },
      );
      if (!r.ok) throw new Error(await r.text());
      setPreview((await r.json()) as CommissionMonthlyPreview);
    });

  const syncTable = () =>
    run(async () => {
      const h = { ...getAdminRequestHeaders(), "Content-Type": "application/json" };
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/finance/settlements/sync`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ periodYm: periodYm.trim() }),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = (await r.json()) as { updated?: number; periodYm?: string };
      setMsg(`Jadvalga yozildi: ${j.updated ?? 0} haydovchi (${j.periodYm ?? periodYm})`);
      await pullSettlements();
    });

  const loadList = () =>
    run(async () => {
      await pullSettlements();
    });

  const confirmRow = (id: string) =>
    run(async () => {
      const h = { ...getAdminRequestHeaders(), "Content-Type": "application/json" };
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/finance/settlements/${encodeURIComponent(id)}/confirm`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({}),
      });
      if (!r.ok) throw new Error(await r.text());
      setMsg("Tasdiqlandi.");
      await pullSettlements();
    });

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-slate-600">
        UTC oy bo&apos;yicha <strong>tugatilgan</strong> turlardan platforma komissiyasi. Ketma-ketlik:{" "}
        <strong>Hisoblash</strong> → <strong>DB ga yozish (sync)</strong> → <strong>To&apos;lovlarni yuklash</strong> →
        qator bo&apos;yicha <strong>Tasdiqlash</strong> (bu bank/ichki to&apos;lovni avtomat qilmaydi — faqat holat).
      </p>
      <p className="text-xs text-amber-900/90">
        <strong>Eslatma:</strong> ro&apos;yxatda faqat <em>shu oyda kamida bitta COMPLETED trip</em> bo&apos;lgan
        haydovchilar ko&apos;rinadi. Bitta haydovchi — real ma&apos;lumot yoki DB da boshqa haydovchida safar
        yo&apos;qligi.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs text-slate-600">
          Oy (YYYY-MM)
          <input
            className="mt-0.5 rounded border px-2 py-1.5 font-mono text-sm"
            value={periodYm}
            onChange={(e) => setPeriodYm(e.target.value)}
            placeholder="2026-04"
          />
        </label>
        <Button type="button" variant="secondary" className="!text-xs" disabled={busy} onClick={() => void loadCommission()}>
          Hisoblash
        </Button>
        <Button type="button" variant="secondary" className="!text-xs" disabled={busy} onClick={() => void syncTable()}>
          DB ga yozish (sync)
        </Button>
        <Button type="button" variant="secondary" className="!text-xs" disabled={busy} onClick={() => void loadList()}>
          To&apos;lovlarni yuklash
        </Button>
      </div>
      {err && <p className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-900">{err}</p>}
      {msg && <p className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-900">{msg}</p>}
      {preview && (
        <div>
          <h4 className="text-xs font-bold uppercase text-slate-500">Hisoblash natijasi ({preview.periodYm})</h4>
          <p className="text-xs text-slate-600">
            {preview.fromUtc} … {preview.toUtcExcl} · {preview.driverCount} haydovchi · jami{" "}
            <strong>{preview.totalCommissionUzs}</strong> so&apos;m
          </p>
          <div className="mt-1 max-h-48 overflow-y-auto rounded border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-2 py-1">Telefon</th>
                  <th className="px-2 py-1">Safar</th>
                  <th className="px-2 py-1">Komissiya (so&apos;m)</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.map((it) => (
                  <tr key={it.driverId} className="border-b">
                    <td className="px-2 py-1 font-mono">{it.phone}</td>
                    <td className="px-2 py-1">{it.tripCount}</td>
                    <td className="px-2 py-1">{it.commissionDueUzs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {settlements !== null && (
        <div>
          <h4 className="text-xs font-bold uppercase text-slate-500">Jadval (DriverMonthSettlement) · {settlements.total} qator</h4>
          {settlements.total === 0 ? (
            <p className="mt-2 rounded border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-700">
              Bu oy uchun yozuv yo&apos;q. Yuqorida <strong>DB ga yozish (sync)</strong> ni bosganingizga ishonchingiz komil
              (yoki shu oyda COMPLETED safar yoʻq).
            </p>
          ) : (
            <div className="mt-1 max-h-64 overflow-y-auto rounded border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-2 py-1">Telefon</th>
                    <th className="px-2 py-1">Holat</th>
                    <th className="px-2 py-1">Komissiya</th>
                    <th className="px-2 py-1" />
                  </tr>
                </thead>
                <tbody>
                  {settlements.items.map((it) => (
                    <tr key={it.id} className="border-b">
                      <td className="px-2 py-1 font-mono">{it.phone}</td>
                      <td className="px-2 py-1">{it.status}</td>
                      <td className="px-2 py-1">{it.commissionDueUzs}</td>
                      <td className="px-2 py-1 text-right">
                        {it.status === "PENDING" && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="!text-[10px] !py-0.5"
                            disabled={busy}
                            onClick={() => void confirmRow(it.id)}
                          >
                            Tasdiqlash
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminTariffsView() {
  const { data, err, load } = useLoad<{
    meterBaseUzs: number;
    meterPerKmUzs: number;
    platformCommissionBps: number;
    ledgerRoundingNote?: string;
  }>("/admin/config/pricing");
  if (err) return <ErrBox e={err} onRetry={load} />;
  if (!data) return <p className="text-xs">…</p>;
  return (
    <div className="space-y-2 text-sm">
      <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
        Yangilash
      </Button>
      <p>
        Boshlang‘ich: <strong>{data.meterBaseUzs}</strong> so'm + km × <strong>{data.meterPerKmUzs}</strong>
      </p>
      <p>Platforma ulushi: {data.platformCommissionBps / 100}% (env orqali; keyinchalik zonalangan jadval)</p>
      {data.ledgerRoundingNote && <p className="text-xs text-slate-600">{data.ledgerRoundingNote}</p>}
    </div>
  );
}

function ErrBox({ e, onRetry }: { e: string; onRetry: () => void }) {
  return (
    <div className="space-y-2">
      <p className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-900">{e}</p>
      <Button type="button" variant="secondary" className="!text-xs" onClick={onRetry}>
        Qayta
      </Button>
    </div>
  );
}
