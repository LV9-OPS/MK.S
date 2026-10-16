import { z } from "zod";
import type { Prisma, Tournament } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AppError, notFound } from "@/lib/errors";
import { checkbox, formToObject, oneOf, optInt, optNum, optStr, parseInput, reqStr } from "@/lib/forms";
import { CURRENCIES, PARTICIPANT_TYPES, TOURNAMENT_PLATFORMS, TOURNAMENT_STATUSES } from "@/lib/constants";
import { isAllowedTournamentUrl, platformForUrl, safeExternalUrl, allowedTournamentHosts } from "@/lib/urls";
import { parseLocalDateTime } from "@/lib/format";
import { isValidDateString } from "@/lib/weeks";
import { assertAdmin, isAdmin, type Actor } from "./auth";

export const TOURNAMENT_SORTS = ["date_asc", "date_desc", "prize_desc", "prize_asc"] as const;

const listSchema = z.object({
  q: optStr(80),
  platform: z.enum(TOURNAMENT_PLATFORMS).optional().catch(undefined),
  participantType: z.enum(["SOLO", "TEAM"]).optional().catch(undefined),
  status: z.enum(TOURNAMENT_STATUSES).optional().catch(undefined),
  game: optStr(60),
  format: optStr(60),
  currency: z.enum(CURRENCIES).optional().catch(undefined),
  prizeMin: z.coerce.number().min(0).optional().catch(undefined),
  prizeMax: z.coerce.number().min(0).optional().catch(undefined),
  from: z.string().refine(isValidDateString).optional().catch(undefined),
  to: z.string().refine(isValidDateString).optional().catch(undefined),
  past: z.preprocess((v) => v === "1" || v === "on" || v === true, z.boolean()).catch(false),
  sort: z.enum(TOURNAMENT_SORTS).catch("date_asc"),
});

export type TournamentQuery = Record<string, unknown>;

/** Construit le filtre Prisma. Le filtre de montant exige une devise : on ne compare jamais des devises différentes. */
export function buildTournamentWhere(q: z.infer<typeof listSchema>, now = new Date()) {
  const where: Prisma.TournamentWhereInput = { published: true, archived: false };
  const and: Prisma.TournamentWhereInput[] = [];
  let prizeIgnored = false;
  if (q.q) and.push({ name: { contains: q.q } });
  if (q.platform) where.platform = q.platform;
  if (q.participantType) where.participantType = q.participantType;
  if (q.status) where.status = q.status;
  if (q.game) where.game = q.game;
  if (q.format) where.format = q.format;
  if (q.currency) where.prizeCurrency = q.currency;
  if (q.prizeMin != null || q.prizeMax != null) {
    if (!q.currency) {
      prizeIgnored = true;
    } else {
      where.prizeAmountMinor = {
        not: null,
        ...(q.prizeMin != null ? { gte: Math.round(q.prizeMin * 100) } : {}),
        ...(q.prizeMax != null ? { lte: Math.round(q.prizeMax * 100) } : {}),
      };
    }
  }
  const range: Prisma.DateTimeFilter = {};
  if (q.from) range.gte = new Date(`${q.from}T00:00:00Z`);
  if (q.to) range.lte = new Date(`${q.to}T23:59:59Z`);
  if (!q.past && !q.from && q.status !== "COMPLETED") {
    // Par défaut : tournois qui ne sont pas terminés (début dans les 12 dernières heures ou plus tard).
    and.push({ status: { not: "COMPLETED" } });
    range.gte = new Date(now.getTime() - 12 * 3600000);
  }
  if (Object.keys(range).length) where.startsAt = range;
  if (and.length) where.AND = and;
  return { where, prizeIgnored };
}

function sortTournaments(items: Tournament[], sort: (typeof TOURNAMENT_SORTS)[number]) {
  const byDate = (a: Tournament, b: Tournament) => a.startsAt.getTime() - b.startsAt.getTime();
  if (sort === "date_asc") return items.sort(byDate);
  if (sort === "date_desc") return items.sort((a, b) => -byDate(a, b));
  const dir = sort === "prize_desc" ? -1 : 1;
  // Groupés par devise (ordre alphabétique), montants inconnus en dernier.
  return items.sort((a, b) => {
    if (a.prizeAmountMinor == null && b.prizeAmountMinor == null) return byDate(a, b);
    if (a.prizeAmountMinor == null) return 1;
    if (b.prizeAmountMinor == null) return -1;
    if (a.prizeCurrency !== b.prizeCurrency) return (a.prizeCurrency ?? "").localeCompare(b.prizeCurrency ?? "");
    return dir * (a.prizeAmountMinor - b.prizeAmountMinor) || byDate(a, b);
  });
}

export async function listPublicTournaments(query: TournamentQuery = {}, now = new Date()) {
  const q = listSchema.parse(query);
  const { where, prizeIgnored } = buildTournamentWhere(q, now);
  const [items, facets] = await Promise.all([
    prisma.tournament.findMany({ where }),
    prisma.tournament.findMany({
      where: { published: true, archived: false },
      select: { game: true, format: true },
      distinct: ["game", "format"],
    }),
  ]);
  const sorted = sortTournaments(items, q.sort);
  const currencies = new Set(sorted.filter((t) => t.prizeAmountMinor != null).map((t) => t.prizeCurrency));
  return {
    items: sorted,
    query: q,
    prizeIgnored,
    mixedCurrencies: q.sort.startsWith("prize") && currencies.size > 1,
    games: [...new Set(facets.map((f) => f.game))].sort(),
    formats: [...new Set(facets.map((f) => f.format).filter((f): f is string => !!f))].sort(),
  };
}

export async function getPublicTournament(actor: Actor | null, id: string) {
  const t = await prisma.tournament.findUnique({ where: { id } });
  if (!t || ((!t.published || t.archived) && !isAdmin(actor))) throw notFound("Tournoi");
  return t;
}

/** URL de destination du bouton « Participer », revalidée à chaque clic. */
export async function participationUrl(id: string): Promise<string> {
  const t = await prisma.tournament.findUnique({ where: { id }, select: { externalUrl: true, published: true, archived: true } });
  if (!t || !t.published || t.archived) throw notFound("Tournoi");
  const url = safeExternalUrl(t.externalUrl, allowedTournamentHosts());
  if (!url) throw new AppError("Le lien d'inscription de ce tournoi n'est pas autorisé.", "VALIDATION");
  return url.toString();
}

// ——— Administration ———

const tournamentSchema = z
  .object({
    name: reqStr(140, "Le nom"),
    platform: oneOf(TOURNAMENT_PLATFORMS, "Plateforme"),
    game: reqStr(60, "Le jeu"),
    format: optStr(60, "Le format"),
    participantType: oneOf(PARTICIPANT_TYPES, "Type de participation"),
    teamSize: optInt(1, 100, "La taille d'équipe"),
    startsAt: reqStr(16, "La date de début"),
    registrationDeadline: optStr(16),
    prizeAmount: optNum(0, 100000000, "Le cashprize"),
    prizeCurrency: z.preprocess((v) => (v === "" ? undefined : v), z.enum(CURRENCIES).optional()),
    status: oneOf(TOURNAMENT_STATUSES, "Statut"),
    region: optStr(60, "La région"),
    externalUrl: reqStr(500, "Le lien officiel"),
    lastVerifiedAt: reqStr(16, "La date de vérification"),
    notes: optStr(2000, "Les notes"),
    published: checkbox,
  })
  .refine((d) => (d.prizeAmount == null) === (d.prizeCurrency == null), {
    message: "Renseignez le montant ET la devise, ou aucun des deux.",
    path: ["prizeCurrency"],
  })
  .refine((d) => d.participantType === "TEAM" || d.teamSize == null || d.teamSize === 1, {
    message: "La taille d'équipe ne s'applique qu'aux tournois en équipe.",
    path: ["teamSize"],
  });

export function parseTournament(fd: FormData | Record<string, string>) {
  const d = parseInput(tournamentSchema, fd instanceof FormData ? formToObject(fd) : fd);
  const fieldErrors: Record<string, string> = {};
  const startsAt = parseLocalDateTime(d.startsAt);
  if (!startsAt) fieldErrors.startsAt = "Date invalide.";
  const deadline = d.registrationDeadline ? parseLocalDateTime(d.registrationDeadline) : null;
  if (d.registrationDeadline && !deadline) fieldErrors.registrationDeadline = "Date invalide.";
  if (startsAt && deadline && deadline > startsAt) fieldErrors.registrationDeadline = "La clôture doit précéder le début.";
  const verified = parseLocalDateTime(d.lastVerifiedAt);
  if (!verified) fieldErrors.lastVerifiedAt = "Date invalide.";
  else if (verified.getTime() > Date.now() + 5 * 60000) fieldErrors.lastVerifiedAt = "Date future.";
  if (!isAllowedTournamentUrl(d.externalUrl)) {
    fieldErrors.externalUrl = `Lien refusé : HTTPS obligatoire, hôtes autorisés : ${allowedTournamentHosts().join(", ")}.`;
  } else {
    const p = platformForUrl(d.externalUrl);
    if (p && d.platform !== "OTHER" && p !== d.platform) fieldErrors.externalUrl = "Le lien ne correspond pas à la plateforme choisie.";
  }
  if (Object.keys(fieldErrors).length) throw new AppError("Certains champs sont invalides.", "VALIDATION", fieldErrors);
  return {
    name: d.name,
    platform: d.platform,
    game: d.game,
    format: d.format ?? null,
    participantType: d.participantType,
    teamSize: d.participantType === "SOLO" ? 1 : (d.teamSize ?? null),
    startsAt: startsAt!,
    registrationDeadline: deadline,
    prizeAmountMinor: d.prizeAmount != null ? Math.round(d.prizeAmount * 100) : null,
    prizeCurrency: d.prizeCurrency ?? null,
    status: d.status,
    region: d.region ?? null,
    externalUrl: safeExternalUrl(d.externalUrl)!.toString(),
    lastVerifiedAt: verified!,
    notes: d.notes ?? null,
    published: d.published,
  };
}

export async function adminListTournaments(actor: Actor | null, showArchived = false) {
  assertAdmin(actor);
  return prisma.tournament.findMany({ where: showArchived ? {} : { archived: false }, orderBy: { startsAt: "desc" } });
}

export async function adminGetTournament(actor: Actor | null, id: string) {
  assertAdmin(actor);
  const t = await prisma.tournament.findUnique({ where: { id } });
  if (!t) throw notFound("Tournoi");
  return t;
}

export async function createTournament(actor: Actor | null, fd: FormData | Record<string, string>) {
  assertAdmin(actor);
  const data = parseTournament(fd);
  const t = await prisma.tournament.create({ data: { ...data, dataSource: "MANUAL" } });
  await audit(actor.id, "tournament.create", "Tournament", t.id, { name: t.name, published: t.published });
  return t;
}

export async function updateTournament(actor: Actor | null, id: string, fd: FormData | Record<string, string>) {
  await adminGetTournament(actor, id);
  const data = parseTournament(fd);
  const t = await prisma.tournament.update({ where: { id }, data });
  await audit(actor!.id, "tournament.update", "Tournament", id, { published: t.published });
  return t;
}

export async function setTournamentFlags(actor: Actor | null, id: string, flags: { published?: boolean; archived?: boolean }) {
  await adminGetTournament(actor, id);
  const t = await prisma.tournament.update({ where: { id }, data: flags });
  const action =
    flags.archived === true ? "tournament.archive" : flags.archived === false ? "tournament.unarchive" : flags.published ? "tournament.publish" : "tournament.unpublish";
  await audit(actor!.id, action, "Tournament", id);
  return t;
}

export async function deleteTournament(actor: Actor | null, id: string) {
  const t = await adminGetTournament(actor, id);
  await prisma.tournament.delete({ where: { id } });
  await audit(actor!.id, "tournament.delete", "Tournament", id, { name: t.name });
}
