import "server-only";
import { AppError } from "./errors";
import { contentDisposition } from "./files";
import { readStoredFile } from "./storage";

const RASTER = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/**
 * Sert un fichier du stockage privé. Les en-têtes empêchent la mise en cache partagée,
 * l'interprétation du contenu (nosniff + CSP sandbox) et l'affichage en ligne des types non image.
 */
export async function serveStoredFile(opts: { key: string; mime: string; filename: string; inline: boolean; cache?: "private" | "public" }) {
  let data: Buffer;
  try {
    data = await readStoredFile(opts.key);
  } catch (err) {
    console.error("Fichier manquant dans le stockage", opts.key, err);
    return new Response("Fichier indisponible sur le serveur.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const inline = opts.inline && RASTER.has(opts.mime);
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": opts.mime,
      "Content-Length": String(data.length),
      "Content-Disposition": contentDisposition(inline ? "inline" : "attachment", opts.filename),
      "Cache-Control": opts.cache === "public" ? "public, max-age=300" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

/** Convertit une erreur d'autorisation en réponse HTTP sans détail sensible. */
export function errorResponse(err: unknown): Response {
  const text = (status: number, msg: string) =>
    new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  if (err instanceof AppError) {
    if (err.code === "UNAUTHENTICATED") return text(401, "Connexion requise.");
    if (err.code === "FORBIDDEN") return text(403, "Accès refusé.");
    if (err.code === "NOT_FOUND") return text(404, "Introuvable.");
    return text(400, err.message);
  }
  console.error(err);
  return text(500, "Erreur serveur.");
}
