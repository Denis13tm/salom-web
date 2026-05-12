import { AdminDriverNotificationsClient } from "@/components/admin/AdminDriverNotificationsClient";
import { PageHeader } from "@/components/salom/PageHeader";

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Haydovchilarga xabar"
        description="Yangilik va e’lonlar: tasdiqlangan haydovchilarga jonli ilova (Socket) va/yoki push (FCM). Operatorlar alohida."
      />
      <AdminDriverNotificationsClient />
    </div>
  );
}
