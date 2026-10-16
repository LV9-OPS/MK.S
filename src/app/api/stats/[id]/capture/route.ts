import { getCurrentUser } from "@/lib/session";
import { errorResponse, serveStoredFile } from "@/lib/serve-file";
import { resolveScreenshot } from "@/server/stats";

export const dynamic = "force-dynamic";

/** Capture d'écran : visible uniquement par le joueur concerné et les administrateurs. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const shot = await resolveScreenshot(await getCurrentUser(), id);
    const download = new URL(req.url).searchParams.get("telecharger") === "1";
    return serveStoredFile({ ...shot, inline: !download });
  } catch (err) {
    return errorResponse(err);
  }
}
