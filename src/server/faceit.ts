// Intégration FACEIT Data API v4 (documentation officielle : https://docs.faceit.com/api/data).
// Appels exclusivement côté serveur ; la clé n'est jamais envoyée au navigateur.
// Les tournois importés arrivent NON publiés : un administrateur les relit avant publication.
// Les « prizes » FACEIT sont exprimés en points FACEIT, pas en argent : ils ne sont pas
// convertis en cashprize.
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { safeExternalUrl, allowedTournamentHosts } from "@/lib/urls";
import { assertAdmin, type Actor } from "./auth";
import type { TournamentStatus } from "@/lib/constants";

const BASE = "https://open.faceit.com/data/v4";
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const PAGE_SIZE = 10; // maximum autorisé par l'endpoint /championships
const MAX_PAGES = 5;

export function faceitConfig() {
  const apiKey = process.env.FACEIT_API_KEY?.trim() || "";
  const gameId = process.env.FACEIT_GAME_ID?.trim() || "";
  return { apiKey, gameId, configured: !!apiKey && !!gameId };
}

const championshipSchema = z.object({
  championship_id: z.string().min(1),
  name: z.string().min(1).max(300),
  game_id: z.string().optional(),
  region: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  faceit_url: z.string().optional().nullable(),
  championship_start: z.number().optional().nullable(),
  subscription_end: z.number().optional().nullable(),
});
const pageSchema = z.object({ items: z.array(z.unknown()) });

export type FaceitChampionship = z.infer<typeof championshipSchema>;

/** Les horodatages FACEIT sont des entiers ; on accepte secondes ou millisecondes. */
export function faceitTime(v: number | null | undefined): Date | null {
  if (v == null || !Number.isFinite(v) || v <= 0) return null;
  return new Date(v < 1e12 ? v * 1000 : v);
}

export function mapFaceitStatus(s: string | null | undefined): TournamentStatus {
  switch ((s || "").toLowerCase()) {
    case "join":
      return "REGISTRATION_OPEN";
    case "checking_in":
    case "seeding":
    case "adjustment":
      return "REGISTRATION_CLOSED";
    case "started":
    case "ongoing":
      return "ONGOING";
    case "finished":
    case "cancelled":
      return "COMPLETED";
    default:
      return "UNKNOWN";
  }
}

export function faceitPublicUrl(raw: string | null | undefined, championshipId: string): string {
  const candidate = (raw || "").replace("{lang}", "fr");
  const url = safeExternalUrl(candidate, allowedTournamentHosts());
  return url ? url.toString() : `https://www.faceit.com/fr/championship/${encodeURIComponent(championshipId)}`;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export async function fetchFaceitChampionships(fetchImpl: FetchLike = fetch): Promise<{ items: FaceitChampionship[]; rejected: number }> {
  const { apiKey, gameId, configured } = faceitConfig();
  if (!configured) {
    throw new AppError(
      "Intégration FACEIT non configurée : renseignez FACEIT_API_KEY et FACEIT_GAME_ID côté serveur.",
      "EXTERNAL",
    );
  }
  const items: FaceitChampionship[] = [];
  let rejected = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `${BASE}/championships?game=${encodeURIComponent(gameId)}&type=upcoming&offset=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`;
    let res: Response;
    try {
      res = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
    } catch {
      throw new AppError("FACEIT ne répond pas (délai dépassé ou réseau indisponible).", "EXTERNAL");
    }
    if (res.status === 401 || res.status === 403) throw new AppError("Clé FACEIT refusée (401/403). Vérifiez FACEIT_API_KEY.", "EXTERNAL");
    if (res.status === 429) throw new AppError("Limite de requêtes FACEIT atteinte. Réessayez plus tard.", "EXTERNAL");
    if (!res.ok) throw new AppError(`FACEIT a répondu avec une erreur (HTTP ${res.status}).`, "EXTERNAL");
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new AppError("Réponse FACEIT illisible (JSON invalide).", "EXTERNAL");
    }
    const parsedPage = pageSchema.safeParse(body);
    if (!parsedPage.success) throw new AppError("Réponse FACEIT inattendue (format).", "EXTERNAL");
    for (const raw of parsedPage.data.items) {
      const c = championshipSchema.safeParse(raw);
      if (c.success && faceitTime(c.data.championship_start)) items.push(c.data);
      else rejected++;
    }
    if (parsedPage.data.items.length < PAGE_SIZE) break;
  }
  return { items, rejected };
}

export async function lastFaceitSync() {
  return prisma.auditLog.findFirst({ where: { action: "tournament.faceit_sync" }, orderBy: { createdAt: "desc" } });
}

export async function syncFaceit(actor: Actor | null, fetchImpl: FetchLike = fetch, now = new Date()) {
  assertAdmin(actor);
  const last = await lastFaceitSync();
  if (last && now.getTime() - last.createdAt.getTime() < MIN_SYNC_INTERVAL_MS) {
    throw new AppError("Synchronisation déjà effectuée il y a moins de 5 minutes.", "RATE_LIMITED");
  }
  const { items, rejected } = await fetchFaceitChampionships(fetchImpl);
  let created = 0;
  let updated = 0;
  for (const c of items) {
    const externalId = `faceit:${c.championship_id}`;
    const data = {
      name: c.name,
      platform: "FACEIT",
      game: process.env.FACEIT_GAME_LABEL || "Call of Duty",
      startsAt: faceitTime(c.championship_start)!,
      registrationDeadline: faceitTime(c.subscription_end),
      status: mapFaceitStatus(c.status),
      region: c.region || null,
      externalUrl: faceitPublicUrl(c.faceit_url, c.championship_id),
      dataSource: "FACEIT_API",
      lastVerifiedAt: now,
    };
    const existing = await prisma.tournament.findUnique({ where: { externalId } });
    if (existing) {
      await prisma.tournament.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.tournament.create({ data: { ...data, externalId, published: false, participantType: "UNKNOWN" } });
      created++;
    }
  }
  await audit(actor.id, "tournament.faceit_sync", "Tournament", null, { created, updated, rejected });
  return { created, updated, rejected };
}
