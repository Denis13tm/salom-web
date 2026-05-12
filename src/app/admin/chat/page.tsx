import { AdminChatInboxClient } from "@/components/admin/AdminChatInboxClient";
import { Card } from "@/components/salom/Card";
import { PageHeader } from "@/components/salom/PageHeader";

export default function AdminDriverChatPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Haydovchi chat"
        description="Administrator ↔ haydovchi maxfiy yozishma (masalan, faollashtirish kodi). Operator bilan operator panel orqali alohida."
      />
      <Card title="Yozishmalar" padding="md" accent="admin">
        <AdminChatInboxClient />
      </Card>
    </div>
  );
}
