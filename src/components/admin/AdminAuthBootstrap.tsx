"use client";

/**
 * Admin panel: lokal sessiyani sog‘lom ushlab turish (muddatlangan JWT + Phase 12 refresh).
 * Muammo: Bearer matni bor bo‘lib qolgan (`if (existing) return`) ammo JWT `exp` o‘tganda
 * sessiya boshqa hech qachon tiklanmaydi → dev’da hammada 401.
 */
import {
  ensureAdminSessionFresh,
  notifyAdminAuthChanged,
} from "@/lib/salomAdmin";
import { useEffect } from "react";

const REFRESH_MS = 120_000;

export function AdminAuthBootstrap() {
  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const run = async () => {
      if (cancelled) return;
      const { changed } = await ensureAdminSessionFresh();
      if (cancelled) return;
      if (changed) notifyAdminAuthChanged();
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
