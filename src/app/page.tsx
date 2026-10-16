import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Flash } from "@/components/flash";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const [metaCount, metaLast, tournamentCount] = await Promise.all([
    prisma.metaWeapon.count({ where: { published: true } }),
    prisma.metaWeapon.findFirst({ where: { published: true }, orderBy: { lastVerifiedAt: "desc" }, select: { lastVerifiedAt: true } }),
    prisma.tournament.count({ where: { published: true, archived: false, status: { not: "COMPLETED" }, startsAt: { gte: new Date(Date.now() - 12 * 3600000) } } }),
  ]);

  const features = [
    {
      href: "/meta",
      title: "Méta Call of Duty",
      text: "Armes, accessoires et configurations recommandées, avec la source et la date de vérification de chaque fiche.",
      meta: metaCount ? `${metaCount} fiche${metaCount > 1 ? "s" : ""} · vérifiée le ${formatDateTime(metaLast!.lastVerifiedAt)}` : "Aucune fiche publiée pour l'instant",
      cta: "Consulter la méta",
    },
    {
      href: "/tournois",
      title: "Tournois cashprize",
      text: "Les tournois FACEIT et CheckMate Gaming repérés par l'équipe. L'inscription se fait sur la plateforme officielle.",
      meta: tournamentCount ? `${tournamentCount} tournoi${tournamentCount > 1 ? "s" : ""} à venir ou en cours` : "Aucun tournoi à venir publié",
      cta: "Voir les tournois",
    },
    {
      href: "/ressources",
      title: "Ressources MK.S",
      text: "Overlays, logos, fonds d'écran et charte graphique de l'équipe, réservés aux membres.",
      meta: "Accès membres",
      cta: "Ouvrir la bibliothèque",
      locked: true,
    },
    {
      href: "/stats",
      title: "Statistiques hebdomadaires",
      text: "Déclarez votre capture de statistiques chaque semaine et suivez votre progression semaine après semaine.",
      meta: "Accès membres",
      cta: "Voir mes statistiques",
      locked: true,
    },
  ];

  return (
    <div className="space-y-16">
      <Flash ok={sp.ok} />
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface px-6 py-14 sm:px-12 sm:py-20">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent">Équipe esport · Call of Duty</p>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">
          MK<span className="text-accent">.</span>S
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Le quartier général de l&apos;équipe : méta à jour, tournois à jouer, ressources officielles et suivi de vos performances.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/stats" className="btn-primary px-6 py-3 text-base">Voir mes statistiques</Link>
          <Link href="/tournois" className="btn-secondary px-6 py-3 text-base">Trouver un tournoi</Link>
          {!user && <Link href="/connexion" className="btn-ghost px-6 py-3 text-base">Connexion membre</Link>}
        </div>
      </section>

      <section aria-labelledby="sections-title">
        <h2 id="sections-title" className="mb-6 text-2xl font-bold">Sections</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <Link key={f.href} href={f.href} className="card group flex flex-col p-6 transition-colors hover:border-accent/60">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-bold group-hover:text-accent">{f.title}</h3>
                {f.locked && !user && <span className="text-xs text-muted">🔒 Membres</span>}
              </div>
              <p className="mt-2 flex-1 text-sm text-muted">{f.text}</p>
              <p className="mt-4 text-xs text-muted/80">{f.meta}</p>
              <span className="mt-4 text-sm font-semibold text-accent">{f.cta} →</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
