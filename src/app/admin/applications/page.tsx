import { AdminPendingDrivers } from "@/components/admin/AdminPendingDrivers";
import { PageHeader } from "@/components/salom/PageHeader";
import { Card } from "@/components/salom/Card";

export default function AdminApplicationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Arizalar (onboarding)"
        description="SUBMITTED / UNDER_REVIEW holatidagi haydovchilar. Tasdiqlash va rad — faqat shu yerda (yoki haydovchi profilida)."
      />
      <Card title="Kutilayotganlar" padding="md" accent="admin">
        <AdminPendingDrivers />
      </Card>
    </div>
  );
}
