import Link from "next/link";
import { AdminDriverDetailClient } from "@/components/admin/AdminDriverDetailClient";
import { PageHeader } from "@/components/salom/PageHeader";

export default async function AdminDriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link href="/admin" className="hover:text-violet-800">
              Admin
            </Link>
            <span>/</span>
            <Link href="/admin/drivers" className="hover:text-violet-800">
              Haydovchilar
            </Link>
            <span>/</span>
            <span className="text-slate-600">Profil</span>
          </nav>
        }
        title="Haydovchi profili"
        description="Hujjatlar, transport, obuna, so'nggi safar va ledger. Tasdiqlash / to'xtatish."
      />
      <AdminDriverDetailClient id={id} />
    </div>
  );
}
