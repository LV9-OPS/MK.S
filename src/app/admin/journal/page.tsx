import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Journal" };
export const dynamic = "force-dynamic";

const PAGE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdminPage("/admin/journal");
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const prefix = sp.type && /^[a-z]+$/.test(sp.type) ? sp.type : undefined;
  const where = prefix ? { action: { startsWith: `${prefix}.` } } : {};
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { actor: { select: { displayName: true } } } }),
    prisma.auditLog.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const types = ["auth", "user", "meta", "tournament", "resource", "stat"];
  const href = (p: number, t = prefix) => `/admin/journal?${new URLSearchParams({ ...(t ? { type: t } : {}), page: String(p) })}`;

  return (
    <div>
      <PageHeader title="Journal d'administration" subtitle={`${total} évènement(s) enregistrés : connexions, créations, modifications, suppressions, synchronisations et échecs d'envoi.`} />
      <nav aria-label="Type d'évènement" className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/journal" aria-current={!prefix ? "true" : undefined} className="btn-ghost btn-sm aria-[current=true]:text-accent">Tous</Link>
        {types.map((t) => (
          <Link key={t} href={href(1, t)} aria-current={prefix === t ? "true" : undefined} className="btn-ghost btn-sm aria-[current=true]:text-accent">{t}</Link>
        ))}
      </nav>
      {logs.length === 0 ? (
        <EmptyState title="Aucun évènement" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th scope="col" className="p-3 font-medium">Date</th>
                <th scope="col" className="p-3 font-medium">Auteur</th>
                <th scope="col" className="p-3 font-medium">Action</th>
                <th scope="col" className="p-3 font-medium">Élément</th>
                <th scope="col" className="p-3 font-medium">Détails</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border/60 align-top">
                  <td className="whitespace-nowrap p-3 text-muted">{formatDateTime(l.createdAt)}</td>
                  <td className="p-3">{l.actor?.displayName ?? "—"}</td>
                  <td className="p-3"><code className="text-xs">{l.action}</code></td>
                  <td className="p-3 text-xs text-muted">{l.entityType}{l.entityId ? ` · ${l.entityId}` : ""}</td>
                  <td className="max-w-md break-words p-3 text-xs text-muted"><code>{l.details ?? ""}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-center gap-2">
          {page > 1 ? <Link href={href(page - 1)} className="btn-secondary btn-sm">← Précédent</Link> : <span className="btn-secondary btn-sm opacity-40" aria-disabled>← Précédent</span>}
          <span className="text-sm text-muted">Page {page} / {pages}</span>
          {page < pages ? <Link href={href(page + 1)} className="btn-secondary btn-sm">Suivant →</Link> : <span className="btn-secondary btn-sm opacity-40" aria-disabled>Suivant →</span>}
        </nav>
      )}
    </div>
  );
}
