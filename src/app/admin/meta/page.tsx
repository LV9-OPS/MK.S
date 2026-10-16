import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/session";
import { adminListMeta, displayTrend } from "@/server/meta";
import { WEAPON_CATEGORY_LABELS, type WeaponCategory } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { Flash } from "@/components/flash";
import { TierBadge, TrendBadge } from "@/components/meta-badges";
import { InlineAction } from "@/components/forms";
import { toggleMetaPublishedAction, verifyMetaAction } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Gérer la méta" };
export const dynamic = "force-dynamic";

export default async function AdminMetaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireAdminPage("/admin/meta");
  const sp = await searchParams;
  const items = await adminListMeta(actor);
  return (
    <div>
      <Flash ok={sp.ok} />
      <PageHeader
        title="Méta — gestion"
        subtitle="Aucune API publique documentée n'existe pour WZStats : les fiches sont saisies et revérifiées manuellement à partir des sources citées."
        actions={<Link href="/admin/meta/nouveau" className="btn-primary">Nouvelle arme</Link>}
      />
      {items.length === 0 ? (
        <EmptyState title="Aucune fiche méta" action={<Link href="/admin/meta/nouveau" className="btn-primary">Créer la première fiche</Link>}>
          Ajoutez une arme, ses accessoires et la source consultée.
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th scope="col" className="p-3 font-medium">Arme</th>
                <th scope="col" className="p-3 font-medium">Statut affiché</th>
                <th scope="col" className="p-3 font-medium">Vérifiée le</th>
                <th scope="col" className="p-3 font-medium">Publication</th>
                <th scope="col" className="p-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => {
                const t = displayTrend(w);
                return (
                  <tr key={w.id} className="border-b border-border/60 align-top">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <TierBadge tier={w.tier} />
                        <div>
                          <p className="font-semibold">{w.name}</p>
                          <p className="text-xs text-muted">{WEAPON_CATEGORY_LABELS[w.category as WeaponCategory]} · {w.game} · {w.mode} · {w._count.loadouts} config.</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3"><TrendBadge trend={t.trend} stale={t.stale} /></td>
                    <td className="p-3 text-muted">{formatDateTime(w.lastVerifiedAt)}</td>
                    <td className="p-3">{w.published ? <Badge tone="success">Publiée</Badge> : <Badge>Brouillon</Badge>}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link href={`/admin/meta/${w.id}`} className="btn-secondary btn-sm">Modifier</Link>
                        <InlineAction action={verifyMetaAction.bind(null, w.id, "/admin/meta")} className="btn-ghost btn-sm">Revérifiée</InlineAction>
                        <InlineAction action={toggleMetaPublishedAction.bind(null, w.id, !w.published, "/admin/meta")} className="btn-ghost btn-sm">{w.published ? "Dépublier" : "Publier"}</InlineAction>
                        {w.published && <Link href={`/meta/${w.slug}`} className="btn-ghost btn-sm">Voir</Link>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
