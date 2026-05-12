"use client";

import { BEARER_KEY } from "@/lib/salomOperator";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Legacy header o'rniga pilotda JWT talab qilinadi; token yo'q bo'lsa ogohlantirish.
 */
export function OperatorBearerStrip() {
  const [bearer, setBearer] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBearer(localStorage.getItem(BEARER_KEY) ?? "");
  }, []);

  if (bearer === null) return null;
  if (bearer.trim()) return null;

  return (
    <div
      className="border-b border-amber-300/80 bg-amber-100/95 px-3 py-2.5 text-center text-[12px] leading-snug text-amber-950"
      role="status"
    >
      Hali tizimga kirmaganga o&apos;xshaysiz. Buyurtmalar va haydovchilar ro&apos;yxatlari uchun iltimos{" "}
      <Link href="/operator/settings" className="font-semibold text-amber-900 underline underline-offset-2">
        Sozlamalarda
      </Link>{" "}
      hisobingiz (kirish kodi) ni kiriting.
    </div>
  );
}
