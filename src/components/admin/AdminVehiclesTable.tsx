"use client";

import { Button } from "@/components/salom/Button";
import { toErrorMessage } from "@/lib/toErrorMessage";
import { SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import { useSalomAdminAuthRefetch } from "@/lib/useSalomAdminAuthRefetch";
import { useCallback, useEffect, useRef, useState } from "react";

export function AdminVehiclesTable() {
  const [rows, setRows] = useState<
    {
      id: string;
      plate: string;
      makeModel: string;
      isActive: boolean;
      driver: { id: string; user: { phone: string } };
      serviceZone: { name: string } | null;
    }[]
  >([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const qRef = useRef(q);
  qRef.current = q;
  const [, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const u = new URL(`${SALOM_API_URL}/api/v1/admin/vehicles`);
      u.searchParams.set("take", "80");
      u.searchParams.set("skip", "0");
      const qu = qRef.current.trim();
      if (qu) u.searchParams.set("q", qu);
      const r = await fetch(u.toString(), { headers: getAdminRequestHeaders() });
      if (!r.ok) throw new Error(await r.text());
      const j = (await r.json()) as { total: number; items: (typeof rows)[number][] };
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
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[10rem] flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
          placeholder="Raqam / model"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void load()}
        />
        <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
          Qidirish
        </Button>
      </div>
      {err && <p className="text-xs text-rose-800">{err}</p>}
      <p className="text-xs text-slate-500">Jami {total}</p>
      <div className="overflow-x-auto rounded-xl border border-violet-200">
        <table className="w-full min-w-[600px] text-left text-xs">
          <thead className="border-b border-violet-200 bg-violet-50/80 text-[10px] font-bold uppercase">
            <tr>
              <th className="px-2 py-2">Raqam</th>
              <th className="px-2 py-2">Model</th>
              <th className="px-2 py-2">Haydovchi</th>
              <th className="px-2 py-2">Zona</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className="border-b border-slate-100">
                <td className="px-2 py-1.5 font-mono">{v.plate}</td>
                <td className="px-2 py-1.5">{v.makeModel}</td>
                <td className="px-2 py-1.5 font-mono">{v.driver.user.phone}</td>
                <td className="px-2 py-1.5">{v.serviceZone?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
