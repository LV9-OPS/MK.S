import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AppError, notFound } from "@/lib/errors";
import { checkbox, oneOf, optStr, parseInput, reqStr } from "@/lib/forms";
import { ROLES } from "@/lib/constants";
import { hashPassword, PASSWORD_MIN_LENGTH, verifyPassword } from "@/lib/password";
import { assertAdmin, assertUser, revokeAllSessions, type Actor } from "./auth";

const passwordField = z
  .string({ error: "Mot de passe obligatoire." })
  .min(PASSWORD_MIN_LENGTH, `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`)
  .max(200, "Mot de passe trop long.");

const createSchema = z.object({
  email: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.email("Adresse e-mail invalide.").max(200)),
  displayName: reqStr(60, "Le nom affiché"),
  gamertag: optStr(60, "Le gamertag"),
  password: passwordField,
  role: oneOf(ROLES, "Rôle"),
});

export async function listUsers(actor: Actor | null) {
  assertAdmin(actor);
  return prisma.user.findMany({
    orderBy: [{ active: "desc" }, { displayName: "asc" }],
    select: { id: true, email: true, displayName: true, gamertag: true, role: true, active: true, createdAt: true },
  });
}

/** Liste minimale des joueurs (pour les sélecteurs d'administration). */
export async function listPlayersForSelect(actor: Actor | null) {
  assertAdmin(actor);
  return prisma.user.findMany({
    where: { active: true },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true, gamertag: true },
  });
}

export async function createUser(actor: Actor | null, input: unknown) {
  assertAdmin(actor);
  const data = parseInput(createSchema, input);
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new AppError("Un compte existe déjà avec cet e-mail.", "CONFLICT", { email: "E-mail déjà utilisé." });
  const user = await prisma.user.create({
    data: {
      email: data.email,
      displayName: data.displayName,
      gamertag: data.gamertag ?? null,
      role: data.role,
      passwordHash: await hashPassword(data.password),
    },
  });
  await audit(actor.id, "user.create", "User", user.id, { email: user.email, role: user.role });
  return user;
}

const updateSchema = z.object({
  displayName: reqStr(60, "Le nom affiché"),
  gamertag: optStr(60, "Le gamertag"),
  role: oneOf(ROLES, "Rôle"),
  active: checkbox,
});

export async function updateUser(actor: Actor | null, userId: string, input: unknown) {
  assertAdmin(actor);
  const data = parseInput(updateSchema, input);
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw notFound("Membre");
  if (target.id === actor.id && (data.role !== "ADMIN" || !data.active)) {
    throw new AppError("Vous ne pouvez pas retirer vos propres droits d'administration ni désactiver votre compte.", "VALIDATION");
  }
  if (target.role === "ADMIN" && (data.role !== "ADMIN" || !data.active)) {
    const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", active: true, id: { not: target.id } } });
    if (otherAdmins === 0) throw new AppError("Impossible : il doit rester au moins un administrateur actif.", "VALIDATION");
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { displayName: data.displayName, gamertag: data.gamertag ?? null, role: data.role, active: data.active },
  });
  if (!data.active || data.role !== target.role) await revokeAllSessions(userId);
  await audit(actor.id, "user.update", "User", userId, {
    role: { from: target.role, to: data.role },
    active: { from: target.active, to: data.active },
  });
  return updated;
}

export async function resetPassword(actor: Actor | null, userId: string, newPassword: unknown) {
  assertAdmin(actor);
  const password = parseInput(passwordField, newPassword);
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw notFound("Membre");
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
  await revokeAllSessions(userId);
  await audit(actor.id, "user.reset_password", "User", userId);
}

const changeOwnSchema = z
  .object({ current: z.string().min(1, "Mot de passe actuel obligatoire."), next: passwordField, confirm: z.string() })
  .refine((d) => d.next === d.confirm, { message: "Les deux mots de passe ne correspondent pas.", path: ["confirm"] });

export async function changeOwnPassword(actor: Actor | null, input: unknown) {
  assertUser(actor);
  const data = parseInput(changeOwnSchema, input);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } });
  if (!(await verifyPassword(data.current, user.passwordHash))) {
    throw new AppError("Mot de passe actuel incorrect.", "VALIDATION", { current: "Mot de passe incorrect." });
  }
  await prisma.user.update({ where: { id: actor.id }, data: { passwordHash: await hashPassword(data.next) } });
  await revokeAllSessions(actor.id);
  await audit(actor.id, "user.change_password", "User", actor.id);
}
