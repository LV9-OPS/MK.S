import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/session";
import { listUsers } from "@/server/users";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Badge, PageHeader } from "@/components/ui";
import { Flash } from "@/components/flash";
import { CreateUserForm } from "./user-forms";

export const metadata: Metadata = { title: "Membres" };
export const dynamic = "force-dynamic";

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireAdminPage("/admin/membres");
  const sp = await searchParams;
  const users = await listUsers(actor);
  return (
    <div>
      <Flash ok={sp.ok} />
      <PageHeader title="Membres" subtitle="Les comptes sont créés ici ; il n'y a pas d'inscription publique. Seuls les administrateurs gèrent le contenu." />
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th scope="col" className="p-3 font-medium">Membre</th>
                <th scope="col" className="p-3 font-medium">Rôle</th>
                <th scope="col" className="p-3 font-medium">État</th>
                <th scope="col" className="p-3 font-medium">Créé le</th>
                <th scope="col" className="p-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/60">
                  <td className="p-3">
                    <p className="font-semibold">{u.displayName}{u.id === actor.id && <span className="ml-1 text-xs text-muted">(vous)</span>}</p>
                    <p className="text-xs text-muted">{u.email}{u.gamertag ? ` · ${u.gamertag}` : ""}</p>
                  </td>
                  <td className="p-3"><Badge tone={u.role === "ADMIN" ? "accent" : "neutral"}>{ROLE_LABELS[u.role as Role] ?? u.role}</Badge></td>
                  <td className="p-3">{u.active ? <Badge tone="success">Actif</Badge> : <Badge tone="danger">Désactivé</Badge>}</td>
                  <td className="p-3 text-muted">{formatDate(u.createdAt)}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/stats/joueur/${u.id}`} className="btn-ghost btn-sm">Stats</Link>
                      <Link href={`/admin/membres/${u.id}`} className="btn-secondary btn-sm">Modifier</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <section className="card h-fit p-5" aria-labelledby="new-user">
          <h2 id="new-user" className="mb-4 text-lg font-bold">Nouveau membre</h2>
          <CreateUserForm />
        </section>
      </div>
    </div>
  );
}
