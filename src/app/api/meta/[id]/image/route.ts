import { getCurrentUser } from "@/lib/session";
import { errorResponse, serveStoredFile } from "@/lib/serve-file";
import { resolveMetaImage } from "@/server/meta";

export const dynamic = "force-dynamic";

/** Image d'arme (publique pour les fiches publiées). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const img = await resolveMetaImage(await getCurrentUser(), id);
    return serveStoredFile({ ...img, filename: `arme-${id}`, inline: true, cache: "public" });
  } catch (err) {
    return errorResponse(err);
  }
}
