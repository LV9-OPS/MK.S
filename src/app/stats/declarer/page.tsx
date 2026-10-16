import type { Metadata } from "next";
import { requireUserPage } from "@/lib/session";
import { currentWeekStart, isValidDateString, todayInTeamZone, weekEndOf } from "@/lib/weeks";
import { submitStatAction } from "@/app/actions/stats";
import { BackLink, PageHeader } from "@/components/ui";
import { StatForm } from "@/components/stat-form";

export const metadata: Metadata = { title: "Déclarer une semaine" };
export const dynamic = "force-dynamic";

export default async function DeclarePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUserPage("/stats/declarer");
  const sp = await searchParams;
  const max = weekEndOf(currentWeekStart());
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/stats">Mes statistiques</BackLink>
      <PageHeader title="Déclarer une semaine" subtitle="Envoyez la capture de vos statistiques de la semaine. Une déclaration par semaine, par jeu et par mode." />
      <div className="card p-6">
        <StatForm
          action={submitStatAction}
          values={{ weekStart: sp.semaine && isValidDateString(sp.semaine) ? sp.semaine : todayInTeamZone(), game: sp.jeu, mode: sp.mode }}
          maxDate={max}
          screenshotRequired
          submitLabel="Enregistrer la semaine"
          cancelHref="/stats"
        />
      </div>
    </div>
  );
}
