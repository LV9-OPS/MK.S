import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireUserPage } from "@/lib/session";
import { getResource, previewOf } from "@/server/resources";
import { RESOURCE_ACCESS_LABELS, RESOURCE_CATEGORY_LABELS, type ResourceAccess, type ResourceCategory } from "@/lib/constants";
import { fileTypeLabel, formatBytes, formatDateTime } from "@/lib/format";
import { BackLink, Dl } from "@/components/ui";
import { SafeImage } from "@/components/safe-image";

export const metadata: Metadata = { title: "Ressource" };
export const dynamic = "force-dynamic";

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/ressources/${id}`);
  let r;
  try {
    r = await getResource(user, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const preview = previewOf(r);
  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/ressources">Toutes les ressources</BackLink>
      <article className="card overflow-hidden">
        {preview ? (
          <a href={`/api/ressources/${r.id}/apercu`} target="_blank" rel="noopener" title="Ouvrir l'aperçu en taille réelle">
            <SafeImage src={`/api/ressources/${r.id}/apercu`} alt={`Aperçu de ${r.name}`} className="max-h-[60vh] w-full bg-surface-2 object-contain" fallback="Aperçu indisponible" />
          </a>
        ) : (
          <div className="grid h-48 place-items-center bg-surface-2 text-center text-sm text-muted">
            <div>
              <p className="text-lg font-semibold text-text">{fileTypeLabel(r.mimeType, r.originalName)}</p>
              <p>Pas d&apos;aperçu pour ce type de fichier — téléchargez-le pour l&apos;ouvrir.</p>
            </div>
          </div>
        )}
        <div className="p-6">
          <h1 className="text-2xl font-bold">{r.name}</h1>
          {r.description && <p className="mt-2 whitespace-pre-line text-text/90">{r.description}</p>}
          <div className="mt-6">
            <Dl
              items={[
                ["Catégorie", RESOURCE_CATEGORY_LABELS[r.category as ResourceCategory] ?? r.category],
                ["Fichier", r.originalName],
                ["Type", `${fileTypeLabel(r.mimeType, r.originalName)} (${r.mimeType})`],
                ["Taille", formatBytes(r.sizeBytes)],
                ["Version", r.version ?? "—"],
                ["Publiée le", r.publishedAt ? formatDateTime(r.publishedAt) : "—"],
                ["Accès", RESOURCE_ACCESS_LABELS[r.access as ResourceAccess] ?? r.access],
              ]}
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href={`/api/ressources/${r.id}/fichier`} download className="btn-primary">Télécharger ({formatBytes(r.sizeBytes)})</a>
            {user.role === "ADMIN" && <Link href={`/admin/ressources/${r.id}`} className="btn-secondary">Modifier</Link>}
          </div>
        </div>
      </article>
    </div>
  );
}
