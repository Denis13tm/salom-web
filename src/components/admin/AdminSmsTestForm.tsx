"use client";

import { Button } from "@/components/salom/Button";
import { toErrorMessage } from "@/lib/toErrorMessage";
import { SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import { useState } from "react";

export function AdminSmsTestForm() {
  const [toPhone, setToPhone] = useState("");
  const [body, setBody] = useState("Salom Taxi: test");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/notifications/sms-test`, {
        method: "POST",
        headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ toPhone, body: body || undefined }),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = (await r.json()) as { logId?: string };
      setMsg(j.logId ? `Yuborildi, log: ${j.logId}` : "OK");
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md space-y-2 text-sm">
      <p className="text-[10px] text-slate-600">
        <code>POST /api/v1/admin/notifications/sms-test</code> — SMS jurnal + SMS_MODE bo‘yicha.
      </p>
      <label className="text-xs text-slate-600">
        Telefon
        <input
          className="mt-1 w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs"
          value={toPhone}
          onChange={(e) => setToPhone(e.target.value)}
          placeholder="+998..."
        />
      </label>
      <label className="text-xs text-slate-600">
        Matn
        <textarea
          className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-xs"
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      {err && <p className="text-xs text-rose-700">{err}</p>}
      {msg && <p className="text-xs text-emerald-800">{msg}</p>}
      <Button type="button" className="!text-xs" disabled={busy || !toPhone.trim()} onClick={() => void send()}>
        {busy ? "…" : "Yuborish"}
      </Button>
    </div>
  );
}
