"use client";

import { useState } from "react";
import { AdminAdjustmentForm, AdminPayoutForm, AdminSecurityBanner, AdminTopUpForm } from "@/components/admin/AdminOpsForms";
import { AdminFinanceView, AdminMonthSettlementsPanel } from "@/components/admin/AdminResourceViews";
import { PageHeader } from "@/components/salom/PageHeader";
import { Card } from "@/components/salom/Card";

export default function AdminFinancePage() {
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Moliya / komissiya"
        description="30 kun, payout / ADJUSTMENT, jadvallar. Payout: haydovchiga haqiqiy to'lov qaydi (balans —)."
      />
      <Card title="Muhit (xavfsizlik)" padding="md" accent="admin">
        <AdminSecurityBanner />
      </Card>
      <Card title="Xulosa" padding="md" accent="admin">
        <AdminFinanceView key={tick} />
      </Card>
      <Card title="Oyma-oy to'lov (pilot) — komissiya va tasdiq" padding="md" accent="admin">
        <AdminMonthSettlementsPanel />
      </Card>
      <Card title="Operatsion (ledger)" padding="md" accent="admin" className="max-w-7xl">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AdminTopUpForm onDone={bump} />
          <AdminPayoutForm onDone={bump} />
          <AdminAdjustmentForm onDone={bump} />
        </div>
      </Card>
    </div>
  );
}
