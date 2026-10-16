import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireUserPage } from "@/lib/session";
import { canPlayerEdit, getStat } from "@/server/stats";
import { currentWeekStart, weekEndOf, weekLabel } from "@/lib/weeks";
import { updateStatAction } from "@/app/actions/stats";
import { Alert, BackLink, PageHeader } from "@/components/ui";
import { StatForm } from "@/components/stat-form";

export const metadata: Metadata = { title: "Modifier une déclaration" };
export const dynamic = "force-dynamic";

export default async function EditStatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/stats/${id}/modifier`);
  let stat;
  try {
    stat = await getStat(user, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const isAdmin = user.role === "ADMIN";
  const back = stat.playerId === user.id ? "/stats" : `/admin/stats/joueur/${stat.playerId}`;
  const backHref = `${back}?${new URLSearchParams({ jeu: stat.game, mode: stat.mode, semaine: stat.weekStart })}`;

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href={backHref}>Retour à l&apos;historique</BackLink>
      <PageHeader
        title={stat.playerId === user.id ? "Modifier ma déclaration" : `Corriger la déclaration de ${stat.player.displayName}`}
        subtitle={`${weekLabel(stat.weekStart)} · ${stat.game} · ${stat.mode}`}
      />
      {!isAdmin && !canPlayerEdit(stat) ? (
        <Alert kind="warning" title="Déclaration vérifiée">Cette déclaration a été vérifiée par un administrateur : contactez-le pour toute correction.</Alert>
      ) : (
        <div className="card p-6">
          {!isAdmin && stat.verificationStatus !== "PENDING" && (
            <div className="mb-4"><Alert kind="info">Après modification, la déclaration repassera en attente de vérification.</Alert></div>
          )}
          {isAdmin && stat.playerId !== user.id && (
            <div className="mb-4"><Alert kind="info">Correction administrateur : l&apos;action sera enregistrée dans le journal.</Alert></div>
          )}
          <StatForm
            action={updateStatAction.bind(null, stat.id)}
            values={stat}
            maxDate={weekEndOf(currentWeekStart())}
            screenshotRequired={false}
            currentScreenshot={`/api/stats/${stat.id}/capture`}
            submitLabel="Enregistrer les modifications"
            cancelHref={backHref}
          />
        </div>
      )}
    </div>
  );
}
