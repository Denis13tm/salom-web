import { PageHeader } from "@/components/salom/PageHeader";
import Link from "next/link";
import { DispatchPanel } from "./DispatchPanel";

type PageProps = { searchParams: Promise<{ new?: string; zone?: string }> };

export default async function OperatorDispatchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={
          <nav className="flex items-center gap-1.5 text-slate-500">
            <Link href="/operator" className="transition hover:text-amber-600">
              Operator
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Dispatch</span>
          </nav>
        }
        title="Dispatch — e'lon"
        description="Yangi yoki avvalgilar. Tezkor buyurtmadan o'tgan bo'lsangiz, ayni buyurtmada bitta e'lon bosing."
      />
      <ol className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 sm:gap-3 sm:text-xs">
        <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[10px]">1</span>
          Buyurtma
        </li>
        <li aria-hidden className="text-slate-300">→</li>
        <li className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-1 font-semibold text-amber-950">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] text-violet-950">2</span>
          E&apos;lon
        </li>
        <li aria-hidden className="text-slate-300">→</li>
        <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-500">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[10px]">3</span>
          Haydovchi
        </li>
      </ol>
      <DispatchPanel
        newOrderIdFromQuery={sp.new ?? null}
        orderZoneIdFromQuery={sp.zone ?? null}
      />
    </div>
  );
}
