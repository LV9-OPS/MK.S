import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/lib/session";
import { getTimeline } from "@/server/stats";
import { isValidDateString } from "@/lib/weeks";
import { Flash } from "@/components/flash";
import { PageHeader } from "@/components/ui";
import { StatsTimeline } from "@/components/stats-timeline";

export const metadata: Metadata = { title: "Mes statistiques" };
export const dynamic = "force-dynamic";

export default async function MyStatsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUserPage("/stats");
  const sp = await searchParams;
  const timeline = await getTimeline(user, user.id, { game: sp.jeu, mode: sp.mode });
  return (
    <div>
      <Flash ok={sp.ok} />
      <PageHeader
        eyebrow={user.gamertag ?? user.displayName}
        title="Mes statistiques"
        subtitle="Votre historique semaine par semaine : capture d'écran, valeurs relevées et évolution par rapport à la semaine précédente."
        actions={<Link href="/stats/declarer" className="btn-primary">Déclarer une semaine</Link>}
      />
      <StatsTimeline timeline={timeline} selectedWeek={sp.semaine && isValidDateString(sp.semaine) ? sp.semaine : undefined} basePath="/stats" isOwner isAdmin={user.role === "ADMIN"} />
    </div>
  );
}
