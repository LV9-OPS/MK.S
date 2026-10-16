import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/lib/session";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { Dl, PageHeader } from "@/components/ui";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requireUserPage("/compte");
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Mon compte" />
      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold">Profil</h2>
        <Dl
          items={[
            ["Nom affiché", user.displayName],
            ["E-mail", user.email],
            ["Gamertag", user.gamertag || "Non renseigné"],
            ["Rôle", ROLE_LABELS[user.role as Role] ?? user.role],
          ]}
        />
        <p className="mt-4 text-xs text-muted">Pour modifier votre nom, gamertag ou rôle, contactez un administrateur.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/stats" className="btn-secondary btn-sm">Mes statistiques</Link>
          <Link href="/stats/declarer" className="btn-secondary btn-sm">Déclarer une semaine</Link>
        </div>
      </section>
      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold">Changer de mot de passe</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
