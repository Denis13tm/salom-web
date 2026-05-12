const STORAGE_KEY = "salom_admin_chat_last_read_v1";
export const SALOM_ADMIN_CHAT_UNREAD_REFRESH = "salom-admin-chat-unread-refresh";

export type AdminChatThreadForUnread = {
  driverId: string;
  lastMessage: { sender: string; createdAt: string } | null;
};

export function getAdminChatLastReadMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Haydovchi yozishmasini o‘qilgan deb belgilash (sidebar badge uchun). */
export function markAdminChatThreadRead(driverId: string, readAtIso?: string): void {
  if (typeof window === "undefined") return;
  const map = { ...getAdminChatLastReadMap() };
  map[driverId] = readAtIso ?? new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent(SALOM_ADMIN_CHAT_UNREAD_REFRESH));
}

/** Oxirgi xabar haydovchidan bo‘lsa va keyinroq o‘qilgan vaqt — unread. */
export function countUnreadAdminChatThreads(threads: AdminChatThreadForUnread[]): number {
  const map = getAdminChatLastReadMap();
  let n = 0;
  for (const th of threads) {
    const lm = th.lastMessage;
    if (!lm || lm.sender !== "DRIVER") continue;
    const readAt = map[th.driverId];
    if (!readAt || new Date(lm.createdAt) > new Date(readAt)) n++;
  }
  return n;
}
