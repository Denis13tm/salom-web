import { PageHeader } from "@/components/salom/PageHeader";
import { AdminChampionsBannersClient } from "@/components/admin/AdminChampionsBannersClient";

export default function AdminChampionsBannersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Chempionlar — reklama bannerlari"
        description="Haydovchi ilovasida sovrin kartasi bilan bir qatorda aylanadigan reklama rasmlari va karusel intervali."
      />
      <AdminChampionsBannersClient />
    </div>
  );
}
