"use client";

import Link from "next/link";
import { useState } from "react";
import { loginOperatorWithPassword } from "@/lib/salomOperator";
import { toErrorMessage } from "@/lib/toErrorMessage";

export function OperatorLoginCard({ onSuccess }: { onSuccess: () => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await loginOperatorWithPassword(phone, password);
      onSuccess();
    } catch (e) {
      setErr(toErrorMessage(e, "kirish"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-emerald-50/95 via-white to-teal-50/90 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-emerald-200/90 bg-white/95 p-8 shadow-xl shadow-emerald-200/35 backdrop-blur-sm">
        <div className="mb-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--salom-lime)] text-emerald-950 shadow-md ring-1 ring-emerald-900/15">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.5 6.2A2.7 2.7 0 0 0 15.2 5H8.8a2.7 2.7 0 0 0-2.4 1.3L4.6 10H3.5c-.7 0-1.4.6-1.5 1.3L2 12.3V18c0 .8.6 1.4 1.4 1.4h1.2a1.7 1.7 0 0 0 3.3 0h9a1.7 1.7 0 0 0 3.3 0H21c.8 0 1.4-.6 1.4-1.4v-4.2c0-.6-.3-1-.8-1.2L19.8 8.3l-2.3-2.1Z" />
            </svg>
          </span>
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Operator panel</h1>
          <p className="mt-1 text-sm text-slate-600">Admin bergan telefon va parol bilan kiring.</p>
        </div>
        <form className="space-y-4" onSubmit={(e) => void submit(e)}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-emerald-900/80">Telefon</span>
            <input
              type="tel"
              autoComplete="username"
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50/30 px-4 py-3 font-mono text-sm text-slate-900 outline-none ring-emerald-400/25 transition focus:border-emerald-400 focus:ring-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998901234567"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-emerald-900/80">Parol</span>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50/30 px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-400/25 transition focus:border-emerald-400 focus:ring-2"
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
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {busy ? "Kutilmoqda…" : "Kirish"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">
          <Link href="/" className="font-medium text-emerald-800 underline-offset-2 hover:underline">
            ← Bosh sahifa
          </Link>
        </p>
      </div>
    </div>
  );
}
