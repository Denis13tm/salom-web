"use client";

import { Button } from "@/components/salom/Button";
import { toErrorMessage } from "@/lib/toErrorMessage";
import { SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import { useCallback, useEffect, useState } from "react";

type Row = { id: string; code: string; bodyUz: string; isActive: boolean };

export function AdminSmsTemplatesView() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { body: string; active: boolean }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/sms-templates`, { headers: getAdminRequestHeaders() });
      if (!r.ok) throw new Error(await r.text());
      const j = (await r.json()) as Row[];
      setRows(j);
      const e: Record<string, { body: string; active: boolean }> = {};
      for (const x of j) e[x.code] = { body: x.bodyUz, active: x.isActive };
      setEdits(e);
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (code: string) => {
    const e = edits[code];
    if (!e) return;
    setBusy(code);
    setErr(null);
    try {
      const r = await fetch(
        `${SALOM_API_URL}/api/v1/admin/sms-templates/${encodeURIComponent(code)}`,
        {
          method: "PATCH",
          headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ bodyUz: e.body, isActive: e.active }),
        },
      );
      if (!r.ok) throw new Error(await r.text());
      await load();
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setBusy(null);
    }
  };

  if (err && rows.length === 0) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-rose-700">{err}</p>
        <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
          Qayta
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {err && <p className="text-[10px] text-rose-700">{err}</p>}
      <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
        Yangilash
      </Button>
      <p className="text-[10px] text-slate-600">
        Mijoz SMS matnlari.         O‘zgaruvchilar: <code className="rounded bg-slate-100 px-0.5">{"{{pickupLandmark}}"}</code>,{" "}
        <code className="rounded bg-slate-100 px-0.5">{"{{grossUzs}}"}</code> (kodga qarab).
      </p>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-slate-200 p-2">
            <p className="font-mono text-[10px] text-violet-800">{r.code}</p>
            <label className="mt-1 flex items-center gap-2 text-[10px]">
              <input
                type="checkbox"
                checked={edits[r.code]?.active ?? r.isActive}
                onChange={(e) =>
                  setEdits((prev) => ({
                    ...prev,
                    [r.code]: { body: prev[r.code]?.body ?? r.bodyUz, active: e.target.checked },
                  }))
                }
              />
              Active
            </label>
            <textarea
              className="mt-1 w-full min-h-[72px] rounded border p-1.5 font-mono text-[10px]"
              value={edits[r.code]?.body ?? r.bodyUz}
              onChange={(e) =>
                setEdits((prev) => ({
                  ...prev,
                  [r.code]: { body: e.target.value, active: prev[r.code]?.active ?? r.isActive },
                }))
              }
            />
            <Button
              type="button"
              className="!mt-1 !text-xs"
              disabled={busy !== null}
              onClick={() => void save(r.code)}
            >
              {busy === r.code ? "…" : "Saqlash"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
