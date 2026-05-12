"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  BEARER_KEY,
  ensureOperatorSessionFresh,
  SALOM_OPERATOR_AUTH_CHANGED,
} from "@/lib/salomOperator";
import { isJwtAccessLikelyExpired } from "@/lib/salomJwt";
import { OperatorLoginCard } from "./OperatorLoginCard";

function accessLooksOk(): boolean {
  if (typeof window === "undefined") return false;
  const access = localStorage.getItem(BEARER_KEY)?.trim() ?? "";
  return Boolean(access) && !isJwtAccessLikelyExpired(access);
}

export function OperatorAppGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const recheck = useCallback(() => {
    setUnlocked(accessLooksOk());
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await ensureOperatorSessionFresh();
      if (cancelled) return;
      recheck();
    })();
    const onAuth = () => recheck();
    window.addEventListener(SALOM_OPERATOR_AUTH_CHANGED, onAuth);
    return () => {
      cancelled = true;
      window.removeEventListener(SALOM_OPERATOR_AUTH_CHANGED, onAuth);
    };
  }, [recheck]);

  const onLoginSuccess = () => {
    recheck();
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-sm font-medium text-emerald-800">Yuklanmoqda…</p>
      </div>
    );
  }

  if (!unlocked) {
    return <OperatorLoginCard onSuccess={onLoginSuccess} />;
  }

  return <>{children}</>;
}
