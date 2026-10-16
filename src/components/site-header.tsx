import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";
import { MobileNav, NavLinks, type NavItem } from "./nav";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const items: NavItem[] = [
    { href: "/", label: "Accueil" },
    { href: "/meta", label: "Méta" },
    { href: "/tournois", label: "Tournois" },
    { href: "/ressources", label: "Ressources", locked: !user },
    { href: "/stats", label: "Mes statistiques", locked: !user },
    ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Administration" }] : []),
  ];

  const account = user ? (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/compte" className="btn-ghost max-w-[12rem] truncate" title="Mon compte">
        <span aria-hidden>👤</span> <span className="truncate">{user.displayName}</span>
      </Link>
      <form action={logoutAction}>
        <button type="submit" className="btn-secondary btn-sm">Déconnexion</button>
      </form>
    </div>
  ) : (
    <Link href="/connexion" className="btn-primary btn-sm">Connexion</Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-black">
        Aller au contenu
      </a>
      <nav aria-label="Navigation principale" className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl font-bold tracking-wider">
          <span className="grid h-8 w-8 place-items-center rounded bg-accent text-sm font-black text-black" aria-hidden>MK</span>
          <span>MK<span className="text-accent">.</span>S</span>
        </Link>
        <NavLinks items={items} />
        <div className="hidden lg:block">{account}</div>
        <MobileNav items={items} footer={account} />
      </nav>
    </header>
  );
}
