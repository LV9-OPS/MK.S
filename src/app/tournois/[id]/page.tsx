import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { getCurrentUser } from "@/lib/session";
import { getPublicTournament } from "@/server/tournaments";
import { isAllowedTournamentUrl } from "@/lib/urls";
import { formatDateTime, formatPrize } from "@/lib/format";
import { Alert, BackLink, Dl } from "@/components/ui";
import { participantLabel, PlatformBadge, SourceNote, StatusBadge } from "@/components/tournament-bits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tournoi" };

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  let t;
  try {
    t = await getPublicTournament(user, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const linkOk = isAllowedTournamentUrl(t.externalUrl);
  const host = new URL(t.externalUrl).hostname;
  const unavailable = <span className="text-muted">Non communiqué</span>;

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/tournois">Tous les tournois</BackLink>
      {(!t.published || t.archived) && (
        <div className="mb-4"><Alert kind="warning" title="Non visible publiquement">Ce tournoi est {t.archived ? "archivé" : "non publié"} : seuls les administrateurs le voient.</Alert></div>
      )}
      <article className="card p-6 sm:p-8">
        <div className="mb-3 flex flex-wrap gap-2">
          <PlatformBadge platform={t.platform} />
          <StatusBadge status={t.status} />
        </div>
        <h1 className="text-3xl font-bold">{t.name}</h1>
        <div className="mt-6">
          <Dl
            items={[
              ["Début", <time key="d" dateTime={t.startsAt.toISOString()}>{formatDateTime(t.startsAt)}</time>],
              ["Clôture des inscriptions", t.registrationDeadline ? formatDateTime(t.registrationDeadline) : unavailable],
              ["Cashprize", t.prizeAmountMinor == null ? unavailable : <strong key="p" className="text-accent">{formatPrize(t.prizeAmountMinor, t.prizeCurrency)}</strong>],
              ["Participation", participantLabel(t.participantType, t.teamSize)],
              ["Jeu", t.game],
              ["Format", t.format ?? unavailable],
              ["Région", t.region ?? unavailable],
              ["Origine des données", <SourceNote key="s" dataSource={t.dataSource} />],
              ["Dernière vérification", formatDateTime(t.lastVerifiedAt)],
            ]}
          />
        </div>
        {t.notes && <p className="mt-6 whitespace-pre-line border-t border-border pt-4 text-sm text-text/90">{t.notes}</p>}
        <div className="mt-8 border-t border-border pt-6">
          {linkOk && t.published && !t.archived ? (
            <>
              <a href={`/tournois/${t.id}/participer`} target="_blank" rel="noopener noreferrer" className="btn-primary px-6 py-3 text-base">
                Participer sur {host} ↗
              </a>
              <p className="mt-2 text-xs text-muted">L&apos;inscription, le règlement et le paiement des gains sont gérés par la plateforme officielle, pas par MK.S.</p>
            </>
          ) : (
            <Alert kind="warning">Lien de participation indisponible pour ce tournoi.</Alert>
          )}
          {user?.role === "ADMIN" && <Link href={`/admin/tournois/${t.id}`} className="btn-secondary btn-sm mt-4">Modifier</Link>}
        </div>
      </article>
    </div>
  );
}
