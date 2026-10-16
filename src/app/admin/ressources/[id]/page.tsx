import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireAdminPage } from "@/lib/session";
import { adminGetResource, previewOf } from "@/server/resources";
import { formatBytes } from "@/lib/format";
import { updateResourceAction } from "@/app/actions/admin";
import { BackLink, PageHeader } from "@/components/ui";
import { SafeImage } from "@/components/safe-image";
import { ResourceForm } from "../resource-form";

export const metadata: Metadata = { title: "Modifier une ressource" };
export const dynamic = "force-dynamic";

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireAdminPage(`/admin/ressources/${id}`);
  let r;
  try {
    r = await adminGetResource(actor, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const preview = previewOf(r);
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/admin/ressources">Ressources</BackLink>
      <PageHeader title={r.name} subtitle={`${r.originalName} · ${r.mimeType} · ${formatBytes(r.sizeBytes)}`} />
      {preview && (
        <div className="card mb-6 overflow-hidden">
          <SafeImage src={`/api/ressources/${r.id}/apercu`} alt={`Aperçu actuel de ${r.name}`} className="max-h-72 w-full bg-surface-2 object-contain" fallback="Aperçu indisponible (fichier manquant)" />
        </div>
      )}
      <div className="card p-6">
        <ResourceForm
          action={updateResourceAction.bind(null, r.id)}
          values={{ ...r, hasPreview: !!preview, previewIsCustom: !!r.previewKey }}
        />
      </div>
    </div>
  );
}
