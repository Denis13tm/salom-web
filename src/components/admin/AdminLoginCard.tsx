"use client";

import Link from "next/link";
import { useState } from "react";
import { loginAdminWithPassword } from "@/lib/salomAdmin";
import { toErrorMessage } from "@/lib/toErrorMessage";

export function AdminLoginCard({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await loginAdminWithPassword(password);
      onSuccess();
    } catch (e) {
      setErr(toErrorMessage(e, "kirish"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-violet-100/90 via-white to-violet-50/80 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-violet-200/90 bg-white/95 p-8 shadow-xl shadow-violet-200/40 backdrop-blur-sm">
        <div className="mb-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-800 text-sm font-bold text-amber-100 shadow-md">
            A
          </span>
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Admin panel</h1>
          <p className="mt-1 text-sm text-slate-600">Kirish uchun maxfiy parolni kiriting (server sozlamasi).</p>
        </div>
        <form className="space-y-4" onSubmit={(e) => void submit(e)}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-violet-800">Parol</span>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-violet-200 bg-violet-50/40 px-4 py-3 text-sm text-slate-900 outline-none ring-violet-400/30 transition focus:border-violet-400 focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          {err && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 py-3 text-sm font-semibold text-white shadow-md transition hover:from-violet-500 hover:to-purple-600 disabled:opacity-60"
          >
            {busy ? "Kutilmoqda…" : "Kirish"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">
          <Link href="/" className="font-medium text-violet-700 underline-offset-2 hover:underline">
            ← Bosh sahifa
          </Link>
        </p>
      </div>
    </div>
  );
}
