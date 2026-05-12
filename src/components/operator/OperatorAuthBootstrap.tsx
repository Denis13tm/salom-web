"use client";

/** Operator marshall: JWT + refresh rotation; dev’da `exchange/operator`; access `exp` bo‘yicha tuzatiladi. */

import {
  ensureOperatorSessionFresh,
  notifyOperatorAuthChanged,
} from "@/lib/salomOperator";
import { useEffect } from "react";

const REFRESH_MS = 120_000;

export function OperatorAuthBootstrap() {
  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const run = async () => {
      if (cancelled) return;
      const { changed } = await ensureOperatorSessionFresh();
      if (cancelled) return;
      if (changed) notifyOperatorAuthChanged();
    };

    void run();
    interval = setInterval(() => void run(), REFRESH_MS);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, []);

  return null;
}
