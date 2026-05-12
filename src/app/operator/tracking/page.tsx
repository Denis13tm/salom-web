import { PageHeader } from "@/components/salom/PageHeader";
import { OperatorLivePanel } from "./OperatorLivePanel";

export default function OperatorTrackingPage() {
  return (
    <div className="w-full">
      <div className="border-b border-emerald-100/90 bg-white/75 px-3 py-4 backdrop-blur-sm sm:px-5 sm:py-5">
        <PageHeader
          eyebrow={<span className="font-semibold uppercase tracking-[0.2em] text-emerald-800/85">Jonli monitoring</span>}
          className="border-none pb-0 sm:flex-row sm:items-start sm:justify-between"
          title="Jonli xarita"
          description="Zonani chapda tanlang; markerlar haydovchilarning so‘nggi GPS nuqtasini ko‘rsatadi."
        />
      </div>
      <OperatorLivePanel />
    </div>
  );
}
