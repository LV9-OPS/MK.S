// Validation des URL externes (liens « Participer », sources méta) et internes (redirections).

export const DEFAULT_TOURNAMENT_HOSTS = ["faceit.com", "www.faceit.com", "checkmategaming.com", "www.checkmategaming.com"];

export function allowedTournamentHosts(): string[] {
  const extra = (process.env.EXTRA_TOURNAMENT_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return [...DEFAULT_TOURNAMENT_HOSTS, ...extra];
}

/** Retourne l'URL si elle est en HTTPS, sans identifiants, sur le port standard et (option) vers un hôte autorisé. */
export function safeExternalUrl(raw: string, allowedHosts?: string[]): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "443") return null;
  if (allowedHosts && !allowedHosts.includes(url.hostname.toLowerCase())) return null;
  return url;
}

export function isAllowedTournamentUrl(raw: string): boolean {
  return safeExternalUrl(raw, allowedTournamentHosts()) !== null;
}

/** Plateforme correspondant à l'hôte d'une URL (contrôle de cohérence plateforme ↔ lien). */
export function platformForUrl(raw: string): "FACEIT" | "CMG" | null {
  const u = safeExternalUrl(raw);
  if (!u) return null;
  const h = u.hostname.toLowerCase();
  if (h === "faceit.com" || h.endsWith(".faceit.com")) return "FACEIT";
  if (h === "checkmategaming.com" || h.endsWith(".checkmategaming.com")) return "CMG";
  return null;
}

/** Les chemins de redirection internes (après connexion) doivent rester sur le site. */
export function safeInternalPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw || typeof raw !== "string") return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
