/** Erreur dont le message peut être montré à l'utilisateur (aucune donnée sensible). */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "RATE_LIMITED" | "EXTERNAL",
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthenticated = () => new AppError("Connexion requise.", "UNAUTHENTICATED");
export const forbidden = () => new AppError("Vous n'avez pas les droits pour cette action.", "FORBIDDEN");
export const notFound = (what = "Élément") => new AppError(`${what} introuvable.`, "NOT_FOUND");

/** `redirectTo` : chemin interne vers lequel le formulaire navigue (navigation complète) après un succès. */
export type ActionState = { error?: string; fieldErrors?: Record<string, string>; ok?: string; redirectTo?: string } | undefined;

/** Convertit une erreur en état d'action affichable ; les erreurs inattendues restent génériques. */
export function toActionState(err: unknown): ActionState {
  if (err instanceof AppError) return { error: err.message, fieldErrors: err.fieldErrors };
  console.error(err);
  return { error: "Une erreur inattendue est survenue. Réessayez ou contactez un administrateur." };
}
