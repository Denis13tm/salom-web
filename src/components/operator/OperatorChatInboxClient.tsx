"use client";

import { OperatorAuthCard } from "@/components/operator/OperatorAuthCard";
import { toErrorMessage } from "@/lib/toErrorMessage";
import {
  BEARER_KEY,
  SALOM_API_URL,
  buildOperatorHeaders,
  effectiveOperatorIdFromStorage,
} from "@/lib/salomOperator";
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
};

/** API `chat:message` — `v: 1` (Socket.IO operator `chat:ops`). */
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

export function OperatorChatInboxClient() {
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
  const urlDriver = searchParams.get("driver")?.trim() ?? null;

  useEffect(() => {
    if (urlDriver !== preselectKey.current) {
      preselectKey.current = urlDriver;
      preselectFromUrlDone.current = false;
    }
  }, [urlDriver]);

  /** `/operator/chat?driver=<uuid>` — haydovchilar ro'yxatidan. */
  useEffect(() => {
    if (!urlDriver || preselectFromUrlDone.current || threads.length === 0) return;
    const th = threads.find((t) => t.driverId === urlDriver);
    if (th) {
      setSelected(th);
      preselectFromUrlDone.current = true;
    }
  }, [urlDriver, threads]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBearer((p) => p || (localStorage.getItem(BEARER_KEY) ?? ""));
  }, []);

  const h = useCallback(
    (b: string) => buildOperatorHeaders(b, effectiveOperatorIdFromStorage()),
    [],
  );

  const loadThreads = useCallback(async () => {
    setErr(null);
    const b = bearerRef.current;
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/operator/chat/threads`, { headers: h(b) });
      if (!r.ok) {
        setErr((await r.text()) || `HTTP ${r.status}`);
        return;
      }
      const j = (await r.json()) as { items: ThreadRow[] };
      setThreads(j.items ?? []);
    } catch (e) {
      setErr(toErrorMessage(e, "Tarmoq"));
    }
  }, [h]);

  const loadThreadsRef = useRef(loadThreads);
  loadThreadsRef.current = loadThreads;

  const loadMessages = useCallback(
    async (driverId: string) => {
      setErr(null);
      const b = bearerRef.current;
      try {
        const r = await fetch(
          `${SALOM_API_URL}/api/v1/operator/chat/threads/${encodeURIComponent(driverId)}/messages`,
          { headers: h(b) },
        );
        if (!r.ok) {
          setErr((await r.text()) || `HTTP ${r.status}`);
          return;
        }
        const j = (await r.json()) as { messages: ChatMessage[] };
        setMessages(j.messages ?? []);
        requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
      } catch (e) {
        setErr(toErrorMessage(e, "Tarmoq"));
      }
    },
    [h],
  );

  useEffect(() => {
    if (!bearer) return;
    void loadThreads();
    const t = setInterval(() => void loadThreads(), 25_000);
    return () => clearInterval(t);
  }, [bearer, loadThreads]);

  /** Jonli: operator `chat:ops` — jadval + ochiq suhbatni yangilash. */
  useEffect(() => {
    if (!bearer) return;
    const base = SALOM_API_URL.replace(/\/$/, "");
    const socket = io(`${base}/operator`, {
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
      if (p.channel === "admin") return;
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
        `${SALOM_API_URL}/api/v1/operator/chat/threads/${encodeURIComponent(selected.driverId)}/messages`,
        {
          method: "POST",
          headers: h(bearerRef.current),
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
      setErr(toErrorMessage(e, "Yuborilmadi"));
    } finally {
      setSending(false);
    }
  }

  if (!bearer) {
    return (
      <OperatorAuthCard
        onAfterExchange={(t) => setBearer(t)}
        title="Aloqa uchun JWT"
        description="Xabarlarni yuklash va yuborish uchun operator tokeni kerak (xuddi dispatch kabi). «Token olish» yoki localStorage: salom_operator_bearer."
      />
    );
  }

  return (
    <div className="flex min-h-[32rem] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-amber-200/60 bg-white shadow-sm lg:h-[min(70vh,720px)] lg:flex-row">
      {/* Suhbatlar ro‘yxati — Upwork chap kolonka uslubida */}
      <aside className="flex w-full min-w-0 flex-col border-b border-amber-200/50 bg-gradient-to-b from-amber-50/40 to-white lg:w-[320px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="border-b border-amber-200/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/80">Yozishmalar</p>
          <p className="text-[11px] text-slate-500">Haydovchi xabari bo‘lgan suhbatlar</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {threads.length === 0 && (
            <p className="p-4 text-sm text-slate-500">Hozircha yangi xabar yo‘q. Haydovchi ilovada operatorga yozganda shu yerda paydo bo‘ladi.</p>
          )}
          {threads.map((th) => {
            const on = selected?.driverId === th.driverId;
            return (
              <button
                key={th.threadId}
                type="button"
                onClick={() => setSelected(th)}
                className={[
                  "flex w-full items-start gap-2 border-b border-amber-100/80 px-3 py-2.5 text-left transition",
                  on ? "bg-amber-100/90" : "hover:bg-amber-50/80",
                ].join(" ")}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#0D5A2E,#166D3A)" }}
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

      {/* Markaz: xabarlar */}
      <section className="flex min-w-0 min-h-0 flex-1 flex-col">
        {selected == null ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-500">
            Suhbatni tanlang yoki yangi xabar kutilmoqda.
          </div>
        ) : (
          <>
            <header className="border-b border-amber-200/50 bg-white px-4 py-2">
              <h2 className="text-sm font-semibold text-slate-900">{driverLabel(selected.driver)}</h2>
              <p className="text-xs text-slate-500">{selected.driver.phone}</p>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-3 py-3">
              {err && <p className="mb-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-800">{err}</p>}
              {messages.length === 0 && <p className="text-center text-sm text-slate-400">Xabarlar yo‘q</p>}
              {messages.map((m, i) => {
                const prev = i > 0 ? messages[i - 1] : null;
                const dayBreak = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
                const mine = m.sender === "OPERATOR";
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
                            ? "bg-amber-200/90 text-amber-950"
                            : "border border-slate-200/80 bg-white text-slate-800",
                        ].join(" ")}
                      >
                        {!mine && (
                          <p className="mb-0.5 text-[10px] font-semibold text-emerald-800">Haydovchi</p>
                        )}
                        {mine && (
                          <p className="mb-0.5 text-[10px] font-medium text-amber-900/80">
                            Operator{m.operatorDisplayName ? ` · ${m.operatorDisplayName}` : ""}
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
            <footer className="border-t border-amber-200/50 bg-white p-2">
              <div className="flex gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Javob yozing…"
                  rows={2}
                  className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-amber-200 focus:border-amber-300 focus:ring-2"
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
                  className="self-end rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-400 disabled:opacity-50"
                >
                  {sending ? "…" : "Yuborish"}
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      {/* O‘ng: kontekst — Upwork o‘ng kolonka soddalashtirilgani */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-t border-amber-200/50 bg-gradient-to-b from-slate-50/80 to-white lg:flex lg:border-l lg:border-t-0">
        <div className="border-b border-amber-200/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Haydovchi</p>
        </div>
        {selected == null ? (
          <p className="p-3 text-xs text-slate-500">Suhbat tanlang — bu yerda ariza holati va tezkor ma’lumot.</p>
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
            <p className="text-[10px] leading-relaxed text-slate-500">
              Dispatch va nizolar boshqa bo‘limlarda. Bu yer — faqat operator ↔ haydovchi yozishma.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
