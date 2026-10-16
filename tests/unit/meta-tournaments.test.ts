import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { toLocalDateTimeInput } from "@/lib/format";
import {
  createMetaWeapon, deleteLoadout, displayTrend, getMetaWeapon, listPublishedMeta, markMetaVerified, parseSlots, saveLoadout, setMetaPublished, updateMetaWeapon,
} from "@/server/meta";
import {
  createTournament, getPublicTournament, listPublicTournaments, participationUrl, setTournamentFlags, updateTournament,
} from "@/server/tournaments";
import { fetchFaceitChampionships, faceitPublicUrl, faceitTime, mapFaceitStatus, syncFaceit } from "@/server/faceit";
import { form, makeUser } from "./helpers";

const nowInput = () => toLocalDateTimeInput(new Date(Date.now() - 60000));
const weapon = (over: Record<string, string> = {}) =>
  form({
    name: "Kogot-7", category: "SMG", game: "Warzone", mode: "Résurgence", tier: "S", trend: "CURRENT_META",
    sourceName: "WZStats", sourceUrl: "https://wzstats.gg/", lastVerifiedAt: nowInput(), published: "on", ...over,
  });

describe("méta Call of Duty", () => {
  it("seul un admin crée ; les fiches publiées apparaissent avec leur source", async () => {
    const admin = await makeUser("ADMIN");
    const player = await makeUser();
    await expect(createMetaWeapon(player, weapon())).rejects.toThrow(/droits/);
    const w = await createMetaWeapon(admin, weapon({ name: "Arme Test Méta" }));
    expect(w.slug).toBe("arme-test-meta-warzone-resurgence");
    const w2 = await createMetaWeapon(admin, weapon({ name: "Arme Test Méta" }));
    expect(w2.slug).toBe("arme-test-meta-warzone-resurgence-2");
    const list = await listPublishedMeta({ q: "Arme Test" });
    expect(list.items.map((i) => i.id)).toContain(w.id);
    expect(list.items[0].sourceUrl).toBe("https://wzstats.gg/");
    expect(list.games).toContain("Warzone");
  });

  it("filtre par catégorie, jeu et mode ; masque les brouillons au public", async () => {
    const admin = await makeUser("ADMIN");
    const draft = await createMetaWeapon(admin, weapon({ name: "Brouillon AR", category: "ASSAULT_RIFLE", game: "Black Ops 7", mode: "Classé", published: "" }));
    expect((await listPublishedMeta({ q: "Brouillon AR" })).items).toHaveLength(0);
    await expect(getMetaWeapon(null, draft.slug)).rejects.toThrow(/introuvable/);
    expect((await getMetaWeapon(admin, draft.slug)).id).toBe(draft.id); // prévisualisation admin
    await setMetaPublished(admin, draft.id, true);
    expect((await listPublishedMeta({ category: "ASSAULT_RIFLE", game: "Black Ops 7", mode: "Classé" })).items.map((i) => i.id)).toEqual([draft.id]);
    expect((await listPublishedMeta({ category: "SNIPER", q: "Brouillon AR" })).items).toHaveLength(0);
  });

  it("refuse une source non HTTPS ou une date future", async () => {
    const admin = await makeUser("ADMIN");
    await expect(createMetaWeapon(admin, weapon({ sourceUrl: "http://wzstats.gg" }))).rejects.toMatchObject({ fieldErrors: { sourceUrl: expect.any(String) } });
    await expect(createMetaWeapon(admin, weapon({ lastVerifiedAt: toLocalDateTimeInput(new Date(Date.now() + 86400000)) }))).rejects.toThrow(/invalides|futur/);
  });

  it("affiche « À VÉRIFIER » quand la fiche est périmée, et se met à jour après vérification", async () => {
    const admin = await makeUser("ADMIN");
    const old = toLocalDateTimeInput(new Date(Date.now() - 40 * 86400000));
    const w = await createMetaWeapon(admin, weapon({ name: "Vieille fiche", lastVerifiedAt: old, trend: "RISING" }));
    expect(displayTrend(w)).toEqual({ trend: "TO_VERIFY", stale: true });
    const v = await markMetaVerified(admin, w.id);
    expect(displayTrend(v)).toEqual({ trend: "RISING", stale: false });
    const u = await updateMetaWeapon(admin, w.id, weapon({ name: "Vieille fiche", trend: "FALLING", tier: "B" }));
    expect(u.trend).toBe("FALLING");
    const log = await prisma.auditLog.findFirst({ where: { action: "meta.update", entityId: w.id } });
    expect(log?.details).toContain('"to":"FALLING"');
  });

  it("gère les configurations d'accessoires", async () => {
    const admin = await makeUser("ADMIN");
    const w = await createMetaWeapon(admin, weapon({ name: "Avec loadout" }));
    const attachments = JSON.stringify([{ slot: "Bouche", name: "Silencieux" }, { slot: "Canon", name: "Canon long" }]);
    await saveLoadout(admin, w.id, null, { name: "Longue portée", attachments, equipment: "[]" });
    const full = await getMetaWeapon(null, w.slug);
    expect(full.loadouts).toHaveLength(1);
    expect(parseSlots(full.loadouts[0].attachments)).toEqual([{ slot: "Bouche", name: "Silencieux" }, { slot: "Canon", name: "Canon long" }]);
    await expect(saveLoadout(admin, w.id, null, { name: "Vide", attachments: "[]" })).rejects.toThrow(/invalides/);
    await expect(saveLoadout(admin, w.id, null, { name: "Cassé", attachments: "{pas du json" })).rejects.toThrow(/invalides/);
    await deleteLoadout(admin, w.id, full.loadouts[0].id);
    expect((await getMetaWeapon(null, w.slug)).loadouts).toHaveLength(0);
  });
});

const tournament = (over: Record<string, string> = {}) => ({
  name: "Cup Résurgence", platform: "FACEIT", game: "Warzone", format: "Quads", participantType: "TEAM", teamSize: "4",
  startsAt: toLocalDateTimeInput(new Date(Date.now() + 3 * 86400000)), registrationDeadline: "", prizeAmount: "500", prizeCurrency: "EUR",
  status: "REGISTRATION_OPEN", region: "EU", externalUrl: "https://www.faceit.com/fr/championship/test", lastVerifiedAt: nowInput(),
  notes: "", published: "on", ...over,
});

describe("tournois", () => {
  it("seul un admin crée ; les liens sont validés", async () => {
    const admin = await makeUser("ADMIN");
    const player = await makeUser();
    await expect(createTournament(player, tournament())).rejects.toThrow(/droits/);
    await expect(createTournament(admin, tournament({ externalUrl: "https://evil.example/x" }))).rejects.toMatchObject({ fieldErrors: { externalUrl: expect.stringContaining("refusé") } });
    await expect(createTournament(admin, tournament({ externalUrl: "https://www.checkmategaming.com/x" }))).rejects.toMatchObject({ fieldErrors: { externalUrl: expect.stringContaining("plateforme") } });
    await expect(createTournament(admin, tournament({ prizeCurrency: "" }))).rejects.toMatchObject({ fieldErrors: { prizeCurrency: expect.any(String) } });
    const t = await createTournament(admin, tournament());
    expect(t.prizeAmountMinor).toBe(50000);
    expect(t.dataSource).toBe("MANUAL");
    expect(await participationUrl(t.id)).toBe("https://www.faceit.com/fr/championship/test");
  });

  it("filtre par plateforme, type, devise/montant, date et recherche", async () => {
    const admin = await makeUser("ADMIN");
    const tag = `F${Date.now()}`;
    const a = await createTournament(admin, tournament({ name: `${tag} A`, prizeAmount: "100", prizeCurrency: "EUR" }));
    const b = await createTournament(admin, tournament({ name: `${tag} B`, platform: "CMG", externalUrl: "https://www.checkmategaming.com/tournament/b", participantType: "SOLO", teamSize: "", prizeAmount: "1000", prizeCurrency: "USD" }));
    const c = await createTournament(admin, tournament({ name: `${tag} C`, prizeAmount: "", prizeCurrency: "", startsAt: toLocalDateTimeInput(new Date(Date.now() + 10 * 86400000)) }));
    const ids = async (q: Record<string, string>) => (await listPublicTournaments({ q: tag, ...q })).items.map((t) => t.id);

    expect(await ids({})).toEqual([a.id, b.id, c.id]);
    expect(await ids({ platform: "CMG" })).toEqual([b.id]);
    expect(await ids({ participantType: "SOLO" })).toEqual([b.id]);
    expect(await ids({ currency: "EUR", prizeMin: "50" })).toEqual([a.id]);
    expect(await ids({ currency: "USD", prizeMax: "500" })).toEqual([]);
    const ignored = await listPublicTournaments({ q: tag, prizeMin: "50" });
    expect(ignored.prizeIgnored).toBe(true); // pas de comparaison entre devises
    const sorted = await listPublicTournaments({ q: tag, sort: "prize_desc" });
    expect(sorted.items.map((t) => t.id)).toEqual([a.id, b.id, c.id]); // groupé par devise, inconnu en dernier
    expect(sorted.mixedCurrencies).toBe(true);
    const day = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    expect(await ids({ from: day, to: day })).toEqual([c.id]);
  });

  it("masque brouillons et archives et bloque leur lien de participation", async () => {
    const admin = await makeUser("ADMIN");
    const t = await createTournament(admin, tournament({ published: "" }));
    await expect(getPublicTournament(null, t.id)).rejects.toThrow(/introuvable/);
    await expect(participationUrl(t.id)).rejects.toThrow(/introuvable/);
    await setTournamentFlags(admin, t.id, { published: true });
    expect(await participationUrl(t.id)).toMatch(/^https:\/\/www\.faceit\.com\//);
    await setTournamentFlags(admin, t.id, { archived: true });
    await expect(participationUrl(t.id)).rejects.toThrow(/introuvable/);
    // un lien devenu non autorisé en base est refusé au clic
    await setTournamentFlags(admin, t.id, { archived: false });
    await prisma.tournament.update({ where: { id: t.id }, data: { externalUrl: "https://evil.example/" } });
    await expect(participationUrl(t.id)).rejects.toThrow(/pas autorisé/);
    await updateTournament(admin, t.id, tournament({ name: "Renommé" }));
    expect((await getPublicTournament(null, t.id)).name).toBe("Renommé");
  });

  it("masque les tournois terminés par défaut", async () => {
    const admin = await makeUser("ADMIN");
    const tag = `P${Date.now()}`;
    const past = await createTournament(admin, tournament({ name: `${tag} passé`, status: "COMPLETED", startsAt: toLocalDateTimeInput(new Date(Date.now() - 5 * 86400000)) }));
    expect((await listPublicTournaments({ q: tag })).items).toHaveLength(0);
    expect((await listPublicTournaments({ q: tag, past: "1" })).items.map((t) => t.id)).toEqual([past.id]);
    expect((await listPublicTournaments({ q: tag, status: "COMPLETED" })).items.map((t) => t.id)).toEqual([past.id]);
  });
});

describe("intégration FACEIT", () => {
  it("signale clairement l'absence de configuration", async () => {
    await expect(fetchFaceitChampionships()).rejects.toThrow(/non configurée/);
  });

  it("utilitaires de conversion", () => {
    expect(faceitTime(1760000000)?.toISOString()).toBe("2025-10-09T08:53:20.000Z");
    expect(faceitTime(1760000000000)?.toISOString()).toBe("2025-10-09T08:53:20.000Z");
    expect(faceitTime(0)).toBeNull();
    expect(mapFaceitStatus("join")).toBe("REGISTRATION_OPEN");
    expect(mapFaceitStatus("bizarre")).toBe("UNKNOWN");
    expect(faceitPublicUrl("https://www.faceit.com/{lang}/championship/abc", "abc")).toBe("https://www.faceit.com/fr/championship/abc");
    expect(faceitPublicUrl("https://evil.example/x", "abc")).toBe("https://www.faceit.com/fr/championship/abc");
  });

  it("gère erreurs HTTP, réponses malformées et import (avec un fetch simulé)", async () => {
    process.env.FACEIT_API_KEY = "cle-de-test";
    process.env.FACEIT_GAME_ID = "jeu-test";
    try {
      const admin = await makeUser("ADMIN");
      const respond = (status: number, body: unknown) => async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
      await expect(fetchFaceitChampionships(respond(401, {}))).rejects.toThrow(/refusée/);
      await expect(fetchFaceitChampionships(respond(429, {}))).rejects.toThrow(/Limite/);
      await expect(fetchFaceitChampionships(respond(503, {}))).rejects.toThrow(/HTTP 503/);
      await expect(fetchFaceitChampionships(respond(200, "pas du json"))).rejects.toThrow(/illisible/);
      await expect(fetchFaceitChampionships(respond(200, { nope: 1 }))).rejects.toThrow(/inattendue/);
      await expect(fetchFaceitChampionships(async () => { throw new Error("timeout"); })).rejects.toThrow(/ne répond pas/);

      let seenAuth = "";
      const start = Math.floor(Date.now() / 1000) + 86400;
      const okFetch = async (_url: string, init?: RequestInit) => {
        seenAuth = new Headers(init?.headers).get("authorization") || "";
        return new Response(JSON.stringify({
          items: [
            { championship_id: "c1", name: "FACEIT Cup", status: "join", championship_start: start, faceit_url: "https://www.faceit.com/{lang}/championship/c1" },
            { championship_id: "c2", name: "Sans date" },
            "garbage",
          ],
        }), { status: 200 });
      };
      const res = await syncFaceit(admin, okFetch);
      expect(seenAuth).toBe("Bearer cle-de-test");
      expect(res).toEqual({ created: 1, updated: 0, rejected: 2 });
      const t = await prisma.tournament.findUnique({ where: { externalId: "faceit:c1" } });
      expect(t).toMatchObject({ dataSource: "FACEIT_API", published: false, status: "REGISTRATION_OPEN", prizeAmountMinor: null });
      await expect(syncFaceit(admin, okFetch)).rejects.toThrow(/moins de 5 minutes/);
      const later = new Date(Date.now() + 10 * 60000);
      expect(await syncFaceit(admin, okFetch, later)).toEqual({ created: 0, updated: 1, rejected: 2 });
    } finally {
      process.env.FACEIT_API_KEY = "";
      process.env.FACEIT_GAME_ID = "";
    }
  });
});
