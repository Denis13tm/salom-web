import { AdminXpClient } from "@/components/admin/AdminXpClient";
import { PageHeader } from "@/components/salom/PageHeader";

export default function AdminXpPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageHeader
        title="Haydovchi XP va tier"
        description="Bonus miqdori (so‘m), tier jadvali va zona bo‘yicha haydovchilar XP ro‘yxati. XP ni tahrirlash leaderboard override bilan bir xil reaktiv modelda ishlaydi."
      />
      <AdminXpClient />
    </div>
  );
}
