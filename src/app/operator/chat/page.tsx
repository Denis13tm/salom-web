import { PageHeader } from "@/components/salom/PageHeader";
import { OperatorChatInboxClient } from "@/components/operator/OperatorChatInboxClient";
import { Suspense } from "react";

export default function OperatorChatPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col space-y-4">
      <PageHeader
        title="Haydovchi chat (messaging)"
        description="Operator ↔ haydovchi 1:1 yozishma. Haydovchi ilovasidagi oyna bilan sinxron; jadvalda kamida bitta xabari bo‘lgan suhbatlar. Tanlang, javob bering. Yangilanish: WebSocket + yedek polling."
      />
      <Suspense fallback={<p className="text-sm text-slate-500">Yuklanmoqda…</p>}>
        <OperatorChatInboxClient />
      </Suspense>
    </div>
  );
}
