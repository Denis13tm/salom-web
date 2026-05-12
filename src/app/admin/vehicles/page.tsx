import { AdminVehiclesTable } from "@/components/admin/AdminVehiclesTable";
import { PageHeader } from "@/components/salom/PageHeader";
import { Card } from "@/components/salom/Card";

export default function AdminVehiclesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Transportlar" description="Barcha transportlar, haydovchi telefoni, zona — GET /api/v1/admin/vehicles" />
      <Card title="Jadval" padding="md" accent="admin">
        <AdminVehiclesTable />
      </Card>
    </div>
  );
}
