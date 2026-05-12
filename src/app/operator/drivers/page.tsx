import Link from "next/link";
import { PageHeader } from "@/components/salom/PageHeader";
import { OperatorDriversSection } from "./OperatorDriversSection";

export default function OperatorDriversPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <nav className="flex items-center gap-1.5 text-slate-500">
            <Link href="/operator" className="hover:text-amber-600">
              Operator
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Haydovchilar</span>
          </nav>
        }
        title="Haydovchilar (operator)"
        description="Zonadagi ro‘yxat. «Profil» — shaxsiy ma’lumot, zona, transport, hujjatlar, tahrir. Murakkab moderasiya — admin."
      />
      <OperatorDriversSection />
    </div>
  );
}
