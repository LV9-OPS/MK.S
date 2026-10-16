import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/session";
import { faceitConfig, lastFaceitSync } from "@/server/faceit";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await requireAdminPage("/admin");
  const [members, metaPub, metaDraft, tPub, tDraft, resPub, resDraft, pending, failures, lastSync] = await Promise.all([
    prisma.user.count({ where: { active: true } }),
    prisma.metaWeapon.count({ where: { published: true } }),
    prisma.metaWeapon.count({ where: { published: false } }),
    prisma.tournament.count({ where: { published: true, archived: false } }),
    prisma.tournament.count({ where: { published: false, archived: false } }),
    prisma.resource.count({ where: { published: true } }),
    prisma.resource.count({ where: { published: false } }),
    prisma.weeklyStat.count({ where: { verificationStatus: "PENDING" } }),
    prisma.auditLog.count({ where: { action: "resource.upload_failed", createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    lastFaceitSync(),
  ]);
  const faceit = faceitConfig();
  const cards = [
    { href: "/admin/membres", title: "Membres", value: members, note: "comptes actifs", cta: "Gérer les membres" },
    { href: "/admin/meta", title: "Méta", value: metaPub, note: `publiées · ${metaDraft} brouillon(s)`, cta: "Gérer la méta" },
    { href: "/admin/tournois", title: "Tournois", value: tPub, note: `publiés · ${tDraft} brouillon(s)`, cta: "Gérer les tournois" },
    { href: "/admin/ressources", title: "Ressources", value: resPub, note: `publiées · ${resDraft} brouillon(s) · ${failures} échec(s) d'envoi (7 j)`, cta: "Gérer les ressources" },
    { href: "/admin/stats?status=PENDING", title: "Statistiques", value: pending, note: "déclaration(s) à vérifier", cta: "Vérifier" },
  ];
  return (
    <div>
      <PageHeader title="Administration" subtitle="Gestion du contenu et des membres MK.S. Toutes les actions sont enregistrées dans le journal." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card p-5 transition-colors hover:border-accent/60">
            <p className="text-sm text-muted">{c.title}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-bold">{c.value}</p>
            <p className="mt-1 text-xs text-muted">{c.note}</p>
            <p className="mt-3 text-sm font-semibold text-accent">{c.cta} →</p>
          </Link>
        ))}
        <div className="card p-5">
          <p className="text-sm text-muted">Intégration FACEIT</p>
          <p className={`mt-1 text-lg font-bold ${faceit.configured ? "text-success" : "text-warning"}`}>{faceit.configured ? "Configurée" : "Non configurée"}</p>
          <p className="mt-1 text-xs text-muted">
            {faceit.configured
              ? lastSync ? `Dernière synchronisation : ${formatDateTime(lastSync.createdAt)}` : "Jamais synchronisée"
              : "Renseignez FACEIT_API_KEY et FACEIT_GAME_ID côté serveur. Saisie manuelle disponible en attendant."}
          </p>
        </div>
      </div>
    </div>
  );
}
