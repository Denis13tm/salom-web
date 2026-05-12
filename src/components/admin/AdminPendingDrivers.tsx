"use client";

import { Button } from "@/components/salom/Button";
import { toErrorMessage } from "@/lib/toErrorMessage";
import { SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import { useSalomAdminAuthRefetch } from "@/lib/useSalomAdminAuthRefetch";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Item = { id: string; phone: string; accountStatus: string; balanceUzs: string; zone: { name: string } | null };

export function AdminPendingDrivers() {
  const [rows, setRows] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/drivers/pending`, { headers: getAdminRequestHeaders() });
      if (!r.ok) throw new Error(await r.text());
      const j = (await r.json()) as { total: number; items: Item[] };
      setTotal(j.total);
      setRows(j.items);
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useSalomAdminAuthRefetch(() => void load());

  return (
    <div className="space-y-3 text-sm">
      <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
        Yangilash
      </Button>
      {err && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">{err}</div>}
      <p className="text-xs text-slate-500">Kutilayotgan tasdiq: {total} {loading ? "…" : ""}</p>
      <div className="overflow-x-auto rounded-xl border border-violet-200">
        <table className="w-full min-w-[500px] text-left text-xs">
          <thead className="border-b border-violet-200 bg-violet-50/80 text-[10px] font-bold uppercase">
            <tr>
              <th className="px-2 py-2">Telefon</th>
              <th className="px-2 py-2">Zona</th>
              <th className="px-2 py-2">Balans</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-2 py-1.5 font-mono">{r.phone}</td>
                <td className="px-2 py-1.5">{r.zone?.name ?? "—"}</td>
                <td className="px-2 py-1.5 font-mono">{r.balanceUzs}</td>
                <td className="px-2 py-1.5">
                  <Link className="text-violet-800 underline" href={`/admin/drivers/${r.id}`}>
                    Ko‘rish
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
