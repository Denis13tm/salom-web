"use client";

import { Button } from "@/components/salom/Button";
import { toErrorMessage } from "@/lib/toErrorMessage";
import { SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import { useCallback, useEffect, useState } from "react";

type DriverOption = {
  id: string;
  phone: string;
  balanceUzs: string;
  primaryVehicle?: { plate?: string | null; makeModel?: string | null } | null;
};

function moneyText(v: string | number | null | undefined) {
  const n = typeof v === "number" ? v : Number(String(v ?? "0").replace(/,/g, ""));
  if (!Number.isFinite(n)) return String(v ?? "0");
  return new Intl.NumberFormat("en-US").format(n);
}

function AdminDriverPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (driverId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<DriverOption[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    void (async () => {
      setErr(null);
      try {
        const qs = new URLSearchParams({ take: "40" });
        if (q.trim()) qs.set("q", q.trim());
        const r = await fetch(`${SALOM_API_URL}/api/v1/admin/drivers?${qs.toString()}`, {
          headers: getAdminRequestHeaders(),
          signal: ctrl.signal,
        });
        if (!r.ok) throw new Error(await r.text());
        const j = (await r.json()) as { items?: DriverOption[] };
        if (!cancelled) setItems(j.items ?? []);
      } catch (e) {
        if (!cancelled && !(e instanceof DOMException)) {
          setErr(e instanceof TypeError ? adminNetworkErrorHint() : toErrorMessage(e, "driver qidiruv"));
        }
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [q]);

  return (
    <div className="space-y-1">
      <input
        className="w-full rounded border px-1.5 py-1 text-[10px]"
        placeholder="Telefon yoki mashina raqami bilan qidiring"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select
        className="w-full rounded border px-1.5 py-1 font-mono text-[10px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Driver tanlang…</option>
        {items.map((d) => (
          <option key={d.id} value={d.id}>
            {d.phone} · {moneyText(d.balanceUzs)} so'm · {d.primaryVehicle?.plate ?? d.id.slice(0, 8)}
          </option>
        ))}
      </select>
      {value && <p className="break-all text-[9px] text-slate-500">ID: {value}</p>}
      {err && <p className="text-[9px] text-rose-700">{err}</p>}
    </div>
  );
}

export function AdminPayoutForm({ onDone }: { onDone: () => void }) {
  const [driverId, setDriverId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    setErr(null);
    setOk(null);
    setLoading(true);
    try {
      const n = parseInt(amount, 10);
      if (!driverId.trim() || Number.isNaN(n) || n < 1) {
        setErr("Driver UUID va musbat butun summa (so'm).");
        return;
      }
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/finance/payout-record`, {
        method: "POST",
        headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: driverId.trim(), amountUzs: n, note: note.trim() || undefined }),
      });
      if (!r.ok) throw new Error(await r.text());
      setOk("Payout qayd etildi.");
      setStep("form");
      onDone();
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setLoading(false);
    }
  }, [amount, driverId, note, onDone]);

  const goConfirm = useCallback(() => {
    setErr(null);
    const n = parseInt(amount, 10);
    if (!driverId.trim() || Number.isNaN(n) || n < 1) {
      setErr("Driver UUID va musbat butun summa (so'm).");
      return;
    }
    setStep("confirm");
  }, [amount, driverId]);

  return (
    <div className="space-y-2 rounded-lg border border-violet-200/80 bg-white p-2 text-xs">
      <p className="text-[10px] font-bold uppercase text-slate-500">Haydovchiga to‘lov (PAYOUT)</p>
      <p className="text-[10px] text-slate-600">Joriy balansdan yechib, ledger ga yozadi. Ikki bosqich: ma’lumot → tasdiqlash.</p>
      {step === "form" && (
        <>
          <AdminDriverPicker value={driverId} onChange={setDriverId} />
          <input
            className="w-full rounded border px-1.5 py-1 font-mono text-[10px]"
            placeholder="Summa (so'm)"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            className="w-full rounded border px-1.5 py-1 text-[10px]"
            placeholder="Izoh (ixt.)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {err && <p className="text-[10px] text-rose-700">{err}</p>}
          <Button type="button" variant="secondary" className="!text-xs" disabled={loading} onClick={goConfirm}>
            Keyingi qadam (ko‘rib chiqish)
          </Button>
        </>
      )}
      {step === "confirm" && (
        <div className="space-y-2 rounded border border-amber-200/80 bg-amber-50/50 p-2">
          <p className="text-[10px] font-semibold text-amber-950">Tasdiqlash</p>
          <ul className="list-inside list-disc text-[10px] text-slate-800">
            <li>
              <span className="font-mono">{driverId.trim()}</span> — haydovchi
            </li>
            <li>
              <span className="font-mono">{amount}</span> soʻm
            </li>
            {note.trim() && (
              <li>
                Izoh: <span className="font-mono">{note.trim()}</span>
              </li>
            )}
          </ul>
          {err && <p className="text-[10px] text-rose-700">{err}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="!text-xs" disabled={loading} onClick={() => setStep("form")}>
              Orqaga
            </Button>
            <Button type="button" className="!text-xs" disabled={loading} onClick={() => void submit()}>
              {loading ? "…" : "Payoutni tasdiqlash"}
            </Button>
          </div>
        </div>
      )}
      {ok && <p className="text-[10px] text-emerald-800">{ok}</p>}
    </div>
  );
}

export function AdminTopUpForm({ onDone }: { onDone: () => void }) {
  const [driverId, setDriverId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    setErr(null);
    setOk(null);
    setLoading(true);
    try {
      const n = parseInt(amount, 10);
      if (!driverId.trim() || Number.isNaN(n) || n < 1) {
        setErr("Driver UUID va musbat butun summa (so'm).");
        return;
      }
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/finance/top-up-record`, {
        method: "POST",
        headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: driverId.trim(), amountUzs: n, note: note.trim() || undefined }),
      });
      if (!r.ok) throw new Error(await r.text());
      setOk("Top-up tasdiqlandi va commission walletga qo‘shildi.");
      setAmount("");
      setNote("");
      onDone();
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setLoading(false);
    }
  }, [amount, driverId, note, onDone]);

  return (
    <div className="space-y-2 rounded-lg border border-emerald-200/80 bg-white p-2 text-xs">
      <p className="text-[10px] font-bold uppercase text-slate-500">Balans to‘ldirish (TOP_UP)</p>
      <p className="text-[10px] text-slate-600">Driver tashlagan pulni admin/operator tasdiqlaydi; wallet + bo‘ladi.</p>
      <AdminDriverPicker value={driverId} onChange={setDriverId} />
      <input
        className="w-full rounded border px-1.5 py-1 font-mono text-[10px]"
        placeholder="Summa (so'm)"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <input
        className="w-full rounded border px-1.5 py-1 text-[10px]"
        placeholder="Izoh / chek raqami (ixt.)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {err && <p className="text-[10px] text-rose-700">{err}</p>}
      {ok && <p className="text-[10px] text-emerald-800">{ok}</p>}
      <Button type="button" className="!text-xs" disabled={loading} onClick={() => void submit()}>
        {loading ? "…" : "Top-up tasdiqlash"}
      </Button>
    </div>
  );
}

export function AdminAdjustmentForm({ onDone }: { onDone: () => void }) {
  const [driverId, setDriverId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    setErr(null);
    setOk(null);
    setLoading(true);
    try {
      if (!driverId.trim()) {
        setErr("Driver UUID kiriting.");
        return;
      }
      const n = parseInt(amount, 10);
      if (Number.isNaN(n) || n === 0) {
        setErr("Musbat yoki manfiy butun summa, 0 emas (mas. -5000, 10000).");
        return;
      }
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/finance/ledger-adjustment`, {
        method: "POST",
        headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: driverId.trim(), amountUzs: n, note: note.trim() || undefined }),
      });
      if (!r.ok) throw new Error(await r.text());
      setOk("ADJUSTMENT qayd etildi (reverse / tuzatish).");
      onDone();
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    } finally {
      setLoading(false);
    }
  }, [amount, driverId, note, onDone]);

  return (
    <div className="space-y-2 rounded-lg border border-violet-200/80 bg-white p-2 text-xs">
      <p className="text-[10px] font-bold uppercase text-slate-500">Balansga tuzatish (ADJUSTMENT)</p>
      <p className="text-[10px] text-slate-600">Manfiy: balansdan yechish; musbat: qo‘shish. Natija manfiy bo‘lmasin.</p>
      <AdminDriverPicker value={driverId} onChange={setDriverId} />
      <input
        className="w-full rounded border px-1.5 py-1 font-mono text-[10px]"
        placeholder="Summa (musbat yoki manfiy so'm)"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <input
        className="w-full rounded border px-1.5 py-1 text-[10px]"
        placeholder="Izoh (tavsiya etiladi)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {err && <p className="text-[10px] text-rose-700">{err}</p>}
      {ok && <p className="text-[10px] text-emerald-800">{ok}</p>}
      <Button type="button" className="!text-xs" disabled={loading} onClick={() => void submit()}>
        {loading ? "…" : "Tuzatishni yuborish"}
      </Button>
    </div>
  );
}

export function AdminSecurityBanner() {
  const [data, setData] = useState<{
    allowLegacyAuthHeaders: boolean;
    exchangeSecretConfigured: boolean;
    smsMode?: string;
    otpLoginEnabled?: boolean;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/config/security`, { headers: getAdminRequestHeaders() });
      if (!r.ok) throw new Error(await r.text());
      setData((await r.json()) as typeof data);
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "xato"));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  if (err) {
    return <p className="text-[10px] text-rose-600">{err}</p>;
  }
  if (!data) {
    return <p className="text-[10px] text-slate-500">Sozlama (xavfsizlik) yuklanmoqda…</p>;
  }
  return (
    <div className="rounded border border-amber-200/80 bg-amber-50/60 p-2 text-[10px] text-amber-950">
      <p>
        <strong>Legacy sarlavhalar</strong>: {data.allowLegacyAuthHeaders ? "yoqilgan" : "o‘chirilgan"} — production da odatda
        Bearer va <code>ALLOW_LEGACY_AUTH_HEADERS=false</code>.
      </p>
      <p className="mt-0.5">
        <strong>Exchange secret</strong>: {data.exchangeSecretConfigured ? "sozlangan" : "yo'q (dev pilot)"}
      </p>
      <p className="mt-0.5">
        <strong>SMS_MODE (API)</strong>: {data.smsMode ?? "—"} (log / http)
      </p>
      <p className="mt-0.5">
        <strong>OTP login (Phase 18)</strong>: {data.otpLoginEnabled ? "yoqilgan" : "o‘chirilgan"} (API maydoni) — to‘liq oqim keyin
      </p>
      <Button type="button" variant="secondary" className="!mt-1 !text-[10px]" onClick={() => void load()}>
        Yangilash
      </Button>
    </div>
  );
}
