"use client";

import { useEffect, useRef } from "react";
import { SALOM_ADMIN_AUTH_CHANGED } from "./salomAdmin";

/** Admin bearer almashganda (exchange / saqlash) ro‘yxatlarni yangilash. */
export function useSalomAdminAuthRefetch(onRefetch: () => void): void {
  const ref = useRef(onRefetch);
  ref.current = onRefetch;
  useEffect(() => {
    const handler = () => ref.current();
    window.addEventListener(SALOM_ADMIN_AUTH_CHANGED, handler);
    return () => window.removeEventListener(SALOM_ADMIN_AUTH_CHANGED, handler);
  }, []);
}
