import { z } from "zod";
import { Prisma, type WeeklyStat } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AppError, forbidden, notFound } from "@/lib/errors";
import { formToObject, oneOf, optInt, optNum, optStr, parseInput, reqStr } from "@/lib/forms";
import { STAT_GAMES, STAT_METRICS, STAT_MODES, VERIFICATION_STATUSES, type StatMetricKey } from "@/lib/constants";
import { isFilled, SCREENSHOT_RULES, UploadError, validateUpload } from "@/lib/files";
import { deleteStoredFile, saveFile } from "@/lib/storage";
import { currentWeekStart, isValidDateString, weekEndOf, weeksBetween, weekStartOf } from "@/lib/weeks";
import { assertAdmin, assertUser, isAdmin, type Actor } from "./auth";

const statSchema = z
  .object({
    week: reqStr(10, "La semaine").refine(isValidDateString, "Date de semaine invalide."),
    game: oneOf(STAT_GAMES, "Jeu"),
    mode: oneOf(STAT_MODES, "Mode"),
    matchesPlayed: optInt(0, 100000, "Parties jouées"),
    wins: optInt(0, 100000, "Victoires"),
    kills: optInt(0, 10000000, "Éliminations"),
    deaths: optInt(0, 10000000, "Morts"),
    kdRatio: optNum(0, 1000, "Ratio K/D"),
    notes: optStr(1000, "Les notes"),
  })
  .refine((d) => d.wins == null || d.matchesPlayed == null || d.wins <= d.matchesPlayed, {
    message: "Les victoires ne peuvent pas dépasser le nombre de parties.",
    path: ["wins"],
  });

type StatInput = z.infer<typeof statSchema>;

function normalize(input: StatInput, now = new Date()) {
  const weekStart = weekStartOf(input.week);
  if (weekStart > currentWeekStart(now)) {
    throw new AppError("Impossible de déclarer une semaine future.", "VALIDATION", { week: "Semaine future." });
  }
  return {
    weekStart,
    weekEnd: weekEndOf(weekStart),
    game: input.game,
    mode: input.mode,
    matchesPlayed: input.matchesPlayed ?? null,
    wins: input.wins ?? null,
    kills: input.kills ?? null,
    deaths: input.deaths ?? null,
    kdRatio: input.kdRatio ?? null,
    notes: input.notes ?? null,
  };
}

async function readScreenshot(fd: FormData, required: boolean) {
  const input = fd.get("screenshot");
  if (!isFilled(input)) {
    if (required) throw new AppError("La capture d'écran est obligatoire.", "VALIDATION", { screenshot: "Capture obligatoire." });
    return null;
  }
  try {
    return await validateUpload(input, SCREENSHOT_RULES);
  } catch (err) {
    if (err instanceof UploadError) throw new AppError(err.message, "VALIDATION", { screenshot: err.message });
    throw err;
  }
}

async function findDuplicate(playerId: string, weekStart: string, game: string, mode: string, excludeId?: string) {
  return prisma.weeklyStat.findFirst({
    where: { playerId, weekStart, game, mode, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
}

function duplicateError(existingId: string) {
  return new AppError(
    "Une déclaration existe déjà pour ce joueur, cette semaine, ce jeu et ce mode. Modifiez-la plutôt que d'en créer une nouvelle.",
    "CONFLICT",
    { week: `existing:${existingId}` },
  );
}

async function createStat(actor: Actor, playerId: string, fd: FormData, viaAdmin: boolean) {
  const data = normalize(parseInput(statSchema, formToObject(fd)));
  const dup = await findDuplicate(playerId, data.weekStart, data.game, data.mode);
  if (dup) throw duplicateError(dup.id);
  const shot = await readScreenshot(fd, true);
  const key = await saveFile("screenshots", shot!.ext, shot!.bytes);
  try {
    const stat = await prisma.weeklyStat.create({
      data: { ...data, playerId, screenshotKey: key, screenshotMime: shot!.kind.mime, submittedById: actor.id },
    });
    await audit(actor.id, viaAdmin ? "stat.admin_create" : "stat.create", "WeeklyStat", stat.id, {
      playerId, weekStart: data.weekStart, game: data.game, mode: data.mode,
    });
    return stat;
  } catch (err) {
    await deleteStoredFile(key);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await findDuplicate(playerId, data.weekStart, data.game, data.mode);
      throw duplicateError(again?.id ?? "");
    }
    throw err;
  }
}

/** Un joueur déclare sa propre semaine. */
export async function submitOwnStat(actor: Actor | null, fd: FormData) {
  assertUser(actor);
  return createStat(actor, actor.id, fd, false);
}

/** Un administrateur déclare (ou rattrape) la semaine d'un joueur. */
export async function adminSubmitStat(actor: Actor | null, fd: FormData) {
  assertAdmin(actor);
  const playerId = String(fd.get("playerId") || "");
  const player = await prisma.user.findUnique({ where: { id: playerId } });
  if (!player) throw new AppError("Joueur introuvable.", "VALIDATION", { playerId: "Choisissez un joueur." });
  return createStat(actor, player.id, fd, true);
}

/** Lecture d'une déclaration : propriétaire ou administrateur uniquement. */
export async function getStat(actor: Actor | null, id: string) {
  assertUser(actor);
  const stat = await prisma.weeklyStat.findUnique({
    where: { id },
    include: { player: { select: { id: true, displayName: true, gamertag: true } }, reviewedBy: { select: { displayName: true } } },
  });
  if (!stat || (stat.playerId !== actor.id && !isAdmin(actor))) throw notFound("Déclaration");
  return stat;
}

export function canPlayerEdit(stat: Pick<WeeklyStat, "verificationStatus">) {
  return stat.verificationStatus !== "VERIFIED";
}

export async function updateStat(actor: Actor | null, id: string, fd: FormData) {
  assertUser(actor);
  const existing = await getStat(actor, id);
  const admin = isAdmin(actor);
  if (!admin && !canPlayerEdit(existing)) {
    throw new AppError("Cette déclaration a été vérifiée : seul un administrateur peut la corriger.", "FORBIDDEN");
  }
  const data = normalize(parseInput(statSchema, formToObject(fd)));
  const dup = await findDuplicate(existing.playerId, data.weekStart, data.game, data.mode, id);
  if (dup) throw duplicateError(dup.id);
  const shot = await readScreenshot(fd, false);
  const newKey = shot ? await saveFile("screenshots", shot.ext, shot.bytes) : null;
  try {
    const updated = await prisma.weeklyStat.update({
      where: { id },
      data: {
        ...data,
        ...(newKey ? { screenshotKey: newKey, screenshotMime: shot!.kind.mime } : {}),
        // Une correction par le joueur repasse en attente de vérification.
        ...(admin ? {} : { verificationStatus: "PENDING", reviewedById: null, reviewedAt: null, reviewNote: null }),
      },
    });
    if (newKey) await deleteStoredFile(existing.screenshotKey);
    await audit(actor.id, admin && existing.playerId !== actor.id ? "stat.admin_correct" : "stat.update", "WeeklyStat", id, {
      playerId: existing.playerId, replacedScreenshot: !!newKey,
    });
    return updated;
  } catch (err) {
    await deleteStoredFile(newKey);
    throw err;
  }
}

const reviewSchema = z.object({
  status: oneOf(VERIFICATION_STATUSES, "Statut"),
  reviewNote: optStr(500, "La note"),
});

export async function reviewStat(actor: Actor | null, id: string, input: unknown) {
  assertAdmin(actor);
  const data = parseInput(reviewSchema, input);
  const existing = await prisma.weeklyStat.findUnique({ where: { id } });
  if (!existing) throw notFound("Déclaration");
  const updated = await prisma.weeklyStat.update({
    where: { id },
    data: { verificationStatus: data.status, reviewNote: data.reviewNote ?? null, reviewedById: actor.id, reviewedAt: new Date() },
  });
  await audit(actor.id, "stat.review", "WeeklyStat", id, { from: existing.verificationStatus, to: data.status });
  return updated;
}

export async function deleteStat(actor: Actor | null, id: string) {
  assertUser(actor);
  const existing = await getStat(actor, id);
  if (!isAdmin(actor) && existing.verificationStatus === "VERIFIED") throw forbidden();
  await prisma.weeklyStat.delete({ where: { id } });
  await deleteStoredFile(existing.screenshotKey);
  await audit(actor.id, "stat.delete", "WeeklyStat", id, { playerId: existing.playerId, weekStart: existing.weekStart });
}

export async function resolveScreenshot(actor: Actor | null, id: string) {
  const stat = await getStat(actor, id);
  return { key: stat.screenshotKey, mime: stat.screenshotMime, filename: `capture-${stat.weekStart}.${stat.screenshotMime.split("/")[1]}` };
}

// ——— Historique et comparaisons ———

export function effectiveKd(s: Pick<WeeklyStat, "kdRatio" | "kills" | "deaths">): { value: number | null; computed: boolean } {
  if (s.kdRatio != null) return { value: s.kdRatio, computed: false };
  if (s.kills != null && s.deaths != null && s.deaths > 0) return { value: Math.round((s.kills / s.deaths) * 100) / 100, computed: true };
  return { value: null, computed: false };
}

export type MetricComparison = {
  key: StatMetricKey;
  label: string;
  current: number | null;
  previous: number | null;
  delta: number | null;
  computed: boolean;
  decimals: number;
};

export function compareStats(
  current: Pick<WeeklyStat, StatMetricKey>,
  previous: Pick<WeeklyStat, StatMetricKey> | null,
): MetricComparison[] {
  return STAT_METRICS.map((m) => {
    let cur: number | null;
    let prev: number | null;
    let computed = false;
    if (m.key === "kdRatio") {
      const c = effectiveKd(current);
      const p = previous ? effectiveKd(previous) : { value: null, computed: false };
      cur = c.value;
      prev = p.value;
      computed = c.computed || p.computed;
    } else {
      cur = current[m.key];
      prev = previous ? previous[m.key] : null;
    }
    const delta = cur != null && prev != null ? Math.round((cur - prev) * 100) / 100 : null;
    return { key: m.key, label: m.label, current: cur, previous: prev, delta, computed, decimals: m.decimals };
  });
}

export type TimelineSlot = { weekStart: string; stat: (WeeklyStat & { reviewedBy: { displayName: string } | null }) | null };

/**
 * Historique d'un joueur pour UNE combinaison jeu + mode (on ne compare jamais des modes différents).
 * Les semaines sans déclaration apparaissent comme « manquantes ».
 */
export async function getTimeline(actor: Actor | null, playerId: string, filter: { game?: string; mode?: string } = {}) {
  assertUser(actor);
  if (playerId !== actor.id && !isAdmin(actor)) throw forbidden();
  const player = await prisma.user.findUnique({ where: { id: playerId }, select: { id: true, displayName: true, gamertag: true } });
  if (!player) throw notFound("Joueur");

  const combos = await prisma.weeklyStat.groupBy({
    by: ["game", "mode"],
    where: { playerId },
    _max: { weekStart: true },
    _count: { _all: true },
    orderBy: { _max: { weekStart: "desc" } },
  });
  const selected =
    combos.find((c) => c.game === filter.game && c.mode === filter.mode) ?? combos[0] ?? null;

  if (!selected) return { player, combos: [], selected: null, slots: [] as TimelineSlot[] };

  const stats = await prisma.weeklyStat.findMany({
    where: { playerId, game: selected.game, mode: selected.mode },
    orderBy: { weekStart: "asc" },
    include: { reviewedBy: { select: { displayName: true } } },
  });
  const byWeek = new Map(stats.map((s) => [s.weekStart, s]));
  const last = currentWeekStart() > stats[stats.length - 1].weekStart ? currentWeekStart() : stats[stats.length - 1].weekStart;
  const slots: TimelineSlot[] = weeksBetween(stats[0].weekStart, last).map((w) => ({ weekStart: w, stat: byWeek.get(w) ?? null }));

  return {
    player,
    combos: combos.map((c) => ({ game: c.game, mode: c.mode, count: c._count._all })),
    selected: { game: selected.game, mode: selected.mode },
    slots,
  };
}

/** Précédente semaine renseignée (même jeu/mode) avant l'index donné. */
export function previousFilled(slots: TimelineSlot[], index: number): TimelineSlot | null {
  for (let i = index - 1; i >= 0; i--) if (slots[i].stat) return slots[i];
  return null;
}

const adminListSchema = z.object({
  playerId: optStr(40),
  status: z.enum(VERIFICATION_STATUSES).optional().catch(undefined),
});

export async function adminListStats(actor: Actor | null, query: Record<string, unknown> = {}) {
  assertAdmin(actor);
  const q = adminListSchema.parse(query);
  return prisma.weeklyStat.findMany({
    where: { ...(q.playerId ? { playerId: q.playerId } : {}), ...(q.status ? { verificationStatus: q.status } : {}) },
    orderBy: [{ weekStart: "desc" }, { submittedAt: "desc" }],
    take: 200,
    include: { player: { select: { displayName: true, gamertag: true } }, submittedBy: { select: { displayName: true } } },
  });
}
