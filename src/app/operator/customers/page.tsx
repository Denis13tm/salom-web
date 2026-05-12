import Link from "next/link";
import { PageHeader } from "@/components/salom/PageHeader";
import { Card } from "@/components/salom/Card";

export default function OperatorCustomersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <nav className="flex items-center gap-1.5 text-slate-500">
            <Link href="/operator" className="hover:text-amber-600">
              Operator
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Mijozlar</span>
          </nav>
        }
        title="Mijozlar"
        description="Telefon, last order, tez-takror mo'ljal — keyingi avlod CRM."
      />
      <Card title="Hozircha" description="Mijozlar ombori API rejasida" padding="md">
        <p className="text-sm text-slate-600">Tezkor qidiruv: buyurtmalar tarixidan telefon bo'yicha; avto-to'ldirish — Tezkor buyurtmada so'nggi raqam.</p>
      </Card>
    </div>
  );
}
