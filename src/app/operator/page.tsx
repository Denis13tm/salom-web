import { PageHeader } from "@/components/salom/PageHeader";
import { OperatorDashboardClient } from "@/components/operator/OperatorDashboardClient";

export default function OperatorHome() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<span className="font-semibold uppercase tracking-[0.2em] text-emerald-800/85">Operator workspace</span>}
        className="border-b border-emerald-200/55 pb-7 sm:flex-row sm:items-start sm:justify-between"
        title="Ish oqimini boshqarish"
        description="Tanlangan shaharda buyurtmalar, haydovchilar va jonli monitoring — bitta ish stolidan."
      />
      <OperatorDashboardClient />
    </div>
  );
}
