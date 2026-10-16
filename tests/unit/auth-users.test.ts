import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { login, logout, validateSessionToken } from "@/server/auth";
import { changeOwnPassword, createUser, listUsers, resetPassword, updateUser } from "@/server/users";
import { makeUser } from "./helpers";

describe("authentification", () => {
  it("connecte avec le bon mot de passe et crée une session hachée", async () => {
    const u = await makeUser();
    const { token } = await login(u.email.toUpperCase(), u.password, "ip-1");
    const actor = await validateSessionToken(token);
    expect(actor?.id).toBe(u.id);
    const stored = await prisma.session.findMany({ where: { userId: u.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0].id).not.toBe(token); // le jeton brut n'est pas stocké
    await logout(token);
    expect(await validateSessionToken(token)).toBe(null);
  });

  it("refuse un mauvais mot de passe avec un message générique", async () => {
    const u = await makeUser();
    await expect(login(u.email, "faux-mot-de-passe", "ip-2")).rejects.toThrow("E-mail ou mot de passe incorrect.");
    await expect(login("inconnu@test.local", "x", "ip-2")).rejects.toThrow("E-mail ou mot de passe incorrect.");
  });

  it("limite les tentatives de connexion", async () => {
    const u = await makeUser();
    for (let i = 0; i < 8; i++) await expect(login(u.email, "faux", "ip-3")).rejects.toThrow();
    await expect(login(u.email, u.password, "ip-3")).rejects.toThrow(/Trop de tentatives/);
  });

  it("invalide les sessions expirées et les comptes désactivés", async () => {
    const u = await makeUser();
    const { token } = await login(u.email, u.password, "ip-4");
    await prisma.user.update({ where: { id: u.id }, data: { active: false } });
    expect(await validateSessionToken(token)).toBe(null);
    await expect(login(u.email, u.password, "ip-4")).rejects.toThrow();
    expect(await validateSessionToken("jeton-bidon-mais-assez-long-pour-passer")).toBe(null);
  });
});

describe("gestion des membres", () => {
  it("réserve la gestion aux administrateurs", async () => {
    const player = await makeUser("PLAYER");
    await expect(listUsers(player)).rejects.toThrow(/droits/);
    await expect(listUsers(null)).rejects.toThrow(/Connexion requise/);
    await expect(
      createUser(player, { email: "x@test.local", displayName: "X", password: "motdepasse-long-1", role: "ADMIN" }),
    ).rejects.toThrow(/droits/);
  });

  it("crée un membre, refuse les doublons et les mots de passe courts", async () => {
    const admin = await makeUser("ADMIN");
    const u = await createUser(admin, { email: " Nouveau@Test.local ", displayName: "Nouveau", password: "motdepasse-long-1", role: "PLAYER" });
    expect(u.email).toBe("nouveau@test.local");
    await expect(
      createUser(admin, { email: "nouveau@test.local", displayName: "N", password: "motdepasse-long-1", role: "PLAYER" }),
    ).rejects.toThrow(/existe déjà/);
    await expect(createUser(admin, { email: "b@test.local", displayName: "B", password: "court", role: "PLAYER" })).rejects.toMatchObject({
      fieldErrors: { password: expect.stringContaining("10 caractères") },
    });
    const log = await prisma.auditLog.findFirst({ where: { action: "user.create", entityId: u.id } });
    expect(log?.actorId).toBe(admin.id);
  });

  it("empêche un admin de se rétrograder et protège le dernier admin", async () => {
    await prisma.user.updateMany({ where: { role: "ADMIN" }, data: { active: false } });
    const admin = await makeUser("ADMIN");
    await expect(updateUser(admin, admin.id, { displayName: "A", role: "PLAYER", active: "on" })).rejects.toThrow(/propres droits/);
    const other = await makeUser("ADMIN");
    await updateUser(admin, other.id, { displayName: "B", role: "PLAYER", active: "on" });
    expect((await prisma.user.findUnique({ where: { id: other.id } }))?.role).toBe("PLAYER");
  });

  it("révoque les sessions lors d'une réinitialisation ou d'un changement de mot de passe", async () => {
    const admin = await makeUser("ADMIN");
    const u = await makeUser();
    const { token } = await login(u.email, u.password, "ip-5");
    await resetPassword(admin, u.id, "nouveau-mot-de-passe-1");
    expect(await validateSessionToken(token)).toBe(null);
    const s = await login(u.email, "nouveau-mot-de-passe-1", "ip-5");
    await expect(changeOwnPassword(u, { current: "mauvais", next: "encore-un-autre-1", confirm: "encore-un-autre-1" })).rejects.toThrow(/incorrect/);
    await expect(changeOwnPassword(u, { current: "nouveau-mot-de-passe-1", next: "encore-un-autre-1", confirm: "différent" })).rejects.toThrow();
    await changeOwnPassword(u, { current: "nouveau-mot-de-passe-1", next: "encore-un-autre-1", confirm: "encore-un-autre-1" });
    expect(await validateSessionToken(s.token)).toBe(null);
  });
});
