import { AdminTariffsView } from "@/components/admin/AdminResourceViews";
import { PageHeader } from "@/components/salom/PageHeader";
import { Card } from "@/components/salom/Card";

export default function AdminTariffsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarif / taxometr"
        description="Hozirgi METER sozlamalari (env) — keyin zonalangan narx jadvali API ga ko‘chadi."
      />
      <Card title="Aktiv parametr" padding="md" accent="admin">
        <AdminTariffsView />
      </Card>
    </div>
  );
}
