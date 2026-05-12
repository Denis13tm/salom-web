"use client";

import { Card } from "@/components/salom/Card";
import { Button } from "@/components/salom/Button";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import { toErrorMessage } from "@/lib/toErrorMessage";

type ChampionsConfig = {
  championsHomeBannerPaths?: string[];
  championsHomeCarouselIntervalSec?: number;
};

function championsBannerImageUrl(filename: string): string {
  const base = SALOM_API_URL.replace(/\/$/, "");
  return `${base}/api/v1/public/champions-banners/${encodeURIComponent(filename)}`;
}

export function AdminChampionsBannersClient() {
  const [err, setErr] = useState<string | null>(null);
  const [champions, setChampions] = useState<ChampionsConfig | null>(null);
  const [chBannerPaths, setChBannerPaths] = useState<string[]>([]);
  const [chCarouselSec, setChCarouselSec] = useState("5");
  const [chBannerUploading, setChBannerUploading] = useState(false);
  const [intervalSaving, setIntervalSaving] = useState(false);
  const chBannerFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setErr(null);
      try {
        const r = await fetch(`${SALOM_API_URL}/api/v1/admin/config/champions`, {
          headers: getAdminRequestHeaders(),
        });
        if (!r.ok) throw new Error(await r.text());
        if (!alive) return;
        const chJson = (await r.json()) as ChampionsConfig;
        setChampions(chJson);
        setChBannerPaths(Array.isArray(chJson.championsHomeBannerPaths) ? chJson.championsHomeBannerPaths : []);
        setChCarouselSec(String(chJson.championsHomeCarouselIntervalSec ?? 5));
      } catch (e) {
        if (!alive) return;
        if (e instanceof TypeError) setErr(adminNetworkErrorHint());
        else setErr(toErrorMessage(e, "chempionlar bannerlari"));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      {err && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{err}</p>}
      <Card title="Chempionlar — reklama bannerlari" padding="md" accent="admin">
        <p className="text-sm text-slate-600">
          Haydovchi ilovasida birinchi slayd doim sovrin kartasi; keyingi slaydlar — bu yerda yuklangan rasmlar. Bir nechta
          banner bo‘lsa, ular sovrin kartasi bilan birgalikda karuselda almashadi.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Sovrin matni va USD —{" "}
          <Link href="/admin/settings" className="font-semibold text-violet-800 underline">
            Sozlamalar
          </Link>{" "}
          → Chempionlar kartochkasi.
        </p>
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-[11px] font-semibold text-slate-700">Banner rasmlar</p>
          <p className="mt-1 text-[11px] text-slate-500">
            PNG/JPG/WebP, max 4 MB, 12 tagacha. Fayllar API serverida saqlanadi.
          </p>
          <label className="mt-3 flex max-w-xs flex-col text-[11px] text-slate-600">
            Karusel almashish (sekund, 3–60)
            <input
              type="text"
              inputMode="numeric"
              className="mt-1 rounded border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm"
              value={chCarouselSec}
              onChange={(e) => setChCarouselSec(e.target.value.replace(/\D/g, "").slice(0, 2))}
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="!text-xs"
              disabled={intervalSaving || !champions}
              onClick={() => {
                const carousel = parseInt(chCarouselSec.trim(), 10);
                if (!Number.isFinite(carousel) || carousel < 3 || carousel > 60) {
                  setErr("Karusel: 3…60 sekund");
                  return;
                }
                setIntervalSaving(true);
                setErr(null);
                void (async () => {
                  try {
                    const r = await fetch(`${SALOM_API_URL}/api/v1/admin/config/champions`, {
                      method: "PATCH",
                      headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
                      body: JSON.stringify({ championsHomeCarouselIntervalSec: carousel }),
                    });
                    if (!r.ok) throw new Error(await r.text());
                    const next = (await r.json()) as ChampionsConfig;
                    setChampions(next);
                    setChCarouselSec(String(next.championsHomeCarouselIntervalSec ?? 5));
                  } catch (err) {
                    if (err instanceof TypeError) setErr(adminNetworkErrorHint());
                    else setErr(toErrorMessage(err, "interval"));
                  } finally {
                    setIntervalSaving(false);
                  }
                })();
              }}
            >
              {intervalSaving ? "…" : "Intervalni saqlash"}
            </Button>
          </div>
          <input
            ref={chBannerFileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setChBannerUploading(true);
              setErr(null);
              void (async () => {
                try {
                  const fd = new FormData();
                  fd.append("file", f);
                  const headers = { ...getAdminRequestHeaders() };
                  delete (headers as Record<string, string>)["Content-Type"];
                  const r = await fetch(`${SALOM_API_URL}/api/v1/admin/config/champions/banners/upload`, {
                    method: "POST",
                    headers,
                    body: fd,
                  });
                  if (!r.ok) throw new Error(await r.text());
                  const next = (await r.json()) as { paths?: string[] };
                  if (Array.isArray(next.paths)) setChBannerPaths(next.paths);
                  const refetch = await fetch(`${SALOM_API_URL}/api/v1/admin/config/champions`, {
                    headers: getAdminRequestHeaders(),
                  });
                  if (refetch.ok) {
                    const full = (await refetch.json()) as ChampionsConfig;
                    setChampions(full);
                    setChBannerPaths(Array.isArray(full.championsHomeBannerPaths) ? full.championsHomeBannerPaths : []);
                    setChCarouselSec(String(full.championsHomeCarouselIntervalSec ?? 5));
                  }
                } catch (err) {
                  if (err instanceof TypeError) setErr(adminNetworkErrorHint());
                  else setErr(toErrorMessage(err, "banner yuklash"));
                } finally {
                  setChBannerUploading(false);
                }
              })();
            }}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="!text-xs"
              disabled={chBannerUploading || !champions}
              onClick={() => chBannerFileRef.current?.click()}
            >
              {chBannerUploading ? "…" : "Banner rasm yuklash"}
            </Button>
          </div>
          {chBannerPaths.length > 0 && (
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {chBannerPaths.map((fn) => (
                <li key={fn} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <img src={championsBannerImageUrl(fn)} alt="" className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow"
                    onClick={() => {
                      setErr(null);
                      void (async () => {
                        try {
                          const r = await fetch(
                            `${SALOM_API_URL}/api/v1/admin/config/champions/banners/${encodeURIComponent(fn)}`,
                            { method: "DELETE", headers: getAdminRequestHeaders() },
                          );
                          if (!r.ok) throw new Error(await r.text());
                          const full = (await r.json()) as ChampionsConfig;
                          setChampions(full);
                          setChBannerPaths(
                            Array.isArray(full.championsHomeBannerPaths) ? full.championsHomeBannerPaths : [],
                          );
                          setChCarouselSec(String(full.championsHomeCarouselIntervalSec ?? 5));
                        } catch (err) {
                          if (err instanceof TypeError) setErr(adminNetworkErrorHint());
                          else setErr(toErrorMessage(err, "banner o‘chirish"));
                        }
                      })();
                    }}
                  >
                    O‘chirish
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
