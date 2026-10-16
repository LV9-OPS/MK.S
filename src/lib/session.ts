// Couche Next.js : cookie de session et gardes pour pages / actions / routes.
import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { validateSessionToken, type Actor } from "@/server/auth";

export const SESSION_COOKIE = "mks_session";

export const getCurrentUser = cache(async (): Promise<Actor | null> => {
  const store = await cookies();
  return validateSessionToken(store.get(SESSION_COOKIE)?.value);
});

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Pour les pages : redirige vers /connexion si non connecté. */
export async function requireUserPage(nextPath: string): Promise<Actor> {
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?suite=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Pour les pages d'administration : connexion + rôle ADMIN, sinon page 403. */
export async function requireAdminPage(nextPath: string): Promise<Actor> {
  const user = await requireUserPage(nextPath);
  if (user.role !== "ADMIN") redirect("/acces-refuse");
  return user;
}

/** Identifiant client approximatif pour la limitation de débit. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local").slice(0, 64);
}
