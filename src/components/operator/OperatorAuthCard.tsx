"use client";

import { Card } from "@/components/salom/Card";
import Link from "next/link";

type Props = {
  /** `exchange` muvaffaqiyatidan keyin (mas. dashboard: ma'lumotni qayta yuklash) */
  onAfterExchange?: (accessToken: string) => void;
  title?: string;
  description?: string;
};

export function OperatorAuthCard({
  title = "Operator hisobi",
  description = "Operator sessiyasi topilmadi. Hisobingiz admin tomonidan yaratilgan va biriktirilgan bo‘lishi kerak.",
}: Props) {
  return (
    <Card title={title} description={description} padding="md" accent="operator">
      <p className="text-sm text-slate-600">
        Operator panelga kirish admin tomonidan berilgan sessiya orqali ishlaydi. Hisobingiz faol bo‘lmasa yoki brauzer sessiyasi yo‘qolgan
        bo‘lsa, administrator operator profilingizni tekshirib qayta kirishni yoqishi kerak.
      </p>
      <Link href="/operator/settings" className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline">
        Operator sozlamalariga o‘tish
      </Link>
    </Card>
  );
}
