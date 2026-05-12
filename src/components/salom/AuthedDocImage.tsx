"use client";

import { buildOperatorHeaders, effectiveOperatorIdFromStorage } from "@/lib/salomOperator";
import { getAdminRequestHeaders } from "@/lib/salomAdmin";
import { useEffect, useState } from "react";

type Mode = "admin" | "operator";

/**
 * API dan Bearer bilan himoyalangan rasm: oddiy &lt;img src&gt; yubora olmaydi,
 * shuning uchun `fetch` + blob ishlatiladi.
 */
export function AuthedDocImage({
  href,
  mode,
  operatorBearer = "",
  alt,
  className,
}: {
  href: string;
  mode: Mode;
  /** `mode === "operator"` bo'lsa shart */
  operatorBearer?: string;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    setErr(null);
    setUrl(null);

    const raw =
      mode === "admin"
        ? getAdminRequestHeaders()
        : buildOperatorHeaders(operatorBearer, effectiveOperatorIdFromStorage());
    const headers: Record<string, string> = { ...raw };
    delete headers["Content-Type"];

    void (async () => {
      try {
        const r = await fetch(href, { headers });
        if (!alive) return;
        if (!r.ok) {
          setErr((await r.text().catch(() => "")) || `HTTP ${r.status}`);
          return;
        }
        const blob = await r.blob();
        if (!blob.size) {
          setErr("Bo'sh fayl");
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        if (alive) setUrl(objectUrl);
      } catch {
        if (alive) setErr("Tarmoq yoki fayl xatosi");
      }
    })();

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [href, mode, operatorBearer]);

  if (err) {
    return <p className="text-xs text-rose-600">{err}</p>;
  }
  if (!url) {
    return (
      <div
        className={
          className
            ? `animate-pulse rounded bg-slate-100 ${className}`
            : "h-40 w-full max-w-md animate-pulse rounded-lg bg-slate-100"
        }
      />
    );
  }
   
  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob: URL from authenticated fetch; next/image remotePatterns not applicable
    <img
      src={url}
      alt={alt}
      className={className ?? "max-h-72 max-w-full rounded-lg border border-slate-200 object-contain shadow-sm"}
    />
  );
}

export function isLikelyImageDoc(href: string) {
  return /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(href) || !/\.[a-z0-9]+$/i.test(href);
}
