import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/session";
import { listPlayersForSelect } from "@/server/users";
import { currentWeekStart, todayInTeamZone, weekEndOf } from "@/lib/weeks";
import { adminSubmitStatAction } from "@/app/actions/stats";
import { BackLink, PageHeader } from "@/components/ui";
import { StatForm } from "@/components/stat-form";

export const metadata: Metadata = { title: "Ajouter une semaine pour un joueur" };
export const dynamic = "force-dynamic";

export default async function AdminNewStatPage() {
  const actor = await requireAdminPage("/admin/stats/nouveau");
  const players = await listPlayersForSelect(actor);
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/admin/stats">Statistiques</BackLink>
      <PageHeader title="Ajouter une semaine pour un joueur" subtitle="L'ajout est enregistré à votre nom dans le journal d'administration." />
      <div className="card p-6">
        <StatForm
          action={adminSubmitStatAction}
          players={players.map((p) => ({ id: p.id, label: `${p.displayName}${p.gamertag ? ` (${p.gamertag})` : ""}` }))}
          values={{ weekStart: todayInTeamZone() }}
          maxDate={weekEndOf(currentWeekStart())}
          screenshotRequired
          submitLabel="Enregistrer pour ce joueur"
          cancelHref="/admin/stats"
        />
      </div>
    </div>
  );
}
