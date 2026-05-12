import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { PageHeader } from "@/components/salom/PageHeader";
import Link from "next/link";
import { Card } from "@/components/salom/Card";

export default function AdminHome() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Asosiy ko‘rinish"
        description="Buyurtmalar va operatsion ko‘rsatkichlar shu yerda yig‘iladi. Ma’lumotlar tizimga kirganingizdan keyin avtomatik yangilanadi."
        actions={
          <div className="flex flex-wrap gap-2 text-xs">
            <Link className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 font-medium text-violet-900 hover:border-violet-400" href="/admin/applications">
              Arizalar
            </Link>
            <Link className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 font-medium text-violet-900 hover:border-violet-400" href="/admin/drivers">
              Haydovchilar
            </Link>
          </div>
        }
      />
      <Card title="Ko‘rsatkichlar" description="Umumiy statistika (dashboard)" padding="md" accent="admin">
        <AdminDashboardClient />
      </Card>
    </div>
  );
}
