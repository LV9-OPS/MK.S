// Bornes de semaine : semaines ISO (lundi → dimanche) exprimées en dates calendaires
// (YYYY-MM-DD) dans le fuseau de l'équipe. Aucune heure n'est stockée, ce qui évite
// les décalages liés aux fuseaux et aux changements d'heure.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function teamTimeZone(): string {
  return process.env.TEAM_TIMEZONE || "Europe/Paris";
}

export function isValidDateString(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function toUtcDate(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, days: number): string {
  const d = toUtcDate(s);
  d.setUTCDate(d.getUTCDate() + days);
  return fmt(d);
}

/** Date calendaire courante dans le fuseau de l'équipe. */
export function todayInTeamZone(now: Date = new Date(), tz = teamTimeZone()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Lundi de la semaine ISO contenant la date donnée. */
export function weekStartOf(s: string): string {
  if (!isValidDateString(s)) throw new Error(`Date invalide : ${s}`);
  const dow = toUtcDate(s).getUTCDay(); // 0 = dimanche
  const offset = dow === 0 ? -6 : 1 - dow;
  return addDays(s, offset);
}

export function weekEndOf(weekStart: string): string {
  return addDays(weekStart, 6);
}

export function currentWeekStart(now: Date = new Date()): string {
  return weekStartOf(todayInTeamZone(now));
}

/** Numéro de semaine ISO 8601 et année ISO. */
export function isoWeek(weekStart: string): { year: number; week: number } {
  const thursday = toUtcDate(addDays(weekStartOf(weekStart), 3));
  const year = thursday.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week = Math.floor((thursday.getTime() - jan1) / 86400000 / 7) + 1;
  return { year, week };
}

const shortFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

export function weekLabel(weekStart: string): string {
  const { year, week } = isoWeek(weekStart);
  return `Semaine ${week} · ${year} (${shortFmt.format(toUtcDate(weekStart))} – ${shortFmt.format(toUtcDate(weekEndOf(weekStart)))})`;
}

export function weekShortLabel(weekStart: string): string {
  const { year, week } = isoWeek(weekStart);
  return `S${week} ${year}`;
}

/** Liste des lundis de `from` à `to` inclus (ordre chronologique, 10 ans maximum). */
export function weeksBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let w = weekStartOf(from);
  const end = weekStartOf(to);
  let guard = 0;
  while (w <= end && guard++ < 520) {
    out.push(w);
    w = addDays(w, 7);
  }
  return out;
}

/** Les `n` dernières semaines (la courante en premier). */
export function recentWeeks(n: number, now: Date = new Date()): string[] {
  const cur = currentWeekStart(now);
  return Array.from({ length: n }, (_, i) => addDays(cur, -7 * i));
}
