"use client";

import { Card } from "@/components/salom/Card";
import { Button } from "@/components/salom/Button";
import { SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import { toErrorMessage } from "@/lib/toErrorMessage";
import { useEffect, useState } from "react";

type ServiceZoneRow = { id: string; name: string; slug: string };

type XpTierAdminRow = { id: string; labelUz: string; minXp: number; bonusUzs: number };

type XpLbRow = {
  rank: number;
  driverId: string;
  displayName: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  lifetimeXpReal: number;
  lifetimeXpEffective: number;
  tier: string;
  tierLabelUz: string;
};

type XpLbPayload = {
  zoneId: string;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  rows: XpLbRow[];
};

type XpSettingsPayload = { tiers: XpTierAdminRow[] };

function parseUzsInput(raw: string): number {
  return Math.max(0, Math.trunc(Number(raw.replace(/\s/g, "").replace(/,/g, "")) || 0));
}

export function AdminXpClient() {
  const [err, setErr] = useState<string | null>(null);
  const [zones, setZones] = useState<ServiceZoneRow[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [tiers, setTiers] = useState<XpTierAdminRow[]>([]);
  const [tierDrafts, setTierDrafts] = useState<Record<string, string>>({});
  const [bonusSaving, setBonusSaving] = useState(false);
  const [lb, setLb] = useState<XpLbPayload | null>(null);
  const [lbLoading, setLbLoading] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [edit, setEdit] = useState<null | { driverId: string; displayName: string; xp: string }>(null);
  const [saving, setSaving] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  function applyTiersFromApi(list: XpTierAdminRow[]) {
    setTiers(list);
    const d: Record<string, string> = {};
    for (const t of list) d[t.id] = String(t.bonusUzs ?? 0);
    setTierDrafts(d);
  }

  useEffect(() => {
    let alive = true;
    void (async () => {
      setErr(null);
      try {
        const [zlist, st] = await Promise.all([
          fetch(`${SALOM_API_URL}/api/v1/admin/zones`, { headers: getAdminRequestHeaders() }),
          fetch(`${SALOM_API_URL}/api/v1/admin/gamification/xp-settings`, { headers: getAdminRequestHeaders() }),
        ]);
        if (!zlist.ok) throw new Error(await zlist.text());
        if (!st.ok) throw new Error(await st.text());
        if (!alive) return;
        const zArr = (await zlist.json()) as ServiceZoneRow[];
        const s = (await st.json()) as XpSettingsPayload;
        setZones(zArr);
        if (zArr.length) setZoneId((prev) => (prev && zArr.some((z) => z.id === prev) ? prev : zArr[0]!.id));
        applyTiersFromApi(s.tiers ?? []);
      } catch (e) {
        if (!alive) return;
        if (e instanceof TypeError) setErr(adminNetworkErrorHint());
        else setErr(toErrorMessage(e, "xp"));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!zoneId) return;
    let alive = true;
    setLbLoading(true);
    void (async () => {
      try {
        const u = new URL(`${SALOM_API_URL}/api/v1/admin/gamification/xp-leaderboard`);
        u.searchParams.set("zoneId", zoneId);
        u.searchParams.set("page", String(page));
        u.searchParams.set("limit", String(pageSize));
        if (searchApplied.trim()) u.searchParams.set("search", searchApplied.trim());
        const r = await fetch(u.toString(), { headers: getAdminRequestHeaders() });
        if (!r.ok) throw new Error(await r.text());
        const data = (await r.json()) as XpLbPayload;
        if (!alive) return;
        setLb(data);
      } catch (e) {
        if (!alive) return;
        setLb(null);
        if (e instanceof TypeError) setErr(adminNetworkErrorHint());
        else setErr(toErrorMessage(e, "xp"));
      } finally {
        if (alive) setLbLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [zoneId, page, searchApplied, reloadTick]);

  async function saveTierBonuses() {
    const tierBonusesUzs: Record<string, number> = {};
    for (const t of tiers) {
      tierBonusesUzs[t.id] = parseUzsInput(tierDrafts[t.id] ?? "0");
    }
    setBonusSaving(true);
    setErr(null);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/gamification/xp-settings`, {
        method: "PATCH",
        headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ tierBonusesUzs }),
      });
      if (!r.ok) throw new Error(await r.text());
      const s = (await r.json()) as XpSettingsPayload;
      applyTiersFromApi(s.tiers ?? []);
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xp"));
    } finally {
      setBonusSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      {err && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{err}</p>}

      <Card title="XP darajalari va bonus (har bir tier)" padding="md" accent="admin">
        <p className="mb-3 text-sm text-slate-600">
          Minimal XP va haydovchi ilovasidagi har bir daraja uchun bonus (so‘m). Mobil ilovada har qator o‘ngda shu
          miqdor ko‘rinadi; sizning joriy darajangiz kartasida ham shu summa ishlatiladi.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2 text-right">Min XP</th>
                <th className="px-3 py-2 text-right">Bonus (so‘m)</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold text-slate-800">{t.labelUz}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{t.minXp.toLocaleString("uz-UZ")}+</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      className="w-32 rounded border border-slate-200 px-2 py-1 text-right text-sm"
                      value={tierDrafts[t.id] ?? ""}
                      onChange={(e) => setTierDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      inputMode="numeric"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Button type="button" variant="primary" disabled={bonusSaving || !tiers.length} onClick={() => void saveTierBonuses()}>
            {bonusSaving ? "Saqlanmoqda…" : "Bonuslarni saqlash"}
          </Button>
        </div>
      </Card>

      <Card title="Zona bo‘yicha haydovchi XP" padding="md" accent="admin">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-[11px] text-slate-600">
            Zona
            <select
              className="mt-1 min-w-[200px] rounded border border-slate-200 px-2 py-1.5 text-sm"
              value={zoneId}
              onChange={(e) => {
                setZoneId(e.target.value);
                setPage(1);
              }}
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-[11px] text-slate-600">
            Qidiruv (ism / telefon)
            <input
              className="mt-1 min-w-[200px] rounded border border-slate-200 px-2 py-1.5 text-sm"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setSearchApplied(searchDraft);
                }
              }}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setPage(1);
              setSearchApplied(searchDraft);
            }}
          >
            Qidirish
          </Button>
        </div>

        {lbLoading ? (
          <p className="text-sm text-slate-500">Yuklanmoqda…</p>
        ) : lb ? (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Haydovchi</th>
                    <th className="px-3 py-2">Telefon</th>
                    <th className="px-3 py-2">Tier</th>
                    <th className="px-3 py-2 text-right">XP (effektiv)</th>
                    <th className="px-3 py-2 text-right">XP (real)</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lb.rows.map((r) => (
                    <tr key={r.driverId} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-700">{r.rank}</td>
                      <td className="px-3 py-2 text-slate-800">{r.displayName}</td>
                      <td className="px-3 py-2 text-slate-600">{r.phone}</td>
                      <td className="px-3 py-2 text-slate-700">{(r.tierLabelUz || r.tier).toUpperCase()}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                        {r.lifetimeXpEffective.toLocaleString("uz-UZ")}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500">{r.lifetimeXpReal.toLocaleString("uz-UZ")}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="text-xs font-semibold text-violet-700 underline"
                          onClick={() =>
                            setEdit({
                              driverId: r.driverId,
                              displayName: r.displayName,
                              xp: String(r.lifetimeXpEffective),
                            })
                          }
                        >
                          Tahrirlash
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <span>
                Jami: {lb.total} · sahifa {lb.page}
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Oldingi
                </Button>
                <Button type="button" variant="secondary" disabled={!lb.hasMore} onClick={() => setPage((p) => p + 1)}>
                  Keyingi
                </Button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">Ma’lumot yo‘q.</p>
        )}
      </Card>

      {edit && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog">
          <Card title={`XP override — ${edit.displayName}`} padding="md" accent="admin" className="max-w-md">
            <p className="mb-3 text-sm text-slate-600">
              Yangi XP kiritiladi; keyingi real XP o‘sishi ushbu qiymat ustiga qo‘shiladi (leaderboard override bilan bir xil
              model).
            </p>
            <label className="mb-3 flex flex-col text-[11px] text-slate-600">
              XP
              <input
                className="mt-1 rounded border border-slate-200 px-2 py-1.5 text-sm"
                value={edit.xp}
                onChange={(e) => setEdit({ ...edit, xp: e.target.value })}
                inputMode="numeric"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                disabled={saving}
                onClick={() => {
                  void (async () => {
                    const xp = Math.max(0, Math.trunc(Number(edit.xp.replace(/\s/g, "").replace(/,/g, "")) || 0));
                    setSaving(true);
                    setErr(null);
                    try {
                      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/gamification/xp-override/${edit.driverId}`, {
                        method: "POST",
                        headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
                        body: JSON.stringify({ xp }),
                      });
                      if (!r.ok) throw new Error(await r.text());
                      setEdit(null);
                      setPage(1);
                      setReloadTick((t) => t + 1);
                    } catch (e) {
                      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
                      else setErr(toErrorMessage(e, "xp"));
                    } finally {
                      setSaving(false);
                    }
                  })();
                }}
              >
                {saving ? "Saqlanmoqda…" : "Saqlash"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  void (async () => {
                    if (!confirm("Override o‘chirilsinmi? (faqat real XP qoladi)")) return;
                    setSaving(true);
                    setErr(null);
                    try {
                      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/gamification/xp-override/${edit.driverId}`, {
                        method: "DELETE",
                        headers: getAdminRequestHeaders(),
                      });
                      if (!r.ok) throw new Error(await r.text());
                      setEdit(null);
                      setPage(1);
                      setReloadTick((t) => t + 1);
                    } catch (e) {
                      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
                      else setErr(toErrorMessage(e, "xp"));
                    } finally {
                      setSaving(false);
                    }
                  })();
                }}
              >
                Reset
              </Button>
              <Button type="button" variant="secondary" disabled={saving} onClick={() => setEdit(null)}>
                Bekor
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
