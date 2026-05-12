import { AdminOperatorsView } from "@/components/admin/AdminResourceViews";
import { PageHeader } from "@/components/salom/PageHeader";
import { Card } from "@/components/salom/Card";

export default function AdminOperatorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Operatorlar"
        description="Operator yaratish, telefon/name/zona biriktirish, tasdiqlash, vaqtincha to‘xtatish va o‘chirish."
      />
      <Card title="Operator lifecycle" padding="md" accent="admin">
        <AdminOperatorsView />
      </Card>
    </div>
  );
}
