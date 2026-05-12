/**
 * Shared operator web client helpers (JWT / pilot operator ID, API base).
 */

import { isJwtAccessLikelyExpired } from "./salomJwt";

export const SALOM_API_URL = process.env.NEXT_PUBLIC_SALOM_API_URL ?? "http://localhost:3000";
export const DEFAULT_SERVICE_ZONE_ID = "a0000000-0000-4000-8000-000000000001";
export const BEARER_KEY = "salom_operator_bearer";
export const OPERATOR_REFRESH_KEY = "salom_operator_refresh";
/** Brauzerda saqlanadigan operator UUID (pilot) */
export const OPERATOR_ID_KEY = "salom_operator_id";
/** Tanlangan xizmat zonasi (har bir “shahar / zona” bitta UUID) */
export const SERVICE_ZONE_KEY = "salom_operator_service_zone";

export function getStoredServiceZoneId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SERVICE_ZONE_KEY)?.trim() || null;
}

export function setStoredServiceZoneId(id: string) {
  if (typeof window === "undefined") return;
  if (id.trim()) localStorage.setItem(SERVICE_ZONE_KEY, id.trim());
  else localStorage.removeItem(SERVICE_ZONE_KEY);
}

export function defaultOperatorId(): string {
  return process.env.NEXT_PUBLIC_SALOM_OPERATOR_ID ?? "a0000000-0000-4000-8000-000000000021";
}

/** Brauzerda: localStorage yoki default; serverda: default. */
export function effectiveOperatorIdFromStorage(): string {
  if (typeof window === "undefined") return defaultOperatorId();
  return localStorage.getItem(OPERATOR_ID_KEY)?.trim() || defaultOperatorId();
}

/** `false` (default) — faqat JWT; `X-Salom-Operator-Id` yuborilmaydi (Phase 13 pilot hard-freeze). */
const LEGACY_OPERATOR_HEADER =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_ALLOW_LEGACY_OPERATOR_HEADER === "true";

export function buildOperatorHeaders(bearer: string, operatorId: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = bearer.trim();
  if (token) {
    h["Authorization"] = `Bearer ${token}`;
  } else if (LEGACY_OPERATOR_HEADER) {
    h["X-Salom-Operator-Id"] = operatorId.trim();
  }
  return h;
}

export function operatorNetworkErrorHint(): string {
  return `Tarmoq xatosi: ${SALOM_API_URL} ga ulanmadi. Ikkinchi terminalda API ni ishga tushiring: loyiha ildizida \`npm run dev:api\` (yoki \`npm run dev:all\` — web+api). API ko‘pincha 3000-portda. CORS: API \`.env\` da \`CORS_ORIGIN\` ro‘yxatida \`http://localhost:3001\` (yoki ishlatayotgan manzil) bo‘lsin.`;
}

export const QUICK_ORDER_LAST_PHONE_KEY = "salom_operator_last_phone";

/** Operator operator panel sessiyasi (`BEARER` + `OPERATOR_REFRESH_KEY`). */
export const SALOM_OPERATOR_AUTH_CHANGED = "salom-operator-auth-changed";

export function notifyOperatorAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SALOM_OPERATOR_AUTH_CHANGED));
}

export function clearOperatorSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(BEARER_KEY);
  localStorage.removeItem(OPERATOR_REFRESH_KEY);
}

type Tokens = { accessToken: string; refreshToken: string };

function exchangeSecretHeaders(): Record<string, string> {
  const ex = process.env.NEXT_PUBLIC_SALOM_EXCHANGE_SECRET;
  if (!ex?.trim()) return {};
  return { "X-Salom-Exchange-Secret": ex.trim() };
}

function parseAuthTokens(text: string): Tokens {
  const j = JSON.parse(text) as { accessToken?: string; refreshToken?: string };
  const accessToken = j.accessToken;
  const refreshToken = j.refreshToken;
  if (!accessToken || !refreshToken) {
    throw new Error("Token javobida accessToken yoki refreshToken yo‘q");
  }
  return { accessToken, refreshToken };
}

function saveOperatorTokens(access: string, refresh: string): void {
  localStorage.setItem(BEARER_KEY, access);
  localStorage.setItem(OPERATOR_REFRESH_KEY, refresh);
}

async function postRefresh(refreshToken: string): Promise<Tokens> {
  const r = await fetch(`${SALOM_API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!r.ok) throw new Error(await r.text());
  return parseAuthTokens(await r.text());
}

async function postExchangeOperator(operatorId: string): Promise<Tokens> {
  const r = await fetch(`${SALOM_API_URL}/api/v1/auth/exchange/operator`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...exchangeSecretHeaders() },
    body: JSON.stringify({ operatorId }),
  });
  if (!r.ok) throw new Error(await r.text());
  return parseAuthTokens(await r.text());
}

/**
 * Pilot operator: muddatlangan access + refresh; dev’da avtomatik `exchange`.
 * `NEXT_PUBLIC_SALOM_EXCHANGE_SECRET` server `SALOM_EXCHANGE_SECRET` bilan mos bo‘lishi mumkin (dev).
 */
export async function ensureOperatorSessionFresh(): Promise<{ changed: boolean }> {
  if (typeof window === "undefined") return { changed: false };

  const access = localStorage.getItem(BEARER_KEY)?.trim() ?? "";
  const refresh = localStorage.getItem(OPERATOR_REFRESH_KEY)?.trim() ?? "";

  const accessLooksValid = access && !isJwtAccessLikelyExpired(access);
  if (accessLooksValid) {
    return { changed: false };
  }

  if (refresh) {
    try {
      const t = await postRefresh(refresh);
      saveOperatorTokens(t.accessToken, t.refreshToken);
      return { changed: true };
    } catch {
      localStorage.removeItem(OPERATOR_REFRESH_KEY);
    }
  }

  if (process.env.NODE_ENV !== "development") {
    if (access) localStorage.removeItem(BEARER_KEY);
    return { changed: !!access };
  }

  try {
    const id = effectiveOperatorIdFromStorage();
    const t = await postExchangeOperator(id);
    saveOperatorTokens(t.accessToken, t.refreshToken);
    return { changed: true };
  } catch {
    clearOperatorSession();
    return { changed: true };
  }
}

/** Operator web: telefon + parol (admin operator yaratganda). */
export async function loginOperatorWithPassword(phone: string, password: string): Promise<void> {
  const r = await fetch(`${SALOM_API_URL}/api/v1/auth/operator/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: phone.trim(), password }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text || r.statusText);
  const j = JSON.parse(text) as { accessToken: string; refreshToken: string; operatorId?: string };
  saveOperatorTokens(j.accessToken, j.refreshToken);
  if (j.operatorId?.trim()) localStorage.setItem(OPERATOR_ID_KEY, j.operatorId.trim());
  notifyOperatorAuthChanged();
}
