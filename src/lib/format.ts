const TZ = () => process.env.TEAM_TIMEZONE || "Europe/Paris";

export const formatDateTime = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: TZ() }).format(d);
export const formatDate = (d: Date) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: TZ() }).format(d);

export function formatPrize(amountMinor: number | null, currency: string | null): string {
  if (amountMinor == null || !currency) return "Non communiqué";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} Mo`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} Go`;
}

export function daysSince(d: Date, now = new Date()): number {
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

function tzOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Valeur d'un input datetime-local (heure de l'équipe) → Date UTC. */
export function parseLocalDateTime(value: string, tz = TZ()): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offset = tzOffsetMs(new Date(guess), tz);
  const result = new Date(guess - offset);
  const offset2 = tzOffsetMs(result, tz); // second passage pour les changements d'heure
  return offset2 === offset ? result : new Date(guess - offset2);
}

/** Date UTC → valeur pour input datetime-local dans le fuseau de l'équipe. */
export function toLocalDateTimeInput(d: Date | null | undefined, tz = TZ()): string {
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function fileTypeLabel(mime: string, name: string) {
  const ext = name.split(".").pop()?.toUpperCase() ?? "";
  if (mime.startsWith("image/")) return `Image ${ext}`;
  if (mime.startsWith("video/")) return `Vidéo ${ext}`;
  if (mime === "application/pdf") return "PDF";
  if (mime === "application/zip") return "Archive ZIP";
  if (mime.startsWith("font/")) return `Police ${ext}`;
  return ext || mime;
}
