"use client";

import { toErrorMessage } from "@/lib/toErrorMessage";
import { markAdminChatThreadRead } from "@/lib/adminChatUnread";
import { BEARER_KEY, SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { io } from "socket.io-client";

type ThreadRow = {
  threadId: string;
  driverId: string;
  lastMessageAt: string | null;
  driver: {
    id: string;
    phone: string;
    firstName: string | null;
    lastName: string | null;
    onboardingStatus: string;
    operationalStatus: string;
  };
  lastMessage: {
    bodyPreview: string;
    createdAt: string;
    sender: string;
  } | null;
};

type ChatMessage = {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
  operatorDisplayName: string | null;
  adminDisplayName?: string | null;
};

/** `GET /api/v1/admin/drivers/:id` — chat uchun minimal maydonlar */
type AdminDriverForChat = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  onboardingStatus: string;
  operationalStatus: string;
  user?: { phone?: string | null };
};

function isPendingThreadId(threadId: string) {
  return threadId.startsWith("pending:");
}

/** Socket.IO admin namespace — `chat:message` v1. */
type ChatMessageWsV1 = {
  v: 1;
  channel?: "operator" | "admin";
  driverId: string;
  threadId: string;
  message: ChatMessage;
};

function formatShort(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("uz-UZ", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function dayLabel(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("uz-UZ", { weekday: "long", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

function driverLabel(d: ThreadRow["driver"]) {
  const n = [d.firstName, d.lastName].filter(Boolean).join(" ");
  if (n) return n;
  return d.phone;
}

function onboardingBadge(st: string) {
  const map: Record<string, string> = {
    DRAFT: "Qoralama",
    SUBMITTED: "Yuborilgan",
    UNDER_REVIEW: "Ko‘rib chiqilmoqda",
    APPROVED: "Tasdiqlangan",
    REJECTED: "Rad",
  };
  return map[st] ?? st;
}

export function AdminChatInboxClient() {
  const searchParams = useSearchParams();
  const [bearer, setBearer] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [selected, setSelected] = useState<ThreadRow | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const poller = useRef<ReturnType<typeof setInterval> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const bearerRef = useRef(bearer);
  bearerRef.current = bearer;
  const selectedRef = useRef<ThreadRow | null>(null);
  selectedRef.current = selected;
  const threadSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preselectFromUrlDone = useRef(false);
  const preselectKey = useRef<string | null>(null);
  const urlDriverSelectInflight = useRef(false);
  const initialThreadFetchCompleted = useRef(false);
  const [initialThreadListLoaded, setInitialThreadListLoaded] = useState(false);
  const urlDriver = searchParams.get("driver")?.trim() ?? null;

  useEffect(() => {
    if (urlDriver !== preselectKey.current) {
      preselectKey.current = urlDriver;
      preselectFromUrlDone.current = false;
      urlDriverSelectInflight.current = false;
    }
  }, [urlDriver]);

  /** Ro‘yxatda bo‘lmagan haydovchi (hali xabar yo‘q) — API dan yuklab, yangi suhbat oynasini ochamiz (iOS kabi). */
  useEffect(() => {
    if (!bearer || !urlDriver || !initialThreadListLoaded || preselectFromUrlDone.current) return;
    const real = threads.find((t) => t.driverId === urlDriver && !isPendingThreadId(t.threadId));
    if (real) {
      setSelected(real);
      preselectFromUrlDone.current = true;
      return;
    }
    const pending = threads.find((t) => t.driverId === urlDriver && isPendingThreadId(t.threadId));
    if (pending) {
      setSelected(pending);
      preselectFromUrlDone.current = true;
      return;
    }
    if (urlDriverSelectInflight.current) return;
    urlDriverSelectInflight.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(`${SALOM_API_URL}/api/v1/admin/drivers/${encodeURIComponent(urlDriver)}`, {
          headers: getAdminRequestHeaders(),
        });
        if (cancelled) return;
        if (!r.ok) {
          setErr((await r.text()) || `Haydovchi topilmadi (HTTP ${r.status})`);
          preselectFromUrlDone.current = true;
          return;
        }
        const d = (await r.json()) as AdminDriverForChat;
        const synthetic: ThreadRow = {
          threadId: `pending:${d.id}`,
          driverId: d.id,
          lastMessageAt: null,
          driver: {
            id: d.id,
            phone: d.user?.phone?.trim() || "—",
            firstName: d.firstName,
            lastName: d.lastName,
            onboardingStatus: d.onboardingStatus,
            operationalStatus: d.operationalStatus,
          },
          lastMessage: null,
        };
        setThreads((prev) => {
          if (prev.some((t) => t.driverId === d.id && !isPendingThreadId(t.threadId))) return prev;
          if (prev.some((t) => t.threadId === synthetic.threadId)) return prev;
          return [synthetic, ...prev];
        });
        setSelected(synthetic);
        preselectFromUrlDone.current = true;
      } catch (e) {
        if (!cancelled) {
          if (e instanceof TypeError) setErr(adminNetworkErrorHint());
          else setErr(toErrorMessage(e, "Haydovchi"));
          preselectFromUrlDone.current = true;
        }
      } finally {
        if (!cancelled) urlDriverSelectInflight.current = false;
      }
    })();
    return () => {
      cancelled = true;
      urlDriverSelectInflight.current = false;
    };
  }, [bearer, urlDriver, initialThreadListLoaded, threads]);

  /** Birinchi admin xabaridan keyin thread UUID ro‘yxatga tushganda — pending tanlovni haqiqiy threadga almashtiramiz. */
  useEffect(() => {
    if (!selected || !isPendingThreadId(selected.threadId)) return;
    const real = threads.find((t) => t.driverId === selected.driverId && !isPendingThreadId(t.threadId));
    if (real) setSelected(real);
  }, [threads, selected]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBearer((p) => p || (localStorage.getItem(BEARER_KEY) ?? ""));
  }, []);

  const loadThreads = useCallback(async () => {
    setErr(null);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/chat/threads`, {
        headers: getAdminRequestHeaders(),
      });
      if (!r.ok) {
        setErr((await r.text()) || `HTTP ${r.status}`);
        return;
      }
      const j = (await r.json()) as { items: ThreadRow[] };
      const fromApi = j.items ?? [];
      setThreads((prev) => {
        const pendingSynth = prev.filter(
          (t) => isPendingThreadId(t.threadId) && !fromApi.some((a) => a.driverId === t.driverId),
        );
        return [...fromApi, ...pendingSynth];
      });
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "Tarmoq"));
    } finally {
      if (!initialThreadFetchCompleted.current) {
        initialThreadFetchCompleted.current = true;
        setInitialThreadListLoaded(true);
      }
    }
  }, []);

  const loadThreadsRef = useRef(loadThreads);
  loadThreadsRef.current = loadThreads;

  const loadMessages = useCallback(async (driverId: string) => {
    setErr(null);
    try {
      const r = await fetch(
        `${SALOM_API_URL}/api/v1/admin/chat/threads/${encodeURIComponent(driverId)}/messages`,
        { headers: getAdminRequestHeaders() },
      );
      if (!r.ok) {
        setErr((await r.text()) || `HTTP ${r.status}`);
        return;
      }
      const j = (await r.json()) as { messages: ChatMessage[] };
      setMessages(j.messages ?? []);
      markAdminChatThreadRead(driverId);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "Tarmoq"));
    }
  }, []);

  useEffect(() => {
    if (!bearer) return;
    void loadThreads();
    const t = setInterval(() => void loadThreads(), 25_000);
    return () => clearInterval(t);
  }, [bearer, loadThreads]);

  useEffect(() => {
    if (!bearer) return;
    const base = SALOM_API_URL.replace(/\/$/, "");
    const socket = io(`${base}/admin`, {
      path: "/socket.io/",
      transports: ["websocket"],
      withCredentials: true,
      extraHeaders: { Authorization: `Bearer ${bearer}` },
      auth: { token: bearer },
    });
    const onConnect = () => {
      socket.emit("join", { scope: "chat" as const });
    };
    const scheduleThreadSync = () => {
      if (threadSyncTimer.current) clearTimeout(threadSyncTimer.current);
      threadSyncTimer.current = setTimeout(() => {
        threadSyncTimer.current = null;
        void loadThreadsRef.current();
      }, 400);
    };
    const onChat = (raw: unknown) => {
      const p = raw as ChatMessageWsV1;
      if (p?.v !== 1 || !p.message?.id || !p.driverId) return;
      if (p.channel === "operator") return;
      const body = p.message.body;
      const bodyPreview = body.length > 120 ? `${body.slice(0, 117)}…` : body;
      let missingInList = false;
      setThreads((prev) => {
        const idx = prev.findIndex((t) => t.driverId === p.driverId);
        if (idx < 0) {
          missingInList = true;
          return prev;
        }
        const th = prev[idx]!;
        const updated: ThreadRow = {
          ...th,
          threadId: p.threadId,
          lastMessageAt: p.message.createdAt,
          lastMessage: {
            bodyPreview,
            createdAt: p.message.createdAt,
            sender: p.message.sender,
          },
        };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });
      if (missingInList) {
        scheduleThreadSync();
      }
      setSelected((s) => {
        if (!s || s.driverId !== p.driverId) return s;
        return {
          ...s,
          threadId: p.threadId,
          lastMessageAt: p.message.createdAt,
          lastMessage: {
            bodyPreview,
            createdAt: p.message.createdAt,
            sender: p.message.sender,
          },
        };
      });
      if (selectedRef.current?.driverId === p.driverId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === p.message.id)) return prev;
          return [...prev, p.message].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        });
        markAdminChatThreadRead(p.driverId);
        requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
      }
    };
    socket.on("connect", onConnect);
    socket.on("chat:message", onChat);
    return () => {
      if (threadSyncTimer.current) {
        clearTimeout(threadSyncTimer.current);
        threadSyncTimer.current = null;
      }
      socket.off("connect", onConnect);
      socket.off("chat:message", onChat);
      socket.disconnect();
    };
  }, [bearer]);

  useEffect(() => {
    if (!selected) {
      if (poller.current) {
        clearInterval(poller.current);
        poller.current = null;
      }
      return;
    }
    void loadMessages(selected.driverId);
    if (poller.current) clearInterval(poller.current);
    poller.current = setInterval(() => void loadMessages(selected.driverId), 20_000);
    return () => {
      if (poller.current) {
        clearInterval(poller.current);
        poller.current = null;
      }
    };
  }, [selected, loadMessages]);

  async function onSend() {
    const t = draft.trim();
    if (!t || !selected) return;
    setSending(true);
    setErr(null);
    try {
      const r = await fetch(
        `${SALOM_API_URL}/api/v1/admin/chat/threads/${encodeURIComponent(selected.driverId)}/messages`,
        {
          method: "POST",
          headers: getAdminRequestHeaders(),
          body: JSON.stringify({ body: t }),
        },
      );
      if (!r.ok) {
        setErr((await r.text()) || `HTTP ${r.status}`);
        return;
      }
      setDraft("");
      await loadMessages(selected.driverId);
      await loadThreads();
    } catch (e) {
      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
      else setErr(toErrorMessage(e, "Yuborilmadi"));
    } finally {
      setSending(false);
    }
  }

  if (!bearer) {
    return (
      <div className="rounded-xl border border-violet-200/70 bg-violet-50/60 px-4 py-3 text-sm text-violet-950">
        Admin JWT kerak: kirish yoki <code className="rounded bg-white/70 px-1">localStorage.salom_admin_bearer</code>.
      </div>
    );
  }

  return (
    <div className="flex min-h-[32rem] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-violet-200/60 bg-white shadow-sm lg:h-[min(70vh,720px)] lg:flex-row">
      <aside className="flex w-full min-w-0 flex-col border-b border-violet-200/50 bg-gradient-to-b from-violet-50/40 to-white lg:w-[320px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="border-b border-violet-200/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-900/80">Administrator ↔ haydovchi</p>
          <p className="text-[11px] text-slate-500">Tasdiqlash kodi va ichki xabarlar</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {threads.length === 0 && (
            <p className="p-4 text-sm text-slate-500">Hozircha yozishma yo‘q. Haydovchi administratorga yozganda shu yerda ko‘rinadi.</p>
          )}
          {threads.map((th) => {
            const on = selected?.driverId === th.driverId;
            return (
              <button
                key={th.threadId}
                type="button"
                onClick={() => setSelected(th)}
                className={[
                  "flex w-full items-start gap-2 border-b border-violet-100/80 px-3 py-2.5 text-left transition",
                  on ? "bg-violet-100/90" : "hover:bg-violet-50/80",
                ].join(" ")}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#5b21b6,#7c3aed)" }}
                >
                  {driverLabel(th.driver).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="truncate text-sm font-semibold text-slate-900">{driverLabel(th.driver)}</span>
                    {th.lastMessage && (
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {formatShort(th.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">{th.lastMessage?.bodyPreview ?? "—"}</p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {selected == null ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-500">
            Suhbatni tanlang.
          </div>
        ) : (
          <>
            <header className="border-b border-violet-200/50 bg-white px-4 py-2">
              <h2 className="text-sm font-semibold text-slate-900">{driverLabel(selected.driver)}</h2>
              <p className="text-xs text-slate-500">{selected.driver.phone}</p>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-3 py-3">
              {err && <p className="mb-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-800">{err}</p>}
              {messages.length === 0 && <p className="text-center text-sm text-slate-400">Xabarlar yo‘q</p>}
              {messages.map((m, i) => {
                const prev = i > 0 ? messages[i - 1] : null;
                const dayBreak = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
                const mine = m.sender === "ADMIN";
                return (
                  <div key={m.id}>
                    {dayBreak && (
                      <p className="my-2 text-center text-[10px] font-medium text-slate-400">{dayLabel(m.createdAt)}</p>
                    )}
                    <div className={["mb-2 flex", mine ? "justify-end" : "justify-start"].join(" ")}>
                      <div
                        className={[
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                          mine
                            ? "bg-violet-200/90 text-violet-950"
                            : "border border-slate-200/80 bg-white text-slate-800",
                        ].join(" ")}
                      >
                        {!mine && (
                          <p className="mb-0.5 text-[10px] font-semibold text-emerald-800">Haydovchi</p>
                        )}
                        {mine && (
                          <p className="mb-0.5 text-[10px] font-medium text-violet-900/80">
                            Administrator
                            {m.adminDisplayName ? ` · ${m.adminDisplayName}` : ""}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words leading-snug">{m.body}</p>
                        <p className="mt-1 text-[10px] text-slate-500">{formatShort(m.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <footer className="border-t border-violet-200/50 bg-white p-2">
              <div className="flex gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Javob yozing…"
                  rows={2}
                  className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-violet-200 focus:border-violet-300 focus:ring-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void onSend();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={sending || !draft.trim()}
                  onClick={() => void onSend()}
                  className="self-end rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 disabled:opacity-50"
                >
                  {sending ? "…" : "Yuborish"}
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      <aside className="hidden w-[260px] shrink-0 flex-col border-t border-violet-200/50 bg-gradient-to-b from-slate-50/80 to-white lg:flex lg:border-l lg:border-t-0">
        <div className="border-b border-violet-200/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Haydovchi</p>
        </div>
        {selected == null ? (
          <p className="p-3 text-xs text-slate-500">Suhbat tanlang.</p>
        ) : (
          <div className="space-y-3 overflow-y-auto p-3 text-xs text-slate-600">
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Ariza</p>
              <p className="mt-0.5 rounded-lg bg-white px-2 py-1 font-medium text-slate-800 ring-1 ring-slate-200/80">
                {onboardingBadge(selected.driver.onboardingStatus)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Ish holati</p>
              <p className="mt-0.5 text-slate-800">{selected.driver.operationalStatus}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Aloqa</p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-800">{selected.driver.phone}</p>
            </div>
            <Link
              href={`/admin/drivers/${encodeURIComponent(selected.driver.id)}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500"
            >
              Haydovchi profili
            </Link>
            <p className="text-[10px] leading-relaxed text-slate-500">
              Operator bilan suhbat alohida — operator panel «Haydovchi chat». Bu yer faqat administrator kanali.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
