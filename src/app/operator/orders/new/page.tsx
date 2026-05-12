import Link from "next/link";
import { QuickOrderForm } from "@/components/operator/QuickOrderForm";
import { PageHeader } from "@/components/salom/PageHeader";
import { Card } from "@/components/salom/Card";

export default function OperatorNewOrderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <nav className="flex items-center gap-1.5 text-slate-500">
            <Link href="/operator" className="transition hover:text-amber-600">
              Operator
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Yangi buyurtma</span>
          </nav>
        }
        title="Tezkor buyurtma"
        description="Telefon va manzil — yuborilgach avtomatik Dispatchga o'tasiz va birdan haydovchilarga e'lon qilasiz."
      />
      <ol className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 sm:gap-3 sm:text-xs">
        <li className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-1 font-semibold text-amber-950">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] text-violet-950">1</span>
          Ma&apos;lumot
        </li>
        <li aria-hidden className="text-slate-300">→</li>
        <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[10px]">2</span>
          E&apos;lon
        </li>
        <li aria-hidden className="text-slate-300">→</li>
        <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-500">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[10px]">3</span>
          Haydovchi javobi
        </li>
      </ol>
      <Card title="Kiritish" description="Agar kerak bo'lsa, keyinroq buni yangilay olasiz" padding="md">
        <QuickOrderForm />
      </Card>
    </div>
  );
}
