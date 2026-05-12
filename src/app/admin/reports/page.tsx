import { AdminPilotReportView, AdminReportsView } from "@/components/admin/AdminResourceViews";
import { PageHeader } from "@/components/salom/PageHeader";
import { Card } from "@/components/salom/Card";

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hisobotlar"
        description="Pilot KPI, kunlik qatorlar (GMV + komissiya), zona va bekor sabablari (UTC). CSV: shu sahifadagi tugmalar (kunlik + pilot KPI)."
      />
      <Card title="Pilot / launch ops" padding="md" accent="admin">
        <AdminPilotReportView />
      </Card>
      <Card title="Kunlik qatorlar" padding="md" accent="admin">
        <AdminReportsView />
      </Card>
    </div>
  );
}
