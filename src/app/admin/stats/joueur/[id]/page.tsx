import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireAdminPage } from "@/lib/session";
import { getTimeline } from "@/server/stats";
import { isValidDateString } from "@/lib/weeks";
import { BackLink, PageHeader } from "@/components/ui";
import { Flash } from "@/components/flash";
import { StatsTimeline } from "@/components/stats-timeline";

export const metadata: Metadata = { title: "Historique d'un joueur" };
export const dynamic = "force-dynamic";

export default async function PlayerStatsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await requireAdminPage(`/admin/stats/joueur/${id}`);
  let timeline;
  try {
    timeline = await getTimeline(actor, id, { game: sp.jeu, mode: sp.mode });
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  return (
    <div>
      <BackLink href="/admin/stats">Statistiques</BackLink>
      <Flash ok={sp.ok} />
      <PageHeader
        eyebrow="Historique joueur"
        title={timeline.player.displayName}
        subtitle={timeline.player.gamertag ?? undefined}
        actions={<Link href="/admin/stats/nouveau" className="btn-secondary">Ajouter une semaine</Link>}
      />
      <StatsTimeline
        timeline={timeline}
        selectedWeek={sp.semaine && isValidDateString(sp.semaine) ? sp.semaine : undefined}
        basePath={`/admin/stats/joueur/${id}`}
        isOwner={actor.id === id}
        isAdmin
      />
    </div>
  );
}
