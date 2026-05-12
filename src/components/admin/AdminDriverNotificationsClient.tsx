"use client";

import { Button } from "@/components/salom/Button";
import { Card } from "@/components/salom/Card";
import { SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import { toErrorMessage } from "@/lib/toErrorMessage";
import { useCallback, useEffect, useRef, useState } from "react";

type ZoneRow = { id: string; name: string; slug: string };

type Audience = "all_approved" | "zone" | "single_driver";

type BroadcastResult = {
  ok: true;
  audience: Audience;
  targeted: number;
  socketEmitted: number;
  pushAttempted: number;
  pushDelivered: number;
  listOnly?: boolean;
};

type NewsRow = {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  serviceZoneId: string | null;
  targetDriverId: string | null;
  targetedCount: number;
  createdAt: string;
};

const PAGE = 25;

function audienceLabel(a: Audience): string {
  switch (a) {
    case "all_approved":
      return "Barcha tasdiqlangan";
    case "zone":
      return "Zona";
    case "single_driver":
      return "Bitta haydovchi";
    default:
      return a;
  }
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function AdminDriverNotificationsClient() {
  const itemsRef = useRef<NewsRow[]>([]);

  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all_approved");
  const [serviceZoneId, setServiceZoneId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [chSocket, setChSocket] = useState(true);
  const [chPush, setChPush] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  const [newsItems, setNewsItems] = useState<NewsRow[]>([]);
  const [newsTotal, setNewsTotal] = useState(0);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsErr, setNewsErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editAudience, setEditAudience] = useState<Audience>("all_approved");
  const [editZoneId, setEditZoneId] = useState("");
  const [editDriverId, setEditDriverId] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  useEffect(() => {
    itemsRef.current = newsItems;
  }, [newsItems]);

  const loadZones = useCallback(async () => {
    setZonesLoading(true);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/zones`, { headers: getAdminRequestHeaders() });
      if (!r.ok) return;
      const raw = (await r.json()) as unknown;
      const arr = Array.isArray(raw) ? raw : [];
      setZones(arr as ZoneRow[]);
    } catch {
      /* ignore */
    } finally {
      setZonesLoading(false);
    }
  }, []);

  const loadNews = useCallback(async (append: boolean) => {
    setNewsLoading(true);
    setNewsErr(null);
    const skip = append ? itemsRef.current.length : 0;
    try {
      const r = await fetch(
        `${SALOM_API_URL}/api/v1/admin/notifications/driver-news?take=${PAGE}&skip=${skip}`,
        { headers: getAdminRequestHeaders() },
      );
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as { total: number; items: NewsRow[] };
      setNewsTotal(data.total);
      if (append) {
        setNewsItems((prev) => [...prev, ...data.items]);
      } else {
        setNewsItems(data.items);
      }
    } catch (e) {
      if (e instanceof TypeError) setNewsErr(adminNetworkErrorHint());
      else setNewsErr(toErrorMessage(e, "yuklash"));
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  useEffect(() => {
    void loadNews(false);
  }, [loadNews]);

  const onSubmit = () => {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      setErr("Sarlavha va matn majburiy");
      return;
    }
    if (audience === "zone" && !serviceZoneId.trim()) {
      setErr("Zonani tanlang");
      return;
    }
    if (audience === "single_driver" && !driverId.trim()) {
      setErr("Haydovchi UUID kiriting");
      return;
    }

    if (audience === "all_approved" || audience === "zone") {
      const ok = window.confirm(
        audience === "all_approved"
          ? "Barcha tasdiqlangan aktiv haydovchilarga yuboriladi. Davom etasizmi?"
          : "Tanlangan zonadagi barcha tasdiqlangan haydovchilarga yuboriladi. Davom etasizmi?",
      );
      if (!ok) return;
    }

    setSending(true);
    setErr(null);
    setResult(null);
    void (async () => {
      try {
        const payload: Record<string, unknown> = {
          title: t,
          body: b,
          audience,
          channels: { socket: chSocket, push: chPush },
        };
        if (audience === "zone") payload.serviceZoneId = serviceZoneId.trim();
        if (audience === "single_driver") payload.driverId = driverId.trim();

        const r = await fetch(`${SALOM_API_URL}/api/v1/admin/notifications/driver-broadcast`, {
          method: "POST",
          headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(await r.text());
        setResult((await r.json()) as BroadcastResult);
        await loadNews(false);
      } catch (e) {
        if (e instanceof TypeError) setErr(adminNetworkErrorHint());
        else setErr(toErrorMessage(e, "yuborish"));
      } finally {
        setSending(false);
      }
    })();
  };

  const openEdit = (row: NewsRow) => {
    setEditingId(row.id);
    setEditTitle(row.title);
    setEditBody(row.body);
    setEditAudience(row.audience);
    setEditZoneId(row.serviceZoneId ?? "");
    setEditDriverId(row.targetDriverId ?? "");
    setEditErr(null);
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditErr(null);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const t = editTitle.trim();
    const b = editBody.trim();
    if (!t || !b) {
      setEditErr("Sarlavha va matn majburiy");
      return;
    }
    if (editAudience === "zone" && !editZoneId.trim()) {
      setEditErr("Zonani tanlang");
      return;
    }
    if (editAudience === "single_driver" && !editDriverId.trim()) {
      setEditErr("Haydovchi UUID kiriting");
      return;
    }

    setEditSaving(true);
    setEditErr(null);
    void (async () => {
      try {
        const payload: Record<string, unknown> = {
          title: t,
          body: b,
          audience: editAudience,
        };
        if (editAudience === "zone") payload.serviceZoneId = editZoneId.trim();
        if (editAudience === "single_driver") payload.driverId = editDriverId.trim();

        const r = await fetch(`${SALOM_API_URL}/api/v1/admin/notifications/driver-news/${editingId}`, {
          method: "PATCH",
          headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(await r.text());
        closeEdit();
        await loadNews(false);
      } catch (e) {
        if (e instanceof TypeError) setEditErr(adminNetworkErrorHint());
        else setEditErr(toErrorMessage(e, "saqlash"));
      } finally {
        setEditSaving(false);
      }
    })();
  };

  const removeRow = (row: NewsRow) => {
    const ok = window.confirm(`“${row.title.slice(0, 80)}${row.title.length > 80 ? "…" : ""}” o‘chirilsinmi?`);
    if (!ok) return;
    void (async () => {
      setNewsErr(null);
      try {
        const r = await fetch(`${SALOM_API_URL}/api/v1/admin/notifications/driver-news/${row.id}`, {
          method: "DELETE",
          headers: getAdminRequestHeaders(),
        });
        if (!r.ok) throw new Error(await r.text());
        if (editingId === row.id) closeEdit();
        await loadNews(false);
      } catch (e) {
        if (e instanceof TypeError) setNewsErr(adminNetworkErrorHint());
        else setNewsErr(toErrorMessage(e, "o‘chirish"));
      }
    })();
  };

  const canLoadMore = newsItems.length < newsTotal;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {err && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
              {err}
            </p>
          )}
          <Card title="Yangi xabar" padding="md" accent="admin">
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="text-slate-600">Sarlavha</span>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-200 focus:border-violet-400 focus:ring-2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Masalan: Yangilik — yangi tarif"
                  maxLength={120}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Matn</span>
                <textarea
                  className="mt-1 min-h-[140px] w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-200 focus:border-violet-400 focus:ring-2"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="To‘liq matn. Haydovchi ilovasida ogohlantirish va (agar yoqilgan bo‘lsa) tizim bildirishnomasi sifatida ko‘rinadi."
                  maxLength={4000}
                />
              </label>

              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qabul qiluvchilar</legend>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {(
                    [
                      ["all_approved", "Barcha tasdiqlangan haydovchilar"],
                      ["zone", "Faqat bir zona"],
                      ["single_driver", "Bitta haydovchi (UUID)"],
                    ] as const
                  ).map(([val, label]) => (
                    <label
                      key={val}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        audience === val ? "border-violet-400 bg-violet-50" : "border-slate-200"
                      }`}
                    >
                      <input type="radio" name="aud" checked={audience === val} onChange={() => setAudience(val)} />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {audience === "zone" && (
                <label className="block text-sm">
                  <span className="text-slate-600">Xizmat zonasi</span>
                  <select
                    className="mt-1 w-full max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={serviceZoneId}
                    onChange={(e) => setServiceZoneId(e.target.value)}
                    disabled={zonesLoading}
                  >
                    <option value="">{zonesLoading ? "Yuklanmoqda…" : "— Tanlang —"}</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.slug})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {audience === "single_driver" && (
                <label className="block text-sm">
                  <span className="text-slate-600">Haydovchi UUID</span>
                  <input
                    className="mt-1 w-full max-w-xl rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs outline-none ring-violet-200 focus:border-violet-400 focus:ring-2"
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value.trim())}
                    placeholder="550e8400-e29b-41d4-a716-446655440000"
                  />
                </label>
              )}

              <fieldset className="border-t border-violet-100 pt-4">
                <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kanallar</legend>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={chSocket} onChange={(e) => setChSocket(e.target.checked)} />
                    Ilovada jonli (Socket — ochiq ilova)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={chPush} onChange={(e) => setChPush(e.target.checked)} />
                    Push (FCM — `PUSH_MODE=fcm`)
                  </label>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  Ikkala kanal ham o‘chiq bo‘lsa, xabar faqat haydovchi «Yangiliklar» ro‘yxatiga yoziladi (jonli signal va
                  push yuborilmaydi).
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  Push uchun haydovchi qurilmasida FCM token va serverda Firebase service account bo‘lishi kerak. Qalqib
                  (`log`) rejimida ham jurnalga yoziladi.
                </p>
              </fieldset>

              <Button type="button" className="w-full sm:w-auto" disabled={sending} onClick={() => onSubmit()}>
                {sending ? "Yuborilmoqda…" : "Yuborish"}
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Natija" padding="md" accent="admin">
            {!result ? (
              <p className="text-sm text-slate-500">Yuborilgandan keyin statistika shu yerda ko‘rinadi.</p>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Tanlangan auditoriya</dt>
                  <dd className="font-mono text-xs">{result.audience}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Jami qabul qiluvchi</dt>
                  <dd className="font-semibold text-violet-900">{result.targeted}</dd>
                </div>
                {result.listOnly && (
                  <p className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs text-slate-700">
                    Faqat ro‘yxatga yozildi (jonli / push yo‘q).
                  </p>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Socket (jonli)</dt>
                  <dd className="font-mono">{result.socketEmitted}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Push urinish</dt>
                  <dd className="font-mono">{result.pushAttempted}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Push yetkazildi</dt>
                  <dd className="font-mono text-emerald-800">{result.pushDelivered}</dd>
                </div>
              </dl>
            )}
          </Card>
          <Card title="Eslatma" padding="md" accent="admin">
            <ul className="list-inside list-disc space-y-1.5 text-[11px] leading-relaxed text-slate-600">
              <li>
                Faqat <strong>arizasi tasdiqlangan</strong> va <strong>hisobi aktiv</strong> haydovchilar ro‘yxatga
                kiradi.
              </li>
              <li>Katta yuborishlar serverda partiyalab bajariladi; juda ko‘p haydovchi bo‘lsa muhitda cheklov bor.</li>
              <li>Har yuborish audit jurnaliga yoziladi.</li>
              <li>Pastdagi jadvaldan eski xabarlarni tahrirlash yoki o‘chirish mumkin.</li>
            </ul>
          </Card>
        </div>
      </div>

      {editingId && (
        <Card title="Xabarni tahrirlash" padding="md" accent="admin">
          {editErr && (
            <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
              {editErr}
            </p>
          )}
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="text-slate-600">Sarlavha</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-200 focus:border-violet-400 focus:ring-2"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={120}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Matn</span>
              <textarea
                className="mt-1 min-h-[120px] w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-200 focus:border-violet-400 focus:ring-2"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                maxLength={4000}
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qabul qiluvchilar</legend>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {(
                  [
                    ["all_approved", "Barcha tasdiqlangan haydovchilar"],
                    ["zone", "Faqat bir zona"],
                    ["single_driver", "Bitta haydovchi (UUID)"],
                  ] as const
                ).map(([val, label]) => (
                  <label
                    key={val}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                      editAudience === val ? "border-violet-400 bg-violet-50" : "border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="aud_edit"
                      checked={editAudience === val}
                      onChange={() => setEditAudience(val)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            {editAudience === "zone" && (
              <label className="block text-sm">
                <span className="text-slate-600">Xizmat zonasi</span>
                <select
                  className="mt-1 w-full max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={editZoneId}
                  onChange={(e) => setEditZoneId(e.target.value)}
                  disabled={zonesLoading}
                >
                  <option value="">{zonesLoading ? "Yuklanmoqda…" : "— Tanlang —"}</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.slug})
                    </option>
                  ))}
                </select>
              </label>
            )}
            {editAudience === "single_driver" && (
              <label className="block text-sm">
                <span className="text-slate-600">Haydovchi UUID</span>
                <input
                  className="mt-1 w-full max-w-xl rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs outline-none ring-violet-200 focus:border-violet-400 focus:ring-2"
                  value={editDriverId}
                  onChange={(e) => setEditDriverId(e.target.value.trim())}
                />
              </label>
            )}
            <p className="text-[11px] text-slate-500">
              Tahrirlash haydovchilarga qayta push yubormaydi — faqat «Yangiliklar» ro‘yxatidagi matn va qabul
              qiluvchilar soni yangilanadi.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={editSaving} onClick={() => saveEdit()}>
                {editSaving ? "Saqlanmoqda…" : "Saqlash"}
              </Button>
              <Button type="button" variant="secondary" disabled={editSaving} onClick={() => closeEdit()}>
                Bekor qilish
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card title="Yuborilgan xabarlar (haydovchi ilovasi)" padding="md" accent="admin">
        {newsErr && (
          <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
            {newsErr}
          </p>
        )}
        {newsLoading && newsItems.length === 0 ? (
          <p className="text-sm text-slate-500">Yuklanmoqda…</p>
        ) : newsItems.length === 0 ? (
          <p className="text-sm text-slate-500">Hali xabar yo‘q.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3 font-medium">Sana</th>
                    <th className="py-2 pr-3 font-medium">Sarlavha</th>
                    <th className="py-2 pr-3 font-medium">Auditoriya</th>
                    <th className="py-2 pr-3 font-medium">Qabul qiluvchi</th>
                    <th className="py-2 font-medium">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {newsItems.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-slate-600">
                        {formatShortDate(row.createdAt)}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-medium text-slate-900">{row.title}</div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{row.body}</div>
                      </td>
                      <td className="py-2 pr-3 text-xs">{audienceLabel(row.audience)}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{row.targetedCount}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs text-violet-900 hover:bg-violet-100"
                            onClick={() => openEdit(row)}
                          >
                            Tahrirlash
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-900 hover:bg-rose-100"
                            onClick={() => removeRow(row)}
                          >
                            O‘chirish
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Jami: {newsTotal} · Ko‘rsatilmoqda: {newsItems.length}
            </p>
            {canLoadMore && (
              <div className="mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={newsLoading}
                  onClick={() => void loadNews(true)}
                >
                  {newsLoading ? "Yuklanmoqda…" : "Yana yuklash"}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
