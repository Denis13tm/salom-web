import { AdminSubscriptionsView } from "@/components/admin/AdminResourceViews";
import { PageHeader } from "@/components/salom/PageHeader";
import { Card } from "@/components/salom/Card";

export default function AdminSubscriptionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Obunalar" description="Paketlar va joriy obunalar" />
      <Card title="So‘ngra kengayadi" padding="md" accent="admin">
        <AdminSubscriptionsView />
      </Card>
    </div>
  );
}
