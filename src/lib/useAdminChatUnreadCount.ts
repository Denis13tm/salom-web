"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BEARER_KEY,
  SALOM_ADMIN_AUTH_CHANGED,
  SALOM_API_URL,
  getAdminRequestHeaders,
} from "@/lib/salomAdmin";
import {
  SALOM_ADMIN_CHAT_UNREAD_REFRESH,
  countUnreadAdminChatThreads,
  type AdminChatThreadForUnread,
} from "@/lib/adminChatUnread";

/**
 * Sidebar «Haydovchi chat» uchun: haydovchidan kelgan, hali o‘qilmagan threadlar soni.
 * O‘qilgan vaqt `markAdminChatThreadRead` orqali (chat sahifasida xabarlar yuklanganda).
 */
export function useAdminChatUnreadCount(): number {
  const [count, setCount] = useState(0);
  const [bearer, setBearer] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBearer(localStorage.getItem(BEARER_KEY) ?? "");
    const onAuth = () => setBearer(localStorage.getItem(BEARER_KEY) ?? "");
    window.addEventListener(SALOM_ADMIN_AUTH_CHANGED, onAuth);
    return () => window.removeEventListener(SALOM_ADMIN_AUTH_CHANGED, onAuth);
  }, []);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = bearer || localStorage.getItem(BEARER_KEY) || "";
    if (!token.trim()) {
      setCount(0);
      return;
    }
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/chat/threads`, {
        headers: getAdminRequestHeaders(),
      });
      if (!r.ok) return;
      const j = (await r.json()) as { items?: AdminChatThreadForUnread[] };
      setCount(countUnreadAdminChatThreads(j.items ?? []));
    } catch {
      return;
    }
  }, [bearer]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), 25_000);
    const onUnread = () => void refresh();
    window.addEventListener(SALOM_ADMIN_CHAT_UNREAD_REFRESH, onUnread);
    window.addEventListener(SALOM_ADMIN_AUTH_CHANGED, onUnread);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(SALOM_ADMIN_CHAT_UNREAD_REFRESH, onUnread);
      window.removeEventListener(SALOM_ADMIN_AUTH_CHANGED, onUnread);
    };
  }, [refresh]);

  return count;
}
