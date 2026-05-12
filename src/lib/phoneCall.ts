/**
 * Mijoz/haydovchi raqamlari uchun `tel:` URI (operator panel).
 */
export function phoneToTelHref(phone: string): string {
  const raw = phone.trim();
  if (!raw) return "tel:";
  const noSpace = raw.replace(/[\s\-().\u00a0]/g, "");
  if (noSpace.startsWith("+")) return `tel:${noSpace}`;
  const digits = noSpace.replace(/\D/g, "");
  if (!digits) return "tel:";
  if (raw.startsWith("+") || noSpace.startsWith("00")) {
    return `tel:+${digits.replace(/^0+/, "")}`;
  }
  return `tel:+${digits}`;
}
