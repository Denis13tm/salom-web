"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  BEARER_KEY,
  ensureAdminSessionFresh,
  SALOM_ADMIN_AUTH_CHANGED,
} from "@/lib/salomAdmin";
import { isJwtAccessLikelyExpired } from "@/lib/salomJwt";
import { AdminLoginCard } from "./AdminLoginCard";

function accessLooksOk(): boolean {
  if (typeof window === "undefined") return false;
  const access = localStorage.getItem(BEARER_KEY)?.trim() ?? "";
  return Boolean(access) && !isJwtAccessLikelyExpired(access);
}

export function AdminAppGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const recheck = useCallback(() => {
    setUnlocked(accessLooksOk());
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await ensureAdminSessionFresh();
      if (cancelled) return;
      recheck();
    })();
    const onAuth = () => recheck();
    window.addEventListener(SALOM_ADMIN_AUTH_CHANGED, onAuth);
    return () => {
      cancelled = true;
      window.removeEventListener(SALOM_ADMIN_AUTH_CHANGED, onAuth);
    };
  }, [recheck]);

  /** Login muvaffaqiyatli — tokenlar yangilandi; gate qayta hisoblash. */
  const onLoginSuccess = () => {
    recheck();
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-violet-50 to-white">
        <p className="text-sm font-medium text-violet-800">Yuklanmoqda…</p>
      </div>
    );
  }

  if (!unlocked) {
    return <AdminLoginCard onSuccess={onLoginSuccess} />;
  }

  return <>{children}</>;
}
