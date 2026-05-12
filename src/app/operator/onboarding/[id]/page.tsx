import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/salom/PageHeader";
import { OperatorOnboardingDetailClient } from "@/components/operator/OperatorOnboardingDetailClient";

export default async function OperatorOnboardingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <Link href="/operator" className="hover:text-amber-600">
              Operator
            </Link>
            <span>/</span>
            <Link href="/operator/onboarding" className="hover:text-amber-600">
              Arizalar
            </Link>
            <span>/</span>
            <span className="text-slate-600">Batafsil</span>
          </nav>
        }
        title="Ariza — batafsil"
        description="Shaxs, transport, hujjatlar. Faqat sizning xizmat zonangizdagi haydovchilar ko'rinadi."
      />
      <Suspense
        fallback={<p className="text-sm text-slate-500">Yuklanmoqda…</p>}
      >
        <OperatorOnboardingDetailClient driverId={id} />
      </Suspense>
    </div>
  );
}
