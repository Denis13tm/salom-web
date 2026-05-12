import { AdminLeaderboardClient } from "@/components/admin/AdminLeaderboardClient";
import { PageHeader } from "@/components/salom/PageHeader";

export default function AdminLeaderboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Chempionlar leaderboard"
        description="Zona bo‘yicha oylik reyting — haydovchi ilovasidagi Chempionlar bo‘limi bilan bir xil hisoblash modeli."
      />
      <AdminLeaderboardClient />
    </div>
  );
}
