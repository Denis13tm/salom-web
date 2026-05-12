import { AdminSmsTestForm } from "@/components/admin/AdminSmsTestForm";
import { AdminSmsLogsView } from "@/components/admin/AdminResourceViews";
import { AdminSmsTemplatesView } from "@/components/admin/AdminSmsTemplatesView";
import { PageHeader } from "@/components/salom/PageHeader";
import { Card } from "@/components/salom/Card";

export default function AdminSmsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="SMS shablonlar"
        description="Mijozga yuboriladigan operatsion SMS matnlari. SMS_MODE=log|http|… API: GET/PATCH /api/v1/admin/sms-templates"
      />
      <Card title="Mijoz matnlari" padding="md" accent="admin">
        <AdminSmsTemplatesView />
      </Card>
      <Card title="Test SMS (admin)" padding="md" accent="admin">
        <AdminSmsTestForm />
      </Card>
      <Card title="SMS jurnal (o‘qish)" padding="md" accent="admin">
        <AdminSmsLogsView />
      </Card>
    </div>
  );
}
