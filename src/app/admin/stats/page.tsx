import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/session";
import { adminListStats } from "@/server/stats";
import { listPlayersForSelect } from "@/server/users";
import { VERIFICATION_STATUSES, VERIFICATION_STATUS_LABELS, type VerificationStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { weekLabel } from "@/lib/weeks";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { Flash } from "@/components/flash";

export const metadata: Metadata = { title: "Statistiques — administration" };
export const dynamic = "force-dynamic";

const TONE: Record<VerificationStatus, "warning" | "success" | "danger"> = { PENDING: "warning", VERIFIED: "success", REJECTED: "danger" };

export default async function AdminStatsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireAdminPage("/admin/stats");
  const sp = await searchParams;
  const [stats, players] = await Promise.all([adminListStats(actor, { playerId: sp.joueur, status: sp.status }), listPlayersForSelect(actor)]);
  return (
    <div>
      <Flash ok={sp.ok} />
      <PageHeader
        title="Statistiques hebdomadaires"
        subtitle="Vérifiez les déclarations, corrigez-les ou ajoutez une semaine pour un joueur. Aucune API officielle Call of Duty n'est utilisée : les captures font foi."
        actions={<Link href="/admin/stats/nouveau" className="btn-primary">Ajouter pour un joueur</Link>}
      />
      <form method="get" className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end" aria-label="Filtrer les déclarations">
        <div className="flex-1">
          <label htmlFor="joueur" className="label">Joueur</label>
          <select id="joueur" name="joueur" defaultValue={sp.joueur ?? ""} className="input">
            <option value="">Tous</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.displayName}{p.gamertag ? ` (${p.gamertag})` : ""}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="status" className="label">Statut</label>
          <select id="status" name="status" defaultValue={sp.status ?? ""} className="input">
            <option value="">Tous</option>
            {VERIFICATION_STATUSES.map((s) => <option key={s} value={s}>{VERIFICATION_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary">Filtrer</button>
      </form>
      {stats.length === 0 ? (
        <EmptyState title="Aucune déclaration">Aucune déclaration ne correspond à ces critères.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th scope="col" className="p-3 font-medium">Joueur</th>
                <th scope="col" className="p-3 font-medium">Semaine</th>
                <th scope="col" className="p-3 font-medium">Jeu · mode</th>
                <th scope="col" className="p-3 font-medium">Statut</th>
                <th scope="col" className="p-3 font-medium">Déclarée</th>
                <th scope="col" className="p-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.id} className="border-b border-border/60">
                  <td className="p-3 font-semibold">{s.player.displayName}</td>
                  <td className="p-3">{weekLabel(s.weekStart)}</td>
                  <td className="p-3 text-muted">{s.game} · {s.mode}</td>
                  <td className="p-3"><Badge tone={TONE[s.verificationStatus as VerificationStatus]}>{VERIFICATION_STATUS_LABELS[s.verificationStatus as VerificationStatus]}</Badge></td>
                  <td className="p-3 text-xs text-muted">{formatDateTime(s.submittedAt)}{s.submittedBy && s.submittedById !== s.playerId ? <><br />par {s.submittedBy.displayName}</> : null}</td>
                  <td className="p-3 text-right">
                    <Link href={`/admin/stats/joueur/${s.playerId}?${new URLSearchParams({ jeu: s.game, mode: s.mode, semaine: s.weekStart })}`} className="btn-secondary btn-sm">Ouvrir</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
