import { NextResponse } from "next/server";
import { participationUrl } from "@/server/tournaments";
import { errorResponse } from "@/lib/serve-file";

export const dynamic = "force-dynamic";

/**
 * Bouton « Participer » : redirige vers la page officielle du tournoi après revalidation
 * du lien (HTTPS + hôte autorisé). Aucune inscription n'est gérée sur MK.S.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = await participationUrl(id);
    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (err) {
    return errorResponse(err);
  }
}
