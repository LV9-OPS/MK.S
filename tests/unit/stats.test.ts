import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { addDays, currentWeekStart } from "@/lib/weeks";
import {
  adminSubmitStat, compareStats, deleteStat, getStat, getTimeline, previousFilled, resolveScreenshot, reviewStat, submitOwnStat, updateStat,
} from "@/server/stats";
import { file, form, makeUser, PDF_BYTES, PNG_BYTES } from "./helpers";

const cur = currentWeekStart();
const shot = () => file(PNG_BYTES, "capture.png", "image/png");

describe("statistiques hebdomadaires", () => {
  it("associe la déclaration au joueur connecté et à la bonne semaine", async () => {
    const p = await makeUser();
    const s = await submitOwnStat(p, form({ week: addDays(cur, 2), game: "Warzone", mode: "Résurgence", kills: "120", deaths: "60", screenshot: shot() }));
    expect(s.playerId).toBe(p.id);
    expect(s.weekStart).toBe(cur);
    expect(s.weekEnd).toBe(addDays(cur, 6));
    expect(s.verificationStatus).toBe("PENDING");
    expect(s.kdRatio).toBeNull(); // rien n'est inventé
  });

  it("empêche les doublons joueur + semaine + jeu + mode", async () => {
    const p = await makeUser();
    await submitOwnStat(p, form({ week: cur, game: "Warzone", mode: "Battle Royale", screenshot: shot() }));
    await expect(submitOwnStat(p, form({ week: cur, game: "Warzone", mode: "Battle Royale", screenshot: shot() }))).rejects.toThrow(/existe déjà/);
    // un autre mode la même semaine est autorisé
    await submitOwnStat(p, form({ week: cur, game: "Warzone", mode: "Classé", screenshot: shot() }));
  });

  it("valide la capture, la semaine et la cohérence des valeurs", async () => {
    const p = await makeUser();
    await expect(submitOwnStat(p, form({ week: cur, game: "Warzone", mode: "Autre" }))).rejects.toThrow(/obligatoire/);
    await expect(submitOwnStat(p, form({ week: cur, game: "Warzone", mode: "Autre", screenshot: file(PDF_BYTES, "a.pdf") }))).rejects.toThrow(/PNG, JPEG/);
    await expect(submitOwnStat(p, form({ week: addDays(cur, 7), game: "Warzone", mode: "Autre", screenshot: shot() }))).rejects.toThrow(/future/);
    await expect(submitOwnStat(p, form({ week: cur, game: "Fortnite", mode: "Autre", screenshot: shot() }))).rejects.toThrow(/invalides/);
    await expect(submitOwnStat(p, form({ week: cur, game: "Warzone", mode: "Autre", wins: "5", matchesPlayed: "3", screenshot: shot() }))).rejects.toThrow(/invalides/);
  });

  it("isole les données de chaque joueur (lecture, capture, modification, suppression)", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const s = await submitOwnStat(owner, form({ week: addDays(cur, -7), game: "Warzone", mode: "Autre", screenshot: shot() }));
    await expect(getStat(other, s.id)).rejects.toThrow(/introuvable/);
    await expect(resolveScreenshot(other, s.id)).rejects.toThrow(/introuvable/);
    await expect(resolveScreenshot(null, s.id)).rejects.toThrow(/Connexion requise/);
    await expect(updateStat(other, s.id, form({ week: addDays(cur, -7), game: "Warzone", mode: "Autre" }))).rejects.toThrow(/introuvable/);
    await expect(deleteStat(other, s.id)).rejects.toThrow(/introuvable/);
    await expect(getTimeline(other, owner.id)).rejects.toThrow(/droits/);
    await expect(adminSubmitStat(other, form({ playerId: owner.id, week: cur, game: "Warzone", mode: "Autre", screenshot: shot() }))).rejects.toThrow(/droits/);
    expect((await resolveScreenshot(owner, s.id)).mime).toBe("image/png");
  });

  it("permet à l'admin de déclarer, corriger et vérifier, avec traçabilité", async () => {
    const admin = await makeUser("ADMIN");
    const p = await makeUser();
    const s = await adminSubmitStat(admin, form({ playerId: p.id, week: addDays(cur, -14), game: "Black Ops 7", mode: "Multijoueur", wins: "3", screenshot: shot() }));
    expect(s.playerId).toBe(p.id);
    expect(s.submittedById).toBe(admin.id);
    await reviewStat(admin, s.id, { status: "VERIFIED", reviewNote: "OK" });
    // le joueur ne peut plus modifier une déclaration vérifiée
    await expect(updateStat(p, s.id, form({ week: addDays(cur, -14), game: "Black Ops 7", mode: "Multijoueur" }))).rejects.toThrow(/vérifiée/);
    const corrected = await updateStat(admin, s.id, form({ week: addDays(cur, -14), game: "Black Ops 7", mode: "Multijoueur", wins: "4" }));
    expect(corrected.wins).toBe(4);
    expect(corrected.verificationStatus).toBe("VERIFIED");
    const logs = await prisma.auditLog.findMany({ where: { entityId: s.id }, orderBy: { createdAt: "asc" } });
    expect(logs.map((l) => l.action)).toEqual(["stat.admin_create", "stat.review", "stat.admin_correct"]);
  });

  it("une correction par le joueur repasse en attente", async () => {
    const admin = await makeUser("ADMIN");
    const p = await makeUser();
    const s = await submitOwnStat(p, form({ week: addDays(cur, -7), game: "Warzone", mode: "Résurgence", screenshot: shot() }));
    await reviewStat(admin, s.id, { status: "REJECTED", reviewNote: "Capture illisible" });
    const u = await updateStat(p, s.id, form({ week: addDays(cur, -7), game: "Warzone", mode: "Résurgence", screenshot: shot() }));
    expect(u.verificationStatus).toBe("PENDING");
    expect(u.reviewNote).toBeNull();
  });

  it("construit l'historique avec les semaines manquantes, par jeu et mode", async () => {
    const p = await makeUser();
    await submitOwnStat(p, form({ week: addDays(cur, -21), game: "Warzone", mode: "Résurgence", kills: "100", deaths: "50", screenshot: shot() }));
    await submitOwnStat(p, form({ week: addDays(cur, -7), game: "Warzone", mode: "Résurgence", kills: "150", deaths: "50", kdRatio: "2.9", screenshot: shot() }));
    await submitOwnStat(p, form({ week: addDays(cur, -7), game: "Warzone", mode: "Battle Royale", kills: "999", screenshot: shot() }));
    const t = await getTimeline(p, p.id, { game: "Warzone", mode: "Résurgence" });
    expect(t.slots.map((s) => s.weekStart)).toEqual([addDays(cur, -21), addDays(cur, -14), addDays(cur, -7), cur]);
    expect(t.slots.map((s) => !!s.stat)).toEqual([true, false, true, false]);
    expect(t.combos).toHaveLength(2);
    const prev = previousFilled(t.slots, 2);
    expect(prev?.weekStart).toBe(addDays(cur, -21)); // saute la semaine manquante
    const cmp = compareStats(t.slots[2].stat!, prev!.stat!);
    const kills = cmp.find((c) => c.key === "kills")!;
    expect(kills).toMatchObject({ current: 150, previous: 100, delta: 50 });
    const kd = cmp.find((c) => c.key === "kdRatio")!;
    expect(kd).toMatchObject({ current: 2.9, previous: 2, computed: true }); // K/D précédent calculé et signalé
    const wins = cmp.find((c) => c.key === "wins")!;
    expect(wins).toMatchObject({ current: null, previous: null, delta: null });
  });

  it("compare sans valeur précédente", () => {
    const res = compareStats({ matchesPlayed: 10, wins: 1, kills: null, deaths: 0, kdRatio: null }, null);
    expect(res.find((c) => c.key === "matchesPlayed")).toMatchObject({ current: 10, previous: null, delta: null });
    expect(res.find((c) => c.key === "kdRatio")).toMatchObject({ current: null }); // pas de division par zéro
  });
});
