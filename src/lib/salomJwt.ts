/**
 * Client-side JWT yordamchi: imzoni tasdiqlamaydi, faqat `exp` uchun session tiklash qarorlari.
 * (Access JWT Nest `JwtModule` bilan chiqadi — `.exp` maydon bo‘lishi mumkin.)
 */
export function parseJwtExpMs(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = JSON.parse(atob(b64)) as { exp?: unknown };
    if (typeof json.exp !== "number" || !Number.isFinite(json.exp)) return null;
    return json.exp * 1000;
  } catch {
    return null;
  }
}

/** `true` = access tugagan yoki JWT shakki / `exp` bo‘lmaganda eskirgan deb hisoblaymiz. */
export function isJwtAccessLikelyExpired(token: string, skewMs = 45_000): boolean {
  if (!token.trim()) return true;
  try {
    const parts = token.split(".");
    if (parts.length < 3) return true;
    const expMs = parseJwtExpMs(token);
    if (expMs == null) return true;
    return Date.now() >= expMs - skewMs;
  } catch {
    return true;
  }
}
