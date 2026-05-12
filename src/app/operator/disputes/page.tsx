import Link from "next/link";
import { PageHeader } from "@/components/salom/PageHeader";
import { Card } from "@/components/salom/Card";
import { OperatorDisputesTable } from "@/components/operator/OperatorDisputesTable";

export default function OperatorDisputesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <nav className="flex items-center gap-1.5 text-slate-500">
            <Link href="/operator" className="hover:text-amber-600">
              Operator
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Nizolar</span>
          </nav>
        }
        title="Nizolar va insidentlar"
        description="Ochiq nizolar (status DISPUTED) — API: GET /api/v1/operator/trips/disputed"
      />
      <Card
        title="Ochiq nizolar"
        description="Yozuvlar yangilangan bo'yicha. Zona: pilot (default) yoki barcha."
        padding="md"
        accent="operator"
      >
        <OperatorDisputesTable />
      </Card>
    </div>
  );
}
