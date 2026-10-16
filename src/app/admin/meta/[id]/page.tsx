import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireAdminPage } from "@/lib/session";
import { adminGetMeta, displayTrend, parseSlots } from "@/server/meta";
import { formatDateTime, toLocalDateTimeInput } from "@/lib/format";
import { deleteMetaAction, toggleMetaPublishedAction, updateMetaAction, verifyMetaAction } from "@/app/actions/admin";
import { BackLink, Badge, PageHeader } from "@/components/ui";
import { Flash } from "@/components/flash";
import { InlineAction } from "@/components/forms";
import { TrendBadge } from "@/components/meta-badges";
import { LoadoutForm, WeaponForm } from "../meta-forms";

export const metadata: Metadata = { title: "Modifier une arme" };
export const dynamic = "force-dynamic";

export default async function EditMetaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await requireAdminPage(`/admin/meta/${id}`);
  let w;
  try {
    w = await adminGetMeta(actor, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const t = displayTrend(w);
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <BackLink href="/admin/meta">Méta</BackLink>
        <Flash ok={sp.ok} />
        <PageHeader
          title={w.name}
          subtitle={<span className="flex flex-wrap items-center gap-2">{w.published ? <Badge tone="success">Publiée</Badge> : <Badge>Brouillon</Badge>} <TrendBadge trend={t.trend} stale={t.stale} /> <span className="text-xs">Vérifiée le {formatDateTime(w.lastVerifiedAt)}</span></span>}
          actions={
            <>
              <Link href={`/meta/${w.slug}`} className="btn-ghost btn-sm">{w.published ? "Voir la fiche" : "Prévisualiser"}</Link>
              <InlineAction action={verifyMetaAction.bind(null, w.id, `/admin/meta/${w.id}`)}>Marquer revérifiée maintenant</InlineAction>
              <InlineAction action={toggleMetaPublishedAction.bind(null, w.id, !w.published, `/admin/meta/${w.id}`)}>{w.published ? "Dépublier" : "Publier"}</InlineAction>
              <InlineAction action={deleteMetaAction.bind(null, w.id)} className="btn-danger btn-sm" confirm={{ title: "Supprimer cette fiche ?", message: `« ${w.name} » et ses ${w.loadouts.length} configuration(s) seront définitivement supprimées.`, confirmLabel: "Supprimer" }}>
                Supprimer
              </InlineAction>
            </>
          }
        />
      </div>
      <section className="card p-6" aria-labelledby="fiche">
        <h2 id="fiche" className="mb-4 text-lg font-bold">Fiche</h2>
        <WeaponForm
          action={updateMetaAction.bind(null, w.id)}
          nowInput={toLocalDateTimeInput(new Date())}
          weapon={{ ...w, lastVerifiedAtInput: toLocalDateTimeInput(w.lastVerifiedAt) }}
        />
      </section>
      <section aria-labelledby="configs" className="space-y-4">
        <h2 id="configs" className="text-lg font-bold">Configurations ({w.loadouts.length})</h2>
        {w.loadouts.map((l) => (
          <LoadoutForm key={`${l.id}-${l.updatedAt.getTime()}`} weaponId={w.id} loadout={{ id: l.id, name: l.name, attachments: parseSlots(l.attachments), equipment: parseSlots(l.equipment), notes: l.notes, position: l.position }} />
        ))}
        <h3 className="pt-2 text-base font-semibold">Ajouter une configuration</h3>
        <LoadoutForm key={`new-${w.loadouts.length}`} weaponId={w.id} />
      </section>
    </div>
  );
}
