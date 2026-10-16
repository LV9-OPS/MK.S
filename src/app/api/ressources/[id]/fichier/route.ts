import { getCurrentUser } from "@/lib/session";
import { errorResponse, serveStoredFile } from "@/lib/serve-file";
import { resolveResourceFile } from "@/server/resources";

export const dynamic = "force-dynamic";

/** Téléchargement d'une ressource : session + droits vérifiés à chaque requête. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const file = await resolveResourceFile(await getCurrentUser(), id, "file");
    return serveStoredFile({ ...file, inline: false });
  } catch (err) {
    return errorResponse(err);
  }
}
