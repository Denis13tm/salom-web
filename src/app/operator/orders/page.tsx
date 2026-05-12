import Link from "next/link";
import { OperatorOrdersTable } from "@/components/operator/OperatorOrdersTable";
import { PageHeader } from "@/components/salom/PageHeader";
import { Card } from "@/components/salom/Card";

export default function OperatorOrdersHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <nav className="flex items-center gap-1.5 text-slate-500">
            <Link href="/operator" className="hover:text-amber-600">
              Operator
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Buyurtmalar</span>
          </nav>
        }
        title="Buyurtmalar (so'nggilar)"
        description="Hozirgi API zonadagi 30 buyurtmacha. Mijoz telefon bo‘yicha mahalliy filtr. To'liq tarix: keyin server-side filtr + sahifalash."
      />
      <Card title="Ro‘yxat" padding="md">
        <OperatorOrdersTable />
      </Card>
    </div>
  );
}
