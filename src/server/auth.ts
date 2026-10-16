// Service d'authentification indépendant de Next.js (testable directement).
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { AppError, forbidden, unauthenticated } from "@/lib/errors";
import { audit } from "@/lib/audit";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export type Actor = { id: string; role: string; email: string; displayName: string; gamertag: string | null };

export const isAdmin = (a: Actor | null | undefined): boolean => a?.role === "ADMIN";

export function assertUser(actor: Actor | null | undefined): asserts actor is Actor {
  if (!actor) throw unauthenticated();
}

export function assertAdmin(actor: Actor | null | undefined): asserts actor is Actor {
  assertUser(actor);
  if (actor.role !== "ADMIN") throw forbidden();
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Hachage factice pour égaliser le temps de réponse quand l'e-mail n'existe pas.
let dummyHash: Promise<string> | null = null;

export async function login(emailRaw: string, password: string, clientKey: string) {
  const email = emailRaw.trim().toLowerCase();
  const limiterKey = `login:${clientKey}:${email}`;
  const rl = rateLimit(limiterKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
  if (!rl.ok) {
    throw new AppError(
      `Trop de tentatives. Réessayez dans ${Math.ceil(rl.retryAfterMs / 60000)} min.`,
      "RATE_LIMITED",
    );
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    dummyHash ??= hashPassword("dummy-password-for-timing");
    await verifyPassword(password, await dummyHash);
    throw new AppError("E-mail ou mot de passe incorrect.", "UNAUTHENTICATED");
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok || !user.active) {
    // Même message pour un compte désactivé : on ne révèle pas l'état du compte.
    throw new AppError("E-mail ou mot de passe incorrect.", "UNAUTHENTICATED");
  }
  resetRateLimit(limiterKey);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { id: hashToken(token), userId: user.id, expiresAt } });
  await audit(user.id, "auth.login", "User", user.id);
  return { token, expiresAt, user };
}

export async function validateSessionToken(token: string | undefined | null): Promise<Actor | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  const session = await prisma.session.findUnique({ where: { id: hashToken(token) }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now() || !session.user.active) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  const { id, role, email, displayName, gamertag } = session.user;
  return { id, role, email, displayName, gamertag };
}

export async function logout(token: string | undefined | null) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { id: hashToken(token) } });
}

export async function revokeAllSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}
