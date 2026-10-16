import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/session";
import { toLocalDateTimeInput } from "@/lib/format";
import { createMetaAction } from "@/app/actions/admin";
import { BackLink, PageHeader } from "@/components/ui";
import { WeaponForm } from "../meta-forms";

export const metadata: Metadata = { title: "Nouvelle arme" };
export const dynamic = "force-dynamic";

export default async function NewMetaPage() {
  await requireAdminPage("/admin/meta/nouveau");
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/admin/meta">Méta</BackLink>
      <PageHeader title="Nouvelle arme" subtitle="Les configurations d'accessoires s'ajoutent après la création de la fiche." />
      <div className="card p-6"><WeaponForm action={createMetaAction} nowInput={toLocalDateTimeInput(new Date())} /></div>
    </div>
  );
}
