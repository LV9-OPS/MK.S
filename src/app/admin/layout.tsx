import Link from "next/link";
import { requireAdminPage } from "@/lib/session";

const LINKS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/membres", label: "Membres" },
  { href: "/admin/meta", label: "Méta" },
  { href: "/admin/tournois", label: "Tournois" },
  { href: "/admin/ressources", label: "Ressources" },
  { href: "/admin/stats", label: "Statistiques" },
  { href: "/admin/journal", label: "Journal" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Garde de section ; chaque page, action et service revérifie aussi le rôle.
  await requireAdminPage("/admin");
  return (
    <div>
      <nav aria-label="Administration" className="mb-8 overflow-x-auto border-b border-border">
        <ul className="flex min-w-max gap-1 pb-px">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="block border-b-2 border-transparent px-3 py-2 text-sm text-muted hover:border-muted hover:text-text">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
}
