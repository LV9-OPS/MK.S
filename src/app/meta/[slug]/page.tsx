import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { getCurrentUser } from "@/lib/session";
import { displayTrend, getMetaWeapon, parseSlots } from "@/server/meta";
import { META_STALE_DAYS, META_TREND_LABELS, WEAPON_CATEGORY_LABELS, type MetaTrend, type WeaponCategory } from "@/lib/constants";
import { daysSince, formatDateTime } from "@/lib/format";
import { Alert, BackLink, Badge, Dl } from "@/components/ui";
import { TierBadge, TrendBadge } from "@/components/meta-badges";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  try {
    return await getMetaWeapon(await getCurrentUser(), slug);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const w = await getMetaWeapon(null, slug);
    return { title: `${w.name} — Méta` };
  } catch {
    return { title: "Méta" };
  }
}

export default async function MetaWeaponPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const w = await load(slug);
  const t = displayTrend(w);
  const age = daysSince(w.lastVerifiedAt);

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/meta">Toute la méta</BackLink>
      {!w.published && (
        <div className="mb-4"><Alert kind="warning" title="Brouillon">Cette fiche n&apos;est pas publiée : seuls les administrateurs la voient.</Alert></div>
      )}
      <header className="card mb-6 overflow-hidden">
        {w.imageKey && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/meta/${w.id}/image`} alt={`Visuel de l'arme ${w.name}`} className="h-48 w-full bg-surface-2 object-contain p-4" />
        )}
        <div className="p-6">
          <div className="flex flex-wrap items-start gap-4">
            <TierBadge tier={w.tier} />
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold">{w.name}</h1>
              <p className="text-muted">{WEAPON_CATEGORY_LABELS[w.category as WeaponCategory] ?? w.category} · {w.game} · {w.mode}</p>
            </div>
            <TrendBadge trend={t.trend} stale={t.stale} />
          </div>
          {t.stale && (
            <div className="mt-4">
              <Alert kind="warning" title="À vérifier">
                Dernière vérification il y a {age} jours (plus de {META_STALE_DAYS} jours). Le statut «&nbsp;{META_TREND_LABELS[w.trend as MetaTrend]}&nbsp;»
                n&apos;est plus affiché tant que la fiche n&apos;a pas été revérifiée ; consultez la source avant de vous y fier.
              </Alert>
            </div>
          )}
          <div className="mt-6">
            <Dl
              items={[
                ["Source", <a key="s" href={w.sourceUrl} target="_blank" rel="noopener noreferrer" className="link break-all">{w.sourceName} ↗</a>],
                ["Dernière vérification", <time key="t" dateTime={w.lastVerifiedAt.toISOString()}>{formatDateTime(w.lastVerifiedAt)} ({age === 0 ? "aujourd'hui" : `il y a ${age} j`})</time>],
                ["Fiche modifiée le", formatDateTime(w.updatedAt)],
                ["Classement", `Tier ${w.tier}`],
              ]}
            />
          </div>
          <p className="mt-4 text-xs text-muted">
            « En hausse / En baisse » décrit l&apos;évolution de la place de l&apos;arme dans la méta selon l&apos;équipe, pas un buff ou un nerf officiel.
          </p>
          {user?.role === "ADMIN" && (
            <div className="mt-4"><Link href={`/admin/meta/${w.id}`} className="btn-secondary btn-sm">Modifier cette fiche</Link></div>
          )}
        </div>
      </header>

      {w.notes && (
        <section className="card mb-6 p-6">
          <h2 className="mb-2 text-lg font-bold">Notes de l&apos;équipe</h2>
          <p className="whitespace-pre-line text-sm text-text/90">{w.notes}</p>
        </section>
      )}

      <section aria-labelledby="loadouts-title">
        <h2 id="loadouts-title" className="mb-4 text-xl font-bold">Configurations</h2>
        {w.loadouts.length === 0 ? (
          <div className="card p-6 text-sm text-muted">Aucune configuration détaillée n&apos;a encore été ajoutée pour cette arme.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {w.loadouts.map((l) => {
              const att = parseSlots(l.attachments);
              const eq = parseSlots(l.equipment);
              return (
                <article key={l.id} className="card p-5">
                  <h3 className="mb-3 text-lg font-bold">{l.name}</h3>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Accessoires</h4>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {att.map((a, i) => (
                      <li key={i} className="flex justify-between gap-3 px-3 py-2 text-sm">
                        <span className="text-muted">{a.slot}</span>
                        <span className="text-right font-medium">{a.name}</span>
                      </li>
                    ))}
                  </ul>
                  {eq.length > 0 && (
                    <>
                      <h4 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Équipement & atouts</h4>
                      <div className="flex flex-wrap gap-2">
                        {eq.map((e, i) => <Badge key={i}>{e.slot} : {e.name}</Badge>)}
                      </div>
                    </>
                  )}
                  {l.notes && <p className="mt-4 whitespace-pre-line text-sm text-muted">{l.notes}</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
