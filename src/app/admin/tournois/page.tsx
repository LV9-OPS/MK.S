import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/session";
import { adminListTournaments } from "@/server/tournaments";
import { faceitConfig, lastFaceitSync } from "@/server/faceit";
import { formatDateTime, formatPrize } from "@/lib/format";
import { deleteTournamentAction, faceitSyncAction, tournamentFlagsAction } from "@/app/actions/admin";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/ui";
import { Flash } from "@/components/flash";
import { InlineAction } from "@/components/forms";
import { PlatformBadge, SourceNote, StatusBadge } from "@/components/tournament-bits";

export const metadata: Metadata = { title: "Gérer les tournois" };
export const dynamic = "force-dynamic";

export default async function AdminTournamentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireAdminPage("/admin/tournois");
  const sp = await searchParams;
  const showArchived = sp.archives === "1";
  const [items, lastSync] = await Promise.all([adminListTournaments(actor, showArchived), lastFaceitSync()]);
  const faceit = faceitConfig();
  const listUrl = showArchived ? "/admin/tournois?archives=1" : "/admin/tournois";
  const syncCounts = sp.ok === "faceit-sync" ? { c: Number(sp.c) || 0, u: Number(sp.u) || 0, r: Number(sp.r) || 0 } : null;

  return (
    <div>
      <Flash ok={sp.ok} />
      {syncCounts && (
        <div className="mb-6"><Alert kind="success">Synchronisation FACEIT terminée : {syncCounts.c} nouveau(x) tournoi(s) importé(s) en brouillon, {syncCounts.u} mis à jour, {syncCounts.r} élément(s) ignoré(s) (données invalides ou incomplètes).</Alert></div>
      )}
      <PageHeader
        title="Tournois — gestion"
        subtitle="Annuaire maintenu manuellement, avec import facultatif depuis l'API officielle FACEIT. CheckMate Gaming ne publie pas d'API : ses tournois se saisissent à la main."
        actions={<Link href="/admin/tournois/nouveau" className="btn-primary">Nouveau tournoi</Link>}
      />

      <section className="card mb-6 p-5" aria-labelledby="faceit">
        <h2 id="faceit" className="mb-2 font-bold">Synchronisation FACEIT</h2>
        {faceit.configured ? (
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-muted">
              {lastSync ? `Dernière synchronisation : ${formatDateTime(lastSync.createdAt)}.` : "Jamais synchronisé."} Les tournois importés arrivent en brouillon pour relecture.
            </p>
            <InlineAction action={faceitSyncAction} className="btn-secondary btn-sm">Synchroniser maintenant</InlineAction>
          </div>
        ) : (
          <Alert kind="warning" title="Non configurée">
            Pour activer l&apos;import, ajoutez <code>FACEIT_API_KEY</code> (clé serveur de developers.faceit.com) et <code>FACEIT_GAME_ID</code> dans l&apos;environnement du serveur, puis redémarrez.
            En attendant, ajoutez les tournois manuellement.
          </Alert>
        )}
      </section>

      <div className="mb-3 flex justify-end">
        <Link href={showArchived ? "/admin/tournois" : "/admin/tournois?archives=1"} className="btn-ghost btn-sm">{showArchived ? "Masquer les archives" : "Afficher les archives"}</Link>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Aucun tournoi" action={<Link href="/admin/tournois/nouveau" className="btn-primary">Ajouter un tournoi</Link>}>
          Ajoutez un tournoi FACEIT ou CheckMate Gaming avec son lien officiel.
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th scope="col" className="p-3 font-medium">Tournoi</th>
                <th scope="col" className="p-3 font-medium">Début</th>
                <th scope="col" className="p-3 font-medium">Cashprize</th>
                <th scope="col" className="p-3 font-medium">Visibilité</th>
                <th scope="col" className="p-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-b border-border/60 align-top">
                  <td className="p-3">
                    <div className="mb-1 flex flex-wrap gap-1"><PlatformBadge platform={t.platform} /><StatusBadge status={t.status} /></div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted"><SourceNote dataSource={t.dataSource} /> · vérifié le {formatDateTime(t.lastVerifiedAt)}</p>
                  </td>
                  <td className="p-3 text-muted">{formatDateTime(t.startsAt)}</td>
                  <td className="p-3">{formatPrize(t.prizeAmountMinor, t.prizeCurrency)}</td>
                  <td className="p-3">
                    {t.archived ? <Badge tone="neutral">Archivé</Badge> : t.published ? <Badge tone="success">Publié</Badge> : <Badge>Brouillon</Badge>}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/admin/tournois/${t.id}`} className="btn-secondary btn-sm">Modifier</Link>
                      {!t.archived && (
                        <InlineAction action={tournamentFlagsAction.bind(null, t.id, { published: !t.published }, listUrl)} className="btn-ghost btn-sm">{t.published ? "Dépublier" : "Publier"}</InlineAction>
                      )}
                      <InlineAction action={tournamentFlagsAction.bind(null, t.id, { archived: !t.archived }, listUrl)} className="btn-ghost btn-sm">{t.archived ? "Désarchiver" : "Archiver"}</InlineAction>
                      <InlineAction action={deleteTournamentAction.bind(null, t.id)} className="btn-danger btn-sm" confirm={{ title: "Supprimer ce tournoi ?", message: `« ${t.name} » sera définitivement supprimé. Pour le retirer sans perdre l'historique, archivez-le plutôt.`, confirmLabel: "Supprimer" }}>
                        Supprimer
                      </InlineAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
