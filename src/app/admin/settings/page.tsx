import { PageHeader } from "@/components/salom/PageHeader";
import { AdminSettingsClient } from "@/components/admin/AdminSettingsClient";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sozlamalar"
        description="Xavfsizlik, narxlash, SMS, zonalar va panel ko‘rinishi bo‘yicha amaliy boshqaruv markazi."
      />
      <AdminSettingsClient />
    </div>
  );
}
