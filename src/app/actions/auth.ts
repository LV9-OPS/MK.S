"use server";

import { redirect } from "next/navigation";
import { login, logout } from "@/server/auth";
import { changeOwnPassword } from "@/server/users";
import { clearSessionCookie, clientKey, getCurrentUser, getSessionToken, setSessionCookie } from "@/lib/session";
import { toActionState, type ActionState } from "@/lib/errors";
import { formToObject } from "@/lib/forms";
import { safeInternalPath } from "@/lib/urls";

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const next = safeInternalPath(String(fd.get("suite") || ""), "/");
  try {
    const { token, expiresAt } = await login(String(fd.get("email") || ""), String(fd.get("password") || ""), await clientKey());
    await setSessionCookie(token, expiresAt);
  } catch (err) {
    return toActionState(err);
  }
  return { redirectTo: next };
}

export async function logoutAction() {
  await logout(await getSessionToken());
  await clearSessionCookie();
  redirect("/?ok=logout");
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await changeOwnPassword(await getCurrentUser(), formToObject(fd));
  } catch (err) {
    return toActionState(err);
  }
  await clearSessionCookie();
  return { redirectTo: "/connexion?ok=password" };
}
