import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/session";
import { createResourceAction } from "@/app/actions/admin";
import { BackLink, PageHeader } from "@/components/ui";
import { ResourceForm } from "../resource-form";

export const metadata: Metadata = { title: "Ajouter une ressource" };
export const dynamic = "force-dynamic";

export default async function NewResourcePage() {
  await requireAdminPage("/admin/ressources/nouveau");
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/admin/ressources">Ressources</BackLink>
      <PageHeader title="Ajouter une ressource" />
      <div className="card p-6"><ResourceForm action={createResourceAction} /></div>
    </div>
  );
}
