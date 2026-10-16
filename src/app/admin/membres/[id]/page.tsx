import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/session";
import { BackLink, PageHeader } from "@/components/ui";
import { Flash } from "@/components/flash";
import { EditUserForm, ResetPasswordForm } from "../user-forms";

export const metadata: Metadata = { title: "Modifier un membre" };
export const dynamic = "force-dynamic";

export default async function EditMemberPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  await requireAdminPage(`/admin/membres/${id}`);
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, displayName: true, gamertag: true, role: true, active: true } });
  if (!user) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href="/admin/membres">Membres</BackLink>
      <Flash ok={sp.ok} />
      <PageHeader title={user.displayName} subtitle={user.email} />
      <section className="card p-6"><EditUserForm user={user} /></section>
      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold">Réinitialiser le mot de passe</h2>
        <ResetPasswordForm userId={user.id} />
      </section>
    </div>
  );
}
