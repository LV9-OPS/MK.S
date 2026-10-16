import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/session";
import { adminListResources, listUploadFailures } from "@/server/resources";
import { RESOURCE_CATEGORY_LABELS, type ResourceCategory } from "@/lib/constants";
import { formatBytes, formatDateTime } from "@/lib/format";
import { deleteResourceAction, toggleResourcePublishedAction } from "@/app/actions/admin";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { Flash } from "@/components/flash";
import { InlineAction } from "@/components/forms";

export const metadata: Metadata = { title: "Gérer les ressources" };
export const dynamic = "force-dynamic";

function failureDetails(details: string | null) {
  try {
    const d = details ? JSON.parse(details) : {};
    return { reason: String(d.reason ?? "inconnue"), filename: d.filename ? String(d.filename) : "—" };
  } catch {
    return { reason: "inconnue", filename: "—" };
  }
}

export default async function AdminResourcesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireAdminPage("/admin/ressources");
  const sp = await searchParams;
  const [items, failures] = await Promise.all([adminListResources(actor), listUploadFailures(actor, 10)]);
  return (
    <div className="space-y-8">
      <div>
        <Flash ok={sp.ok} />
        <PageHeader
          title="Ressources — gestion"
          subtitle="Fichiers stockés hors du dossier public et servis uniquement aux membres connectés, avec contrôle des droits à chaque téléchargement."
          actions={<Link href="/admin/ressources/nouveau" className="btn-primary">Ajouter une ressource</Link>}
        />
        {items.length === 0 ? (
          <EmptyState title="Aucune ressource" action={<Link href="/admin/ressources/nouveau" className="btn-primary">Ajouter la première ressource</Link>}>
            Overlays, logos, fonds d&apos;écran, charte graphique…
          </EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th scope="col" className="p-3 font-medium">Ressource</th>
                  <th scope="col" className="p-3 font-medium">Fichier</th>
                  <th scope="col" className="p-3 font-medium">Mise à jour</th>
                  <th scope="col" className="p-3 font-medium">État</th>
                  <th scope="col" className="p-3 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 align-top">
                    <td className="p-3">
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-muted">{RESOURCE_CATEGORY_LABELS[r.category as ResourceCategory]}{r.version ? ` · v${r.version}` : ""}</p>
                    </td>
                    <td className="p-3 text-xs text-muted">{r.originalName}<br />{r.mimeType} · {formatBytes(r.sizeBytes)}</td>
                    <td className="p-3 text-xs text-muted">{formatDateTime(r.updatedAt)}{r.uploadedBy ? <><br />par {r.uploadedBy.displayName}</> : null}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {r.published ? <Badge tone="success">Publiée</Badge> : <Badge>Brouillon</Badge>}
                        {r.access === "ADMINS" && <Badge tone="warning">Admins</Badge>}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <a href={`/api/ressources/${r.id}/fichier`} download className="btn-ghost btn-sm">Télécharger</a>
                        <Link href={`/admin/ressources/${r.id}`} className="btn-secondary btn-sm">Modifier</Link>
                        <InlineAction action={toggleResourcePublishedAction.bind(null, r.id, !r.published)} className="btn-ghost btn-sm">{r.published ? "Dépublier" : "Publier"}</InlineAction>
                        <InlineAction action={deleteResourceAction.bind(null, r.id)} className="btn-danger btn-sm" confirm={{ title: "Supprimer cette ressource ?", message: `« ${r.name} » et son fichier seront définitivement supprimés du stockage.`, confirmLabel: "Supprimer" }}>
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

      <section aria-labelledby="failures" className="card p-5">
        <h2 id="failures" className="mb-3 text-lg font-bold">Échecs d&apos;envoi récents</h2>
        {failures.length === 0 ? (
          <p className="text-sm text-muted">Aucun échec d&apos;envoi enregistré.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {failures.map((f) => {
              const d = failureDetails(f.details);
              return (
                <li key={f.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:justify-between">
                  <span><strong>{d.filename}</strong> — {d.reason}</span>
                  <span className="text-xs text-muted">{formatDateTime(f.createdAt)} · {f.actor?.displayName ?? "?"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
