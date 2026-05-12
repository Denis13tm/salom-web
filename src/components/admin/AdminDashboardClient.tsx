"use client";

import { Button } from "@/components/salom/Button";
import { toErrorMessage } from "@/lib/toErrorMessage";
import { SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import { useSalomAdminAuthRefetch } from "@/lib/useSalomAdminAuthRefetch";
import { useSalomPreferences } from "@/lib/salomPreferences";
import { useCallback, useEffect, useState } from "react";

type Dashboard = {
  generatedAt: string;
  ordersToday: number;
  completedToday: number;
  cancelledToday: number;
  cancelRate: number;
  activeDrivers: number;
  onlineDrivers: number;
  openDisputes: number;
  gmvUzs: number;
  commissionUzs: number;
  totalDriverBalanceUzs: number;
  pricing: {
    meterBaseUzs: number;
    meterPerKmUzs: number;
    platformCommissionBps: number;
  };
};

export function AdminDashboardClient() {
  const { t } = useSalomPreferences();
  const [data, setData] = useState<Dashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/dashboard`, {
        headers: getAdminRequestHeaders(),
      });
      if (!r.ok) throw new Error(await r.text());
      setData((await r.json()) as Dashboard);
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

  if (loading && !data) {
    return <p className="text-sm text-slate-500">{t("loading")}</p>;
  }

  if (err && !data) {
    return (
      <div className="rounded-xl border border-rose-200/80 bg-rose-50/70 px-3 py-2 text-sm text-rose-900 salom-alert-error" role="alert">
        {err}
        <Button type="button" variant="secondary" className="!mt-2 !text-xs" onClick={() => void load()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const cells = [
    { k: t("todaysOrders"), v: data.ordersToday },
    { k: t("completedToday"), v: data.completedToday },
    { k: t("cancelledToday"), v: data.cancelledToday },
    { k: t("cancelRate"), v: `${(data.cancelRate * 100).toFixed(1)}%` },
    { k: t("activeDriversStat"), v: data.activeDrivers },
    { k: t("onlineDriversStat"), v: data.onlineDrivers },
    { k: t("openDisputesStat"), v: data.openDisputes },
    { k: t("gmvToday"), v: data.gmvUzs.toLocaleString("uz-UZ") },
    { k: t("commissionToday"), v: data.commissionUzs.toLocaleString("uz-UZ") },
    { k: t("totalDriverBalance"), v: Number(data.totalDriverBalanceUzs).toLocaleString("uz-UZ") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" className="!text-xs" onClick={() => void load()}>
          {t("refresh")}
        </Button>
        <span className="text-[11px] text-slate-500">{t("updatedAt")}: {new Date(data.generatedAt).toLocaleString("uz-UZ")}</span>
      </div>
      {err && (
        <p className="rounded border border-amber-200/80 bg-amber-50/70 px-2 py-1 text-xs text-amber-950 salom-alert-warn" role="status">
          {err}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cells.map((c) => (
          <div key={c.k} className="salom-stat-card rounded-xl border border-violet-200/70 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600/80">{c.k}</p>
            <p className="mt-0.5 font-mono text-lg font-semibold text-slate-900 salom-stat-value">{c.v}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-[11px] text-slate-500 salom-pricing-note">
        Taxometr env: bazaviy {data.pricing.meterBaseUzs} + km × {data.pricing.meterPerKmUzs} so'm · platforma{" "}
        {data.pricing.platformCommissionBps / 100}%
      </div>
    </div>
  );
}
