import { AdminDriversTable } from "@/components/admin/AdminDriversTable";
import { PageHeader } from "@/components/salom/PageHeader";
import { Card } from "@/components/salom/Card";

export default function AdminDriversPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Haydovchilar"
        description="Barcha zonalar bo‘yicha haydovchilar. Shah nomi yoki zona slug bo‘yicha qidiring; zonani ro‘yxatdan tanlang. Operator bu yerda tasdiqlay olmaydi."
      />
      <Card title="Ro‘yxat" padding="md" accent="admin">
        <AdminDriversTable />
      </Card>
    </div>
  );
}
