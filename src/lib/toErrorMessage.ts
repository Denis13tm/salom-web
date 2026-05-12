/**
 * Brauzer / socket / kutubxona ba'zida Error o'rniga Event yoki boshqa narsa beradi;
 * ularni foydalanuvchiga xavfsiz stringga aylantiradi.
 */
export function toErrorMessage(err: unknown, fallback = "Noma’lum xato"): string {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string") return err;
  if (typeof Event !== "undefined" && err instanceof Event) {
    const ev = err as ErrorEvent;
    if (typeof ev.message === "string" && ev.message) return ev.message;
    return err.type ? `Hodisa: ${err.type}` : "Tarmoq yoki brauzer xatosi";
  }
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  if (err == null) return fallback;
  const s = String(err);
  if (s === "[object Object]" || s === "[object Event]") {
    return fallback;
  }
  return s;
}
