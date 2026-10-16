import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/lib/session";
import { listResources, previewOf } from "@/server/resources";
import { RESOURCE_CATEGORIES, RESOURCE_CATEGORY_LABELS, type ResourceCategory } from "@/lib/constants";
import { fileTypeLabel, formatBytes, formatDate } from "@/lib/format";
import { Alert, Badge, EmptyState, PageHeader, withQuery } from "@/components/ui";
import { SafeImage } from "@/components/safe-image";

export const metadata: Metadata = { title: "Ressources MK.S" };
export const dynamic = "force-dynamic";

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUserPage("/ressources");
  const sp = await searchParams;
  let data: Awaited<ReturnType<typeof listResources>>;
  try {
    data = await listResources(user, sp);
  } catch (err) {
    console.error(err);
    return (
      <>
        <PageHeader title="Ressources MK.S" />
        <Alert kind="error" title="Bibliothèque indisponible">Les ressources n&apos;ont pas pu être chargées. Réessayez dans quelques instants.</Alert>
      </>
    );
  }
  const { items, counts, query } = data;
  const current = { q: query.q, category: query.category, sort: query.sort === "recent" ? undefined : query.sort };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Réservé aux membres"
        title="Ressources MK.S"
        subtitle="Overlays, logos officiels, fonds d'écran et éléments de charte de l'équipe. Ne partagez pas ces fichiers en dehors de MK.S."
        actions={user.role === "ADMIN" ? <Link href="/admin/ressources" className="btn-secondary">Gérer les ressources</Link> : undefined}
      />
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Catégories de ressources">
          <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            <li>
              <Link href={withQuery("/ressources", current, { category: undefined })} aria-current={!query.category ? "page" : undefined}
                className="flex items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text aria-[current=page]:bg-surface-2 aria-[current=page]:text-accent">
                Toutes <span className="text-xs">{total}</span>
              </Link>
            </li>
            {RESOURCE_CATEGORIES.map((c) => (
              <li key={c}>
                <Link href={withQuery("/ressources", current, { category: c })} aria-current={query.category === c ? "page" : undefined}
                  className="flex items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text aria-[current=page]:bg-surface-2 aria-[current=page]:text-accent">
                  {RESOURCE_CATEGORY_LABELS[c]} <span className="text-xs">{counts[c] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">
          <form method="get" className="mb-6 flex flex-col gap-2 sm:flex-row" role="search" aria-label="Rechercher une ressource">
            {query.category && <input type="hidden" name="category" value={query.category} />}
            <label htmlFor="q" className="sr-only">Rechercher</label>
            <input id="q" name="q" defaultValue={query.q ?? ""} placeholder="Rechercher par nom ou description…" className="input flex-1" />
            <label htmlFor="sort" className="sr-only">Trier</label>
            <select id="sort" name="sort" defaultValue={query.sort} className="input sm:w-48">
              <option value="recent">Plus récentes</option>
              <option value="name">Nom (A → Z)</option>
              <option value="size">Taille (plus lourdes)</option>
            </select>
            <button type="submit" className="btn-primary">Rechercher</button>
          </form>

          {items.length === 0 ? (
            <EmptyState
              title={query.q || query.category ? "Aucune ressource trouvée" : "La bibliothèque est vide"}
              action={query.q || query.category ? <Link href="/ressources" className="btn-secondary">Toutes les ressources</Link> : user.role === "ADMIN" ? <Link href="/admin/ressources/nouveau" className="btn-primary">Ajouter une ressource</Link> : undefined}
            >
              {query.q || query.category ? "Essayez un autre mot-clé ou une autre catégorie." : "Aucune ressource n'a encore été publiée par les administrateurs."}
            </EmptyState>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((r) => {
                const preview = previewOf(r);
                return (
                  <li key={r.id} className="card flex flex-col overflow-hidden">
                    <Link href={`/ressources/${r.id}`} className="group block">
                      {preview ? (
                        <SafeImage src={`/api/ressources/${r.id}/apercu`} alt={`Aperçu de ${r.name}`} className="aspect-video w-full bg-surface-2 object-contain" fallback="Aperçu indisponible" />
                      ) : (
                        <div className="grid aspect-video place-items-center bg-surface-2 text-sm font-semibold text-muted">{fileTypeLabel(r.mimeType, r.originalName)}</div>
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="mb-1 flex flex-wrap gap-1">
                        <Badge>{RESOURCE_CATEGORY_LABELS[r.category as ResourceCategory] ?? r.category}</Badge>
                        {r.access === "ADMINS" && <Badge tone="warning">Admins</Badge>}
                      </div>
                      <h2 className="font-bold"><Link href={`/ressources/${r.id}`} className="hover:text-accent">{r.name}</Link></h2>
                      <p className="mt-1 text-xs text-muted">
                        {fileTypeLabel(r.mimeType, r.originalName)} · {formatBytes(r.sizeBytes)}{r.version ? ` · v${r.version}` : ""} · {formatDate(r.publishedAt ?? r.createdAt)}
                      </p>
                      <div className="mt-auto flex gap-2 pt-4">
                        <a href={`/api/ressources/${r.id}/fichier`} download className="btn-primary btn-sm">Télécharger</a>
                        <Link href={`/ressources/${r.id}`} className="btn-secondary btn-sm">Détails</Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
