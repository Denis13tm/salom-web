import Link from "next/link";
import { OperatorDriverProfileClient } from "@/components/operator/OperatorDriverProfileClient";
import { PageHeader } from "@/components/salom/PageHeader";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ driverId: string }>;
  searchParams: Promise<{ serviceZoneId?: string }>;
};

export default async function OperatorDriverProfilePage({ params, searchParams }: PageProps) {
  const p = await params;
  const sp = await searchParams;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <nav className="flex items-center gap-1.5 text-slate-500">
            <Link href="/operator" className="hover:text-amber-600">
              Operator
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/operator/drivers" className="hover:text-amber-600">
              Haydovchilar
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Profil</span>
          </nav>
        }
        title="Haydovchi profili"
        description="Shaxsiy ma’lumot, zona va transport — faqat ko‘rish (o‘zgartirish Administrator uchun). Operator faqat «Operator eslatmasi»ni saqlashi mumkin. Balans va hujjatlar — Administrator orqali."
      />
      <Suspense
        fallback={
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-10 text-center text-sm text-slate-600">
            Yuklanmoqda…
          </div>
        }
      >
        <OperatorDriverProfileClient
          driverId={p.driverId}
          initialServiceZoneId={sp.serviceZoneId ?? null}
        />
      </Suspense>
    </div>
  );
}
