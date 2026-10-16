import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireAdminPage } from "@/lib/session";
import { adminGetTournament } from "@/server/tournaments";
import { toLocalDateTimeInput } from "@/lib/format";
import { allowedTournamentHosts } from "@/lib/urls";
import { updateTournamentAction } from "@/app/actions/admin";
import { BackLink, PageHeader } from "@/components/ui";
import { TournamentForm } from "../tournament-form";

export const metadata: Metadata = { title: "Modifier un tournoi" };
export const dynamic = "force-dynamic";

export default async function EditTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireAdminPage(`/admin/tournois/${id}`);
  let t;
  try {
    t = await adminGetTournament(actor, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/admin/tournois">Tournois</BackLink>
      <PageHeader title={t.name} actions={<Link href={`/tournois/${t.id}`} className="btn-ghost btn-sm">Voir la page publique</Link>} />
      <div className="card p-6">
        <TournamentForm
          action={updateTournamentAction.bind(null, t.id)}
          nowInput={toLocalDateTimeInput(new Date())}
          allowedHosts={allowedTournamentHosts()}
          values={{
            ...t,
            startsAt: toLocalDateTimeInput(t.startsAt),
            registrationDeadline: toLocalDateTimeInput(t.registrationDeadline),
            lastVerifiedAt: toLocalDateTimeInput(t.lastVerifiedAt),
            prizeAmount: t.prizeAmountMinor == null ? "" : String(t.prizeAmountMinor / 100),
          }}
        />
      </div>
    </div>
  );
}
