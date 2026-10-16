import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedMeta, displayTrend, parseSlots } from "@/server/meta";
import { getCurrentUser } from "@/lib/session";
import { META_STALE_DAYS, WEAPON_CATEGORIES, WEAPON_CATEGORY_LABELS, type WeaponCategory } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { Alert, EmptyState, PageHeader } from "@/components/ui";
import { TierBadge, TrendBadge } from "@/components/meta-badges";

export const metadata: Metadata = { title: "Méta Call of Duty" };
export const dynamic = "force-dynamic";

export default async function MetaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  let data: Awaited<ReturnType<typeof listPublishedMeta>>;
  try {
    data = await listPublishedMeta(sp);
  } catch (err) {
    console.error(err);
    return (
      <>
        <PageHeader title="Méta Call of Duty" />
        <Alert kind="error" title="Méta indisponible">Les fiches n&apos;ont pas pu être chargées. Réessayez dans quelques instants.</Alert>
      </>
    );
  }
  const { items, games, modes, lastUpdate, query } = data;
  const filtered = !!(query.q || query.category || query.game || query.mode);
  const staleCount = items.filter((w) => displayTrend(w).stale).length;

  return (
    <div>
      <PageHeader
        eyebrow="Armes & configurations"
        title="Méta Call of Duty"
        subtitle={
          <>
            Fiches rédigées et vérifiées manuellement par l&apos;équipe à partir de sources publiques comme{" "}
            <a href="https://wzstats.gg/" target="_blank" rel="noopener noreferrer" className="link">WZStats</a>. Chaque fiche indique sa source et sa
            date de dernière vérification.
          </>
        }
        actions={user?.role === "ADMIN" ? <Link href="/admin/meta" className="btn-secondary">Gérer la méta</Link> : undefined}
      />

      <form method="get" className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5" role="search" aria-label="Filtrer la méta">
        <div className="lg:col-span-2">
          <label htmlFor="q" className="label">Rechercher une arme</label>
          <input id="q" name="q" defaultValue={query.q ?? ""} placeholder="Nom de l'arme…" className="input" />
        </div>
        <div>
          <label htmlFor="category" className="label">Catégorie</label>
          <select id="category" name="category" defaultValue={query.category ?? ""} className="input">
            <option value="">Toutes</option>
            {WEAPON_CATEGORIES.map((c) => <option key={c} value={c}>{WEAPON_CATEGORY_LABELS[c]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="game" className="label">Jeu</label>
          <select id="game" name="game" defaultValue={query.game ?? ""} className="input">
            <option value="">Tous</option>
            {games.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mode" className="label">Mode</label>
          <select id="mode" name="mode" defaultValue={query.mode ?? ""} className="input">
            <option value="">Tous</option>
            {modes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
          <button type="submit" className="btn-primary">Filtrer</button>
          {filtered && <Link href="/meta" className="btn-ghost">Réinitialiser</Link>}
        </div>
      </form>

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
        <span>{items.length} arme{items.length > 1 ? "s" : ""}</span>
        {lastUpdate && <span>Dernière vérification : <time dateTime={lastUpdate.toISOString()}>{formatDateTime(lastUpdate)}</time></span>}
      </div>

      {staleCount > 0 && (
        <div className="mb-6">
          <Alert kind="warning" title="Informations à revérifier">
            {staleCount} fiche{staleCount > 1 ? "s n'ont" : " n'a"} pas été revérifiée{staleCount > 1 ? "s" : ""} depuis plus de {META_STALE_DAYS} jours
            et {staleCount > 1 ? "sont marquées" : "est marquée"} « À VÉRIFIER ». La méta a pu évoluer depuis.
          </Alert>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title={filtered ? "Aucune arme ne correspond à ces filtres" : "Aucune fiche méta publiée"} action={filtered ? <Link href="/meta" className="btn-secondary">Voir toute la méta</Link> : undefined}>
          {filtered ? "Essayez une autre catégorie ou un autre mode." : "Les fiches apparaîtront ici dès qu'un administrateur en aura publié."}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((w) => {
            const t = displayTrend(w);
            const firstLoadout = w.loadouts[0];
            const attachments = firstLoadout ? parseSlots(firstLoadout.attachments) : [];
            return (
              <li key={w.id}>
                <Link href={`/meta/${w.slug}`} className="card group flex h-full flex-col overflow-hidden transition-colors hover:border-accent/60">
                  {w.imageKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/meta/${w.id}/image`} alt={`Visuel de l'arme ${w.name}`} className="h-36 w-full bg-surface-2 object-contain p-3" loading="lazy" />
                  ) : (
                    <div aria-hidden className="grid h-24 place-items-center bg-surface-2 text-xs uppercase tracking-[0.25em] text-muted">
                      {WEAPON_CATEGORY_LABELS[w.category as WeaponCategory] ?? w.category}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start gap-3">
                      <TierBadge tier={w.tier} />
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg font-bold group-hover:text-accent">{w.name}</h2>
                        <p className="text-xs text-muted">{WEAPON_CATEGORY_LABELS[w.category as WeaponCategory] ?? w.category} · {w.game} · {w.mode}</p>
                      </div>
                    </div>
                    <div className="mt-3"><TrendBadge trend={t.trend} stale={t.stale} /></div>
                    {attachments.length > 0 && (
                      <p className="mt-3 line-clamp-2 text-xs text-muted">
                        {firstLoadout!.name} : {attachments.map((a) => a.name).join(" · ")}
                      </p>
                    )}
                    <p className="mt-auto pt-4 text-xs text-muted">
                      Source : {w.sourceName} · vérifiée le <time dateTime={w.lastVerifiedAt.toISOString()}>{formatDateTime(w.lastVerifiedAt)}</time>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
