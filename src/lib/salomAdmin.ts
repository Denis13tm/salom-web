import { SALOM_API_URL } from "./salomOperator";
import { isJwtAccessLikelyExpired } from "./salomJwt";

export { SALOM_API_URL };

/** Admin JWT saqlandi yoki exchange bo‘lganda — jadvallar qayta yuklashi uchun (faqat client). */
export const SALOM_ADMIN_AUTH_CHANGED = "salom-admin-auth-changed";

export function notifyAdminAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SALOM_ADMIN_AUTH_CHANGED));
}

export const BEARER_KEY = "salom_admin_bearer";
/** Phase 12: admin web avval refresh saqlamasdi — access tugagach hamon “Bearer bor” deb qolib ketardi. */
export const ADMIN_REFRESH_KEY = "salom_admin_refresh";
export const ADMIN_ID_KEY = "salom_admin_id";

export function defaultAdminId(): string {
  return process.env.NEXT_PUBLIC_SALOM_ADMIN_ID ?? "a0000000-0000-4000-8000-000000000020";
}

export function buildAdminHeaders(bearer: string, adminId: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = bearer.trim();
  if (token) h["Authorization"] = `Bearer ${token}`;
  else h["X-Salom-Admin-Id"] = adminId.trim();
  return h;
}

export function adminNetworkErrorHint(): string {
  return `API ${SALOM_API_URL} ga ulanmadi. Ildizda \`npm run dev:api\` yoki \`npm run dev:all\` (web+api). CORS: API \`.env\` da \`CORS_ORIGIN\` ichida brauzer manzili (mas. http://localhost:3001).`;
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

function saveAdminTokens(access: string, refresh: string): void {
  localStorage.setItem(BEARER_KEY, access);
  localStorage.setItem(ADMIN_REFRESH_KEY, refresh);
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(BEARER_KEY);
  localStorage.removeItem(ADMIN_REFRESH_KEY);
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

async function postExchangeAdmin(adminIdTrimmed: string): Promise<Tokens> {
  const r = await fetch(`${SALOM_API_URL}/api/v1/auth/exchange/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...exchangeSecretHeaders() },
    body: JSON.stringify({ adminId: adminIdTrimmed }),
  });
  if (!r.ok) throw new Error(await r.text());
  return parseAuthTokens(await r.text());
}

/**
 * Access JWT saqlangan bo‘lsa-yu muddati o‘tgan bo‘lsa yoki refresh kerak bo‘lsa — yangilaydi.
 * `changed: true` bo‘lsa UI `SALOM_ADMIN_AUTH_CHANGED` orqali qayta so‘rash kerak.
 */
export async function ensureAdminSessionFresh(): Promise<{ changed: boolean }> {
  if (typeof window === "undefined") return { changed: false };

  const access = localStorage.getItem(BEARER_KEY)?.trim() ?? "";
  const refresh = localStorage.getItem(ADMIN_REFRESH_KEY)?.trim() ?? "";

  const accessLooksValid = access && !isJwtAccessLikelyExpired(access);
  if (accessLooksValid) {
    return { changed: false };
  }

  if (refresh) {
    try {
      const t = await postRefresh(refresh);
      saveAdminTokens(t.accessToken, t.refreshToken);
      return { changed: true };
    } catch {
      localStorage.removeItem(ADMIN_REFRESH_KEY);
    }
  }

  if (process.env.NODE_ENV !== "development") {
    if (access) localStorage.removeItem(BEARER_KEY);
    return { changed: !!access };
  }

  try {
    const sid = localStorage.getItem(ADMIN_ID_KEY)?.trim();
    const id = sid || defaultAdminId();
    const t = await postExchangeAdmin(id);
    saveAdminTokens(t.accessToken, t.refreshToken);
    localStorage.setItem(ADMIN_ID_KEY, id);
    return { changed: true };
  } catch {
    clearAdminSession();
    return { changed: true };
  }
}

/** Production admin panel: server `ADMIN_WEB_PASSWORD` bilan JWT. */
export async function loginAdminWithPassword(password: string): Promise<void> {
  const r = await fetch(`${SALOM_API_URL}/api/v1/auth/admin/web-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text || r.statusText);
  const j = JSON.parse(text) as { accessToken: string; refreshToken: string; adminId?: string };
  saveAdminTokens(j.accessToken, j.refreshToken);
  if (j.adminId?.trim()) localStorage.setItem(ADMIN_ID_KEY, j.adminId.trim());
  notifyAdminAuthChanged();
}

/** Lokal dev / skriptlar — ikkala tokenni saqlaydi (oldingi variant faqat access qaytarardi). */
export async function exchangeAdminAccessToken(adminIdTrimmed: string): Promise<string> {
  const t = await postExchangeAdmin(adminIdTrimmed);
  saveAdminTokens(t.accessToken, t.refreshToken);
  return t.accessToken;
}

/** Brauzerda: localStorage bearer + (ixtiyoriy) admin id */
export function getAdminRequestHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return buildAdminHeaders("", defaultAdminId());
  }
  const b = localStorage.getItem(BEARER_KEY) ?? "";
  const id = localStorage.getItem(ADMIN_ID_KEY) || defaultAdminId();
  return buildAdminHeaders(b, id);
}
