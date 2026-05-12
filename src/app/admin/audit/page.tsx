import { AdminAuditView } from "@/components/admin/AdminResourceViews";
import { PageHeader } from "@/components/salom/PageHeader";
import { Card } from "@/components/salom/Card";

export default function AdminAuditPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit jurnali"
        description="Muhim operatsion yozuvlar — tizim to‘ldirganda to‘liq bo‘ladi (actor, before/after)."
      />
      <Card title="So‘nggi yozuvlar" padding="md" accent="admin">
        <AdminAuditView />
      </Card>
    </div>
  );
}
