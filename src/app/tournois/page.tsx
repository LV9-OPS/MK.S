import type { Metadata } from "next";
import Link from "next/link";
import { listPublicTournaments, TOURNAMENT_SORTS } from "@/server/tournaments";
import { getCurrentUser } from "@/lib/session";
import { CURRENCIES, TOURNAMENT_PLATFORMS, TOURNAMENT_PLATFORM_LABELS, TOURNAMENT_STATUSES, TOURNAMENT_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime, formatPrize } from "@/lib/format";
import { Alert, EmptyState, PageHeader } from "@/components/ui";
import { participantLabel, PlatformBadge, SourceNote, StatusBadge } from "@/components/tournament-bits";

export const metadata: Metadata = { title: "Tournois cashprize" };
export const dynamic = "force-dynamic";

const SORT_LABELS: Record<(typeof TOURNAMENT_SORTS)[number], string> = {
  date_asc: "Date (plus proche d'abord)",
  date_desc: "Date (plus lointaine d'abord)",
  prize_desc: "Cashprize (décroissant)",
  prize_asc: "Cashprize (croissant)",
};

export default async function TournamentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  let data: Awaited<ReturnType<typeof listPublicTournaments>>;
  try {
    data = await listPublicTournaments(sp);
  } catch (err) {
    console.error(err);
    return (
      <>
        <PageHeader title="Tournois cashprize" />
        <Alert kind="error" title="Annuaire indisponible">Les tournois n&apos;ont pas pu être chargés. Réessayez dans quelques instants.</Alert>
      </>
    );
  }
  const { items, query: q, prizeIgnored, mixedCurrencies, games, formats } = data;
  const filtered = Object.entries(sp).some(([k, v]) => k !== "sort" && v);

  return (
    <div>
      <PageHeader
        eyebrow="FACEIT · CheckMate Gaming"
        title="Tournois cashprize"
        subtitle="Annuaire des tournois repérés par l'équipe. L'inscription se fait toujours sur la plateforme officielle via le bouton « Participer »."
        actions={user?.role === "ADMIN" ? <Link href="/admin/tournois" className="btn-secondary">Gérer les tournois</Link> : undefined}
      />

      <form method="get" className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" role="search" aria-label="Filtrer les tournois">
        <div className="sm:col-span-2">
          <label htmlFor="q" className="label">Rechercher</label>
          <input id="q" name="q" defaultValue={q.q ?? ""} placeholder="Nom du tournoi…" className="input" />
        </div>
        <div>
          <label htmlFor="platform" className="label">Plateforme</label>
          <select id="platform" name="platform" defaultValue={q.platform ?? ""} className="input">
            <option value="">Toutes</option>
            {TOURNAMENT_PLATFORMS.map((p) => <option key={p} value={p}>{TOURNAMENT_PLATFORM_LABELS[p]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="participantType" className="label">Solo / équipe</label>
          <select id="participantType" name="participantType" defaultValue={q.participantType ?? ""} className="input">
            <option value="">Tous</option>
            <option value="SOLO">Solo</option>
            <option value="TEAM">Équipe</option>
          </select>
        </div>
        <div>
          <label htmlFor="game" className="label">Jeu</label>
          <select id="game" name="game" defaultValue={q.game ?? ""} className="input">
            <option value="">Tous</option>
            {games.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="format" className="label">Format</label>
          <select id="format" name="format" defaultValue={q.format ?? ""} className="input">
            <option value="">Tous</option>
            {formats.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="label">Statut</label>
          <select id="status" name="status" defaultValue={q.status ?? ""} className="input">
            <option value="">Tous</option>
            {TOURNAMENT_STATUSES.map((s) => <option key={s} value={s}>{TOURNAMENT_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="label">Trier par</label>
          <select id="sort" name="sort" defaultValue={q.sort} className="input">
            {TOURNAMENT_SORTS.map((s) => <option key={s} value={s}>{SORT_LABELS[s]}</option>)}
          </select>
        </div>
        <fieldset className="grid grid-cols-3 gap-2 sm:col-span-2">
          <legend className="label">Cashprize</legend>
          <select name="currency" defaultValue={q.currency ?? ""} className="input" aria-label="Devise">
            <option value="">Devise…</option>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input name="prizeMin" type="number" min={0} step="1" inputMode="numeric" defaultValue={q.prizeMin ?? ""} placeholder="Min" className="input" aria-label="Cashprize minimum" />
          <input name="prizeMax" type="number" min={0} step="1" inputMode="numeric" defaultValue={q.prizeMax ?? ""} placeholder="Max" className="input" aria-label="Cashprize maximum" />
        </fieldset>
        <div className="grid grid-cols-2 gap-2 sm:col-span-2">
          <div>
            <label htmlFor="from" className="label">Du</label>
            <input id="from" name="from" type="date" defaultValue={q.from ?? ""} className="input" />
          </div>
          <div>
            <label htmlFor="to" className="label">Au</label>
            <input id="to" name="to" type="date" defaultValue={q.to ?? ""} className="input" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-4">
          <input type="checkbox" name="past" value="1" defaultChecked={q.past} className="h-4 w-4 accent-[var(--color-accent)]" />
          Inclure les tournois terminés
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="btn-primary">Appliquer</button>
          {filtered && <Link href="/tournois" className="btn-ghost">Réinitialiser</Link>}
        </div>
      </form>

      <div className="mb-6 space-y-3">
        {prizeIgnored && (
          <Alert kind="warning">Le filtre de cashprize a été ignoré : choisissez une devise. Les montants de devises différentes ne sont jamais comparés entre eux.</Alert>
        )}
        {mixedCurrencies && (
          <Alert kind="info">Plusieurs devises : le tri par cashprize regroupe d&apos;abord par devise ({[...new Set(items.filter((t) => t.prizeCurrency).map((t) => t.prizeCurrency))].join(", ")}), puis par montant. Les cashprizes non communiqués sont en dernier.</Alert>
        )}
      </div>

      <p className="mb-4 text-sm text-muted">{items.length} tournoi{items.length > 1 ? "s" : ""}</p>

      {items.length === 0 ? (
        <EmptyState
          title={filtered ? "Aucun tournoi ne correspond à ces filtres" : "Aucun tournoi à venir pour l'instant"}
          action={filtered ? <Link href="/tournois" className="btn-secondary">Effacer les filtres</Link> : <Link href="/tournois?past=1" className="btn-secondary">Voir les tournois passés</Link>}
        >
          {filtered ? "Élargissez la période ou retirez un filtre." : "Les tournois apparaissent ici dès qu'un administrateur les publie."}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((t) => (
            <li key={t.id} className="card flex flex-col p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <PlatformBadge platform={t.platform} />
                <StatusBadge status={t.status} />
              </div>
              <h2 className="text-lg font-bold">
                <Link href={`/tournois/${t.id}`} className="hover:text-accent">{t.name}</Link>
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><dt className="text-xs text-muted">Début</dt><dd><time dateTime={t.startsAt.toISOString()}>{formatDateTime(t.startsAt)}</time></dd></div>
                <div><dt className="text-xs text-muted">Cashprize</dt><dd className={t.prizeAmountMinor == null ? "text-muted" : "font-semibold text-accent"}>{formatPrize(t.prizeAmountMinor, t.prizeCurrency)}</dd></div>
                <div><dt className="text-xs text-muted">Participation</dt><dd>{participantLabel(t.participantType, t.teamSize)}</dd></div>
                <div><dt className="text-xs text-muted">Jeu · format</dt><dd>{t.game} · {t.format ?? <span className="text-muted">format non communiqué</span>}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-muted"><SourceNote dataSource={t.dataSource} /> · vérifié le {formatDateTime(t.lastVerifiedAt)}</p>
              <div className="mt-4 flex flex-wrap gap-2 pt-1">
                <a href={`/tournois/${t.id}/participer`} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm" aria-label={`Participer à ${t.name} (ouvre la plateforme officielle)`}>
                  Participer ↗
                </a>
                <Link href={`/tournois/${t.id}`} className="btn-secondary btn-sm">Détails</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
