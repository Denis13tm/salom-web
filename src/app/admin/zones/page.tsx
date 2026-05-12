import { AdminZonesView } from "@/components/admin/AdminResourceViews";
import { PageHeader } from "@/components/salom/PageHeader";
import { Card } from "@/components/salom/Card";

export default function AdminZonesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Zonalar"
        description="Yangi zona qo‘shish (masalan G‘allaorol), METER narxlari — global env yoki zona bo‘yicha."
      />
      <Card title="Guliston va boshqalar" padding="md" accent="admin">
        <AdminZonesView />
      </Card>
    </div>
  );
}
