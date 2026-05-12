"use client";

import { Button } from "@/components/salom/Button";
import { InputField } from "@/components/salom/InputField";
import { SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import { clearPublicServiceZonesCache } from "@/lib/salomServiceZones";
import { toErrorMessage } from "@/lib/toErrorMessage";
import { useCallback, useEffect, useState } from "react";

type RingRow = {
  id: string;
  code: string;
  name: string;
  radiusFromKm: number;
  radiusToKm: number | null;
  starterFeeUzs: number;
  distanceRateUzs: number | null;
  sortOrder: number;
};

type PickupPricingPayload = {
  profileId: string;
  serviceZoneId: string;
  freeWaitMinutes: number;
  waitPerMinuteUzs: number;
  cityKmRateUzs: number;
  outsideKmRateUzs: number;
  rings: RingRow[];
};

export function ZonePickupPricingEditor({ zoneId, zoneName }: { zoneId: string; zoneName: string }) {
  const [data, setData] = useState<PickupPricingPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [draftFree, setDraftFree] = useState("");
  const [draftWait, setDraftWait] = useState("");
  const [draftCity, setDraftCity] = useState("");
  const [draftOut, setDraftOut] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [newStarter, setNewStarter] = useState("");
  const [newKm, setNewKm] = useState("");
  const [newSort, setNewSort] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/zones/${zoneId}/pickup-pricing`, {
        headers: getAdminRequestHeaders(),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = (await r.json()) as PickupPricingPayload;
      setData(j);
      setDraftFree(String(j.freeWaitMinutes));
      setDraftWait(String(j.waitPerMinuteUzs));
      setDraftCity(String(j.cityKmRateUzs));
      setDraftOut(String(j.outsideKmRateUzs));
    } catch (e) {
      setErr(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "xato"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [zoneId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async () => {
    if (!data) return;
    setSavingProfile(true);
    setErr(null);
    try {
      const f = parseInt(draftFree.trim(), 10);
      const w = parseFloat(draftWait.replace(",", "."));
      const c = parseFloat(draftCity.replace(",", "."));
      const o = parseFloat(draftOut.replace(",", "."));
      if (!Number.isFinite(f) || f < 0 || f > 240) throw new Error("Tekin kutish 0…240 daqiqa");
      if (!Number.isFinite(w) || w < 0) throw new Error("Daqiqa narxi noto‘g‘ri");
      if (!Number.isFinite(c) || c < 0 || !Number.isFinite(o) || o < 0) throw new Error("Km stavkalari musbat bo‘lsin");
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/zones/${zoneId}/pickup-pricing`, {
        method: "PATCH",
        headers: getAdminRequestHeaders(),
        body: JSON.stringify({
          freeWaitMinutes: f,
          waitPerMinuteUzs: w,
          cityKmRateUzs: c,
          outsideKmRateUzs: o,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      clearPublicServiceZonesCache();
      await load();
    } catch (e) {
      setErr(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "xato"));
    } finally {
      setSavingProfile(false);
    }
  };

  const createRing = async () => {
    setCreating(true);
    setErr(null);
    try {
      const code = newCode.trim().toLowerCase();
      const name = newName.trim();
      const rf = parseFloat(newFrom.replace(",", "."));
      const rtRaw = newTo.trim();
      const rt = rtRaw === "" ? null : parseFloat(rtRaw.replace(",", "."));
      const st = parseFloat(newStarter.replace(/\s/g, "").replace(",", "."));
      const kmRaw = newKm.trim();
      const km = kmRaw === "" ? null : parseFloat(kmRaw.replace(/\s/g, "").replace(",", "."));
      const so = newSort.trim() === "" ? undefined : parseInt(newSort, 10);
      if (!code || !name) throw new Error("Kod va nom majburiy");
      if (!Number.isFinite(rf) || rf < 0) throw new Error("Radius from musbat");
      if (rt != null && (!Number.isFinite(rt) || rt < rf)) throw new Error("Radius to ≥ from yoki bo‘sh");
      if (!Number.isFinite(st) || st < 0) throw new Error("Starter musbat");
      if (km != null && (!Number.isFinite(km) || km < 0)) throw new Error("Km stavka noto‘g‘ri");
      const body: Record<string, unknown> = {
        code,
        name,
        radiusFromKm: rf,
        radiusToKm: rt,
        starterFeeUzs: st,
        distanceRateUzs: km,
      };
      if (so != null && Number.isFinite(so)) body.sortOrder = so;
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/zones/${zoneId}/pickup-pricing/rings`, {
        method: "POST",
        headers: getAdminRequestHeaders(),
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      clearPublicServiceZonesCache();
      setNewCode("");
      setNewName("");
      setNewFrom("");
      setNewTo("");
      setNewStarter("");
      setNewKm("");
      setNewSort("");
      await load();
    } catch (e) {
      setErr(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "xato"));
    } finally {
      setCreating(false);
    }
  };

  const patchRing = async (ring: RingRow, patch: Partial<RingRow>): Promise<void> => {
    setErr(null);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/pickup-pricing/rings/${ring.id}`, {
        method: "PATCH",
        headers: getAdminRequestHeaders(),
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error(await r.text());
      clearPublicServiceZonesCache();
      await load();
    } catch (e) {
      setErr(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "xato"));
    }
  };

  const deleteRing = async (rid: string) => {
    if (!confirm("Bu radius ringni o‘chirish?")) return;
    setErr(null);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/pickup-pricing/rings/${rid}`, {
        method: "DELETE",
        headers: getAdminRequestHeaders(),
      });
      if (!r.ok) throw new Error(await r.text());
      clearPublicServiceZonesCache();
      await load();
    } catch (e) {
      setErr(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "xato"));
    }
  };

  if (loading && !data) {
    return <p className="text-[10px] text-slate-500">Pickup narxlari yuklanmoqda…</p>;
  }
  if (!data) {
    return err ? <p className="text-[10px] text-rose-700">{err}</p> : null;
  }

  return (
    <div className="mt-2 space-y-3 border-t border-violet-100 pt-2 text-[11px]">
      <p className="font-semibold text-violet-950">
        Pickup radius ringlar va kutish — <span className="font-normal text-slate-600">{zoneName}</span>
      </p>
      {err && <p className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-rose-900">{err}</p>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-500">Tekin kutish (daq)</span>
          <input
            className="rounded border border-slate-200 px-2 py-1 font-mono text-xs"
            value={draftFree}
            onChange={(e) => setDraftFree(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-500">Har daqiqa narxi (so‘m)</span>
          <input
            className="rounded border border-slate-200 px-2 py-1 font-mono text-xs"
            value={draftWait}
            onChange={(e) => setDraftWait(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-500">Shahar km (default)</span>
          <input
            className="rounded border border-slate-200 px-2 py-1 font-mono text-xs"
            value={draftCity}
            onChange={(e) => setDraftCity(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-500">Tashqi km (default)</span>
          <input
            className="rounded border border-slate-200 px-2 py-1 font-mono text-xs"
            value={draftOut}
            onChange={(e) => setDraftOut(e.target.value)}
          />
        </label>
      </div>
      <Button type="button" className="!text-[10px]" disabled={savingProfile} onClick={() => void saveProfile()}>
        {savingProfile ? "…" : "Kutish va km defaultlarni saqlash"}
      </Button>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-[10px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-1">Kod</th>
              <th className="px-2 py-1">Nom</th>
              <th className="px-2 py-1">km dan</th>
              <th className="px-2 py-1">km gacha</th>
              <th className="px-2 py-1">Starter</th>
              <th className="px-2 py-1">Km</th>
              <th className="px-2 py-1">Sort</th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {data.rings.map((ring) => (
              <RingEditRow key={ring.id} ring={ring} onPatch={patchRing} onDelete={deleteRing} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/40 p-2">
        <p className="mb-2 font-medium text-violet-900">Yangi ring</p>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <InputField id={`nr-code-${zoneId}`} label="Kod" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="outer_3" />
          <InputField id={`nr-name-${zoneId}`} label="Nom" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Yangi zona" />
          <InputField id={`nr-from-${zoneId}`} label="km dan" value={newFrom} onChange={(e) => setNewFrom(e.target.value)} inputMode="decimal" />
          <InputField
            id={`nr-to-${zoneId}`}
            label="km gacha (∞ bo‘sh)"
            value={newTo}
            onChange={(e) => setNewTo(e.target.value)}
            inputMode="decimal"
          />
          <InputField id={`nr-st-${zoneId}`} label="Starter" value={newStarter} onChange={(e) => setNewStarter(e.target.value)} inputMode="numeric" />
          <InputField id={`nr-km-${zoneId}`} label="Km (bo‘sh=profile)" value={newKm} onChange={(e) => setNewKm(e.target.value)} inputMode="numeric" />
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <InputField id={`nr-so-${zoneId}`} label="Sort (ixt.)" value={newSort} onChange={(e) => setNewSort(e.target.value)} inputMode="numeric" />
          <Button type="button" className="!text-[10px]" disabled={creating} onClick={() => void createRing()}>
            {creating ? "…" : "Ring qo‘shish"}
          </Button>
        </div>
      </div>
      <Button type="button" variant="secondary" className="!text-[10px]" onClick={() => void load()}>
        Yangilash
      </Button>
    </div>
  );
}

function RingEditRow({
  ring,
  onPatch,
  onDelete,
}: {
  ring: RingRow;
  onPatch: (ring: RingRow, patch: Partial<RingRow>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(ring.name);
  const [from, setFrom] = useState(String(ring.radiusFromKm));
  const [to, setTo] = useState(ring.radiusToKm == null ? "" : String(ring.radiusToKm));
  const [starter, setStarter] = useState(String(ring.starterFeeUzs));
  const [km, setKm] = useState(ring.distanceRateUzs == null ? "" : String(ring.distanceRateUzs));
  const [sort, setSort] = useState(String(ring.sortOrder));
  const [saving, setSaving] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  useEffect(() => {
    setName(ring.name);
    setFrom(String(ring.radiusFromKm));
    setTo(ring.radiusToKm == null ? "" : String(ring.radiusToKm));
    setStarter(String(ring.starterFeeUzs));
    setKm(ring.distanceRateUzs == null ? "" : String(ring.distanceRateUzs));
    setSort(String(ring.sortOrder));
    setLocalErr(null);
  }, [ring]);

  const save = async () => {
    setSaving(true);
    setLocalErr(null);
    try {
      const rf = parseFloat(from.replace(",", "."));
      const rtRaw = to.trim();
      const rt = rtRaw === "" ? null : parseFloat(rtRaw.replace(",", "."));
      const st = parseFloat(starter.replace(/\s/g, "").replace(",", "."));
      const kmRaw = km.trim();
      const kmN = kmRaw === "" ? null : parseFloat(kmRaw.replace(/\s/g, "").replace(",", "."));
      const so = parseInt(sort.trim(), 10);
      if (!Number.isFinite(rf) || rf < 0) {
        setLocalErr("Radius from musbat");
        return;
      }
      if (rt != null && (!Number.isFinite(rt) || rt < rf)) {
        setLocalErr("Radius to ≥ from yoki bo‘sh");
        return;
      }
      if (!Number.isFinite(st) || st < 0) {
        setLocalErr("Starter musbat");
        return;
      }
      if (kmN != null && (!Number.isFinite(kmN) || kmN < 0)) {
        setLocalErr("Km stavka noto‘g‘ri");
        return;
      }
      await onPatch(ring, {
        name,
        radiusFromKm: rf,
        radiusToKm: rt,
        starterFeeUzs: st,
        distanceRateUzs: kmN,
        sortOrder: Number.isFinite(so) ? so : ring.sortOrder,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-t border-slate-100">
      <td className="px-2 py-1 font-mono text-slate-500">{ring.code}</td>
      <td className="px-2 py-1">
        <input className="w-full rounded border px-1 py-0.5" value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td className="px-2 py-1">
        <input className="w-16 rounded border px-1 py-0.5 font-mono" value={from} onChange={(e) => setFrom(e.target.value)} />
      </td>
      <td className="px-2 py-1">
        <input className="w-16 rounded border px-1 py-0.5 font-mono" value={to} onChange={(e) => setTo(e.target.value)} />
      </td>
      <td className="px-2 py-1">
        <input className="w-20 rounded border px-1 py-0.5 font-mono" value={starter} onChange={(e) => setStarter(e.target.value)} />
      </td>
      <td className="px-2 py-1">
        <input className="w-20 rounded border px-1 py-0.5 font-mono" value={km} onChange={(e) => setKm(e.target.value)} />
      </td>
      <td className="px-2 py-1">
        <input className="w-12 rounded border px-1 py-0.5 font-mono" value={sort} onChange={(e) => setSort(e.target.value)} />
      </td>
      <td className="whitespace-nowrap px-2 py-1 align-top">
        {localErr && <p className="mb-1 max-w-[14rem] text-[9px] text-rose-700">{localErr}</p>}
        <button type="button" className="mr-1 text-emerald-700 underline" disabled={saving} onClick={() => void save()}>
          Saqlash
        </button>
        <button type="button" className="text-rose-700 underline" onClick={() => onDelete(ring.id)}>
          O‘chir
        </button>
      </td>
    </tr>
  );
}
