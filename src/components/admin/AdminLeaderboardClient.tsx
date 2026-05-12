"use client";

import { Card } from "@/components/salom/Card";
import { Button } from "@/components/salom/Button";
import { SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import { toErrorMessage } from "@/lib/toErrorMessage";
import { useEffect, useState } from "react";

type ServiceZoneRow = { id: string; name: string; slug: string };

type AdminLbRow = {
  rank: number;
  driverId: string;
  displayName: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  trips: number;
  score: number;
  ratingAvg: number | null;
  driverCancelsInPeriod: number;
};

type AdminLeaderboardPayload = {
  zone: ServiceZoneRow;
  period: string;
  window: { startsAt: string; endsAt: string };
  rows: AdminLbRow[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export function AdminLeaderboardClient() {
  const [err, setErr] = useState<string | null>(null);
  const [zones, setZones] = useState<ServiceZoneRow[]>([]);
  const [lbZoneId, setLbZoneId] = useState("");
  const lbPeriod = "month" as const;
  const [lbData, setLbData] = useState<AdminLeaderboardPayload | null>(null);
  const [lbLoading, setLbLoading] = useState(false);
  const [edit, setEdit] = useState<null | { driverId: string; displayName: string; score: string }>(null);
  const [saving, setSaving] = useState(false);
  const [endingMonth, setEndingMonth] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    let alive = true;
    void (async () => {
      setErr(null);
      try {
        const zlist = await fetch(`${SALOM_API_URL}/api/v1/admin/zones`, { headers: getAdminRequestHeaders() });
        if (!zlist.ok) throw new Error(await zlist.text());
        if (!alive) return;
        const zArr = (await zlist.json()) as ServiceZoneRow[];
        setZones(zArr);
        if (zArr.length) {
          setLbZoneId((prev) => (prev && zArr.some((z) => z.id === prev) ? prev : zArr[0]!.id));
        }
      } catch (e) {
        if (!alive) return;
        if (e instanceof TypeError) setErr(adminNetworkErrorHint());
        else setErr(toErrorMessage(e, "leaderboard"));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!lbZoneId) return;
    let alive = true;
    setLbLoading(true);
    void (async () => {
      try {
        const u = new URL(`${SALOM_API_URL}/api/v1/admin/gamification/leaderboard`);
        u.searchParams.set("zoneId", lbZoneId);
        u.searchParams.set("period", lbPeriod);
        u.searchParams.set("page", String(page));
        u.searchParams.set("limit", String(pageSize));
        if (searchApplied.trim()) u.searchParams.set("search", searchApplied.trim());
        const r = await fetch(u.toString(), { headers: getAdminRequestHeaders() });
        if (!r.ok) throw new Error(await r.text());
        const data = (await r.json()) as AdminLeaderboardPayload;
        if (!alive) return;
        setLbData(data);
      } catch (e) {
        if (!alive) return;
        setLbData(null);
        if (e instanceof TypeError) setErr(adminNetworkErrorHint());
        else setErr(toErrorMessage(e, "leaderboard"));
      } finally {
        if (alive) setLbLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [lbZoneId, lbPeriod, page, searchApplied]);

  return (
    <div className="grid gap-4">
      {err && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{err}</p>}
      <Card title="Zona va davr" padding="md" accent="admin">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-[11px] text-slate-600">
            Zona
            <select
              className="mt-1 min-w-[200px] rounded border border-slate-200 px-2 py-1.5 text-sm"
              value={lbZoneId}
              onChange={(e) => setLbZoneId(e.target.value)}
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <Button type="button" className="!text-xs" disabled>
              Oylik
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="!text-xs !bg-amber-500 hover:!bg-amber-600"
              disabled={endingMonth}
              onClick={async () => {
                setEndingMonth(true);
                setErr(null);
                try {
                  const r = await fetch(`${SALOM_API_URL}/api/v1/admin/gamification/champions/end-month`, {
                    method: "POST",
                    headers: getAdminRequestHeaders(),
                  });
                  if (!r.ok) throw new Error(await r.text());
                  setPage(1);
                } catch (e) {
                  if (e instanceof TypeError) setErr(adminNetworkErrorHint());
                  else setErr(toErrorMessage(e, "end-month"));
                } finally {
                  setEndingMonth(false);
                }
              }}
            >
              Oy yakunlash (test)
            </Button>
            <Button
              type="button"
              className="!text-xs !bg-slate-100 !text-slate-700"
              disabled={endingMonth}
              onClick={async () => {
                setEndingMonth(true);
                setErr(null);
                try {
                  const r = await fetch(`${SALOM_API_URL}/api/v1/admin/gamification/champions/reset-month`, {
                    method: "POST",
                    headers: getAdminRequestHeaders(),
                  });
                  if (!r.ok) throw new Error(await r.text());
                  setPage(1);
                } catch (e) {
                  if (e instanceof TypeError) setErr(adminNetworkErrorHint());
                  else setErr(toErrorMessage(e, "reset-month"));
                } finally {
                  setEndingMonth(false);
                }
              }}
            >
              Reset
            </Button>
          </div>
          <label className="flex flex-col text-[11px] text-slate-600">
            Qidirish (ism/telefon)
            <input
              className="mt-1 w-[220px] rounded border border-slate-200 px-2 py-1.5 text-sm"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Masalan: Otabek yoki 90 123..."
            />
          </label>
          <Button type="button" className="!text-xs" onClick={() => setSearchApplied(searchDraft)}>
            Search
          </Button>
            {searchDraft.trim() !== searchApplied.trim() && (
              <p className="text-[11px] text-slate-500">Search bosilganda filter qo‘llanadi.</p>
            )}
          {searchApplied.trim() && (
            <Button
              type="button"
              className="!bg-slate-100 !text-slate-700 !text-xs"
              onClick={() => {
                setSearchDraft("");
                setSearchApplied("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </div>
        {lbLoading && <p className="text-sm text-slate-500">Yuklanmoqda…</p>}
        {!lbLoading && lbData && (
          <>
            <p className="mb-2 text-xs text-slate-500">
              {lbData.zone.name} · {lbData.period === "week" ? "hafta" : "oy"} ·{" "}
              <span className="font-mono">{lbData.window.startsAt.slice(0, 16)}</span> —{" "}
              <span className="font-mono">{lbData.window.endsAt.slice(0, 16)}</span> UTC
            </p>
            {searchApplied.trim() && (
              <p className="mb-2 text-[11px] text-slate-500">
                Filter: <span className="font-mono">{searchApplied.trim()}</span> · topildi: {lbData.total} ta
              </p>
            )}
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <div>
                Page <span className="font-mono">{lbData.page}</span> · ko‘rsatilmoqda{" "}
                <span className="font-mono">{lbData.rows.length}</span> / <span className="font-mono">{lbData.total}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="!h-7 !px-2 !py-0 !text-[11px] !bg-slate-100 !text-slate-700"
                  disabled={lbData.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  type="button"
                  className="!h-7 !px-2 !py-0 !text-[11px]"
                  disabled={!lbData.hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Haydovchi</th>
                    <th className="px-2 py-2">Telefon</th>
                    <th className="px-2 py-2">Safar</th>
                    <th className="px-2 py-2">Ball</th>
                    <th className="px-2 py-2">Bekor (davr)</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lbData.rows.map((r) => (
                    <tr
                      key={r.driverId}
                      className={
                        r.rank === 1
                          ? "border-t border-slate-100 bg-amber-50/90"
                          : r.rank === 2
                            ? "border-t border-slate-100 bg-slate-100/90"
                            : r.rank === 3
                              ? "border-t border-slate-100 bg-orange-50/85"
                              : "border-t border-slate-100"
                      }
                    >
                      <td className="px-2 py-1.5 font-mono">{r.rank}</td>
                      <td className="px-2 py-1.5">{r.displayName}</td>
                      <td className="px-2 py-1.5 font-mono">{r.phone}</td>
                      <td className="px-2 py-1.5">{r.trips}</td>
                      <td className="px-2 py-1.5">{r.score}</td>
                      <td className="px-2 py-1.5">{r.driverCancelsInPeriod}</td>
                      <td className="px-2 py-1.5">
                        <Button
                          type="button"
                          className="!h-7 !px-2 !py-0 !text-[11px]"
                          onClick={() => setEdit({ driverId: r.driverId, displayName: r.displayName, score: String(r.score) })}
                        >
                          Edit ball
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lbData.rows.length === 0 && (
                <p className="px-3 py-4 text-sm text-slate-500">Ma’lumot yo‘q (yakunlangan safar kam).</p>
              )}
            </div>
          </>
        )}
      </Card>

      {edit && (
        <Card title="Ballni tahrirlash (oylik)" padding="md" accent="admin">
          <div className="flex flex-wrap items-end gap-3">
            <div className="text-xs text-slate-600">
              <div className="font-medium text-slate-900">{edit.displayName}</div>
              <div className="font-mono text-[11px] text-slate-500">{edit.driverId}</div>
            </div>
            <label className="flex flex-col text-[11px] text-slate-600">
              Ball
              <input
                className="mt-1 w-[140px] rounded border border-slate-200 px-2 py-1.5 text-sm"
                value={edit.score}
                onChange={(e) => setEdit((prev) => (prev ? { ...prev, score: e.target.value } : prev))}
                inputMode="numeric"
              />
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setErr(null);
                  try {
                    const score = Math.max(0, Math.trunc(Number(edit.score || "0")));
                    const r = await fetch(`${SALOM_API_URL}/api/v1/admin/gamification/leaderboard/override/${edit.driverId}`, {
                      method: "POST",
                      headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
                      body: JSON.stringify({ score }),
                    });
                    if (!r.ok) throw new Error(await r.text());
                    setEdit(null);
                    // refresh leaderboard
                    const u = new URL(`${SALOM_API_URL}/api/v1/admin/gamification/leaderboard`);
                    u.searchParams.set("zoneId", lbZoneId);
                    u.searchParams.set("period", lbPeriod);
                    const lb = await fetch(u.toString(), { headers: getAdminRequestHeaders() });
                    if (!lb.ok) throw new Error(await lb.text());
                    setLbData((await lb.json()) as AdminLeaderboardPayload);
                  } catch (e) {
                    if (e instanceof TypeError) setErr(adminNetworkErrorHint());
                    else setErr(toErrorMessage(e, "override"));
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Saqlash
              </Button>
              <Button type="button" className="!bg-slate-100 !text-slate-700" onClick={() => setEdit(null)}>
                Bekor
              </Button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Eslatma: safar soni ball’dan avtomatik hisoblanadi (1 safar = 100 ball).
          </p>
        </Card>
      )}
    </div>
  );
}
