"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const OperatorDriversClient = dynamic(
  () =>
    import("@/components/operator/OperatorDriversClient").then((m) => ({
      default: m.OperatorDriversClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-10 text-center text-sm text-slate-600">
        Haydovchilar ro&apos;yxati yuklanmoqda…
      </div>
    ),
  },
);

export function OperatorDriversSection() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-10 text-center text-sm text-slate-600">
          Yuklanmoqda…
        </div>
      }
    >
      <OperatorDriversClient />
    </Suspense>
  );
}
