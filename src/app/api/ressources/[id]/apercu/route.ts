import { getCurrentUser } from "@/lib/session";
import { errorResponse, serveStoredFile } from "@/lib/serve-file";
import { resolveResourceFile } from "@/server/resources";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const file = await resolveResourceFile(await getCurrentUser(), id, "preview");
    return serveStoredFile({ ...file, inline: true });
  } catch (err) {
    return errorResponse(err);
  }
}
