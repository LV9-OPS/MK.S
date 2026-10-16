"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type NavItem = { href: string; label: string; locked?: boolean };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <ul className="hidden items-center gap-1 lg:flex">
      {items.map((i) => (
        <li key={i.href}>
          <Link
            href={i.href}
            aria-current={isActive(pathname, i.href) ? "page" : undefined}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text aria-[current=page]:bg-surface-2 aria-[current=page]:text-text"
          >
            {i.label}
            {i.locked && <span className="ml-1 text-xs" aria-label="(connexion requise)">🔒</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function MobileNav({ items, footer }: { items: NavItem[]; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="btn-ghost px-3"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden className="text-xl leading-none">{open ? "✕" : "☰"}</span>
      </button>
      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full z-40 border-b border-border bg-surface px-4 pb-4 shadow-2xl">
          <ul className="flex flex-col py-2">
            {items.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  aria-current={isActive(pathname, i.href) ? "page" : undefined}
                  className="block rounded-md px-3 py-3 text-base text-muted hover:bg-surface-2 hover:text-text aria-[current=page]:text-accent"
                >
                  {i.label}
                  {i.locked && <span className="ml-1 text-xs" aria-label="(connexion requise)">🔒</span>}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-border pt-3">{footer}</div>
        </div>
      )}
    </div>
  );
}
