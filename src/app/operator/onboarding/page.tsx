import Link from "next/link";
import { PageHeader } from "@/components/salom/PageHeader";
import { OperatorOnboardingListClient } from "@/components/operator/OperatorOnboardingListClient";

export default function OperatorOnboardingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <nav className="flex items-center gap-1.5 text-slate-500">
            <Link href="/operator" className="hover:text-amber-600">
              Operator
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Haydovchi arizalari</span>
          </nav>
        }
        title="Haydovchi arizalari (tasdiq)"
        description="O'z xizmat zonangizda «Yuborilgan» yoki «Ko'rib chiqilmoqda» holatidagi arizalarni ko'ring, tasdiqlang yoki rad eting. Tasdiqda haydovchiga 12 xonali faollashtirish kodi yuboriladi."
      />
      <OperatorOnboardingListClient />
    </div>
  );
}
