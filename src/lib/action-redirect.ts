import "server-only";
import type { ActionState } from "./errors";
import { safeInternalPath } from "./urls";

/**
 * Fin d'une action réussie : renvoie au formulaire l'URL interne où naviguer, avec un message
 * connu (clé de src/components/flash.tsx) et un jeton unique. La navigation est faite par
 * ActionForm (navigation complète) plutôt que par redirect() côté serveur : avec Next 15.5, la réponse
 * 303 d'une action n'était pas toujours appliquée par le client (URL et données inchangées,
 * reproduit avec des soumissions successives — voir IMPLEMENTATION_STATUS.md).
 * L'autorisation reste entièrement vérifiée côté serveur avant d'arriver ici.
 */
export function finish(path: string, ok: string, extra: Record<string, string | number> = {}): ActionState {
  const target = safeInternalPath(path, "/");
  const [base, query = ""] = target.split("?");
  const params = new URLSearchParams(query);
  params.delete("ok");
  params.delete("_");
  params.set("ok", ok);
  for (const [k, v] of Object.entries(extra)) params.set(k, String(v));
  params.set("_", Date.now().toString(36));
  return { redirectTo: `${base}?${params.toString()}` };
}
