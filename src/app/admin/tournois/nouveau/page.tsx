import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/session";
import { toLocalDateTimeInput } from "@/lib/format";
import { allowedTournamentHosts } from "@/lib/urls";
import { createTournamentAction } from "@/app/actions/admin";
import { BackLink, PageHeader } from "@/components/ui";
import { TournamentForm } from "../tournament-form";

export const metadata: Metadata = { title: "Nouveau tournoi" };
export const dynamic = "force-dynamic";

export default async function NewTournamentPage() {
  await requireAdminPage("/admin/tournois/nouveau");
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/admin/tournois">Tournois</BackLink>
      <PageHeader title="Nouveau tournoi" subtitle="Recopiez uniquement les informations affichées sur la page officielle du tournoi ; laissez vide ce qui n'est pas communiqué." />
      <div className="card p-6">
        <TournamentForm action={createTournamentAction} nowInput={toLocalDateTimeInput(new Date())} allowedHosts={allowedTournamentHosts()} />
      </div>
    </div>
  );
}
