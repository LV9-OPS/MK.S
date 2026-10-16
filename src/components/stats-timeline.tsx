import Link from "next/link";
import { compareStats, canPlayerEdit, previousFilled, type getTimeline } from "@/server/stats";
import { deleteStatAction } from "@/app/actions/stats";
import { VERIFICATION_STATUS_LABELS, type VerificationStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { weekLabel, weekShortLabel } from "@/lib/weeks";
import { Badge, EmptyState } from "./ui";
import { Lightbox } from "./lightbox";
import { ActionForm, ConfirmSubmit } from "./forms";
import { ReviewForm } from "./review-form";

type Timeline = Awaited<ReturnType<typeof getTimeline>>;

const VERIF_TONE: Record<VerificationStatus, "warning" | "success" | "danger"> = { PENDING: "warning", VERIFIED: "success", REJECTED: "danger" };

function fmt(v: number | null, decimals: number) {
  if (v == null) return "—";
  return v.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function Delta({ value, decimals, inverse }: { value: number | null; decimals: number; inverse?: boolean }) {
  if (value == null) return <span className="text-muted">—</span>;
  if (value === 0) return <span className="text-muted">=</span>;
  const good = inverse ? value < 0 : value > 0;
  return (
    <span className={good ? "text-success" : "text-danger"}>
      {value > 0 ? "+" : ""}{fmt(value, decimals)}
    </span>
  );
}

export function StatsTimeline({
  timeline, selectedWeek, basePath, isOwner, isAdmin,
}: {
  timeline: Timeline;
  selectedWeek?: string;
  basePath: string;
  isOwner: boolean;
  isAdmin: boolean;
}) {
  const { slots, combos, selected } = timeline;
  if (!selected || slots.length === 0) {
    return (
      <EmptyState
        title="Aucune semaine déclarée"
        action={isOwner ? <Link href="/stats/declarer" className="btn-primary">Déclarer ma première semaine</Link> : isAdmin ? <Link href="/admin/stats/nouveau" className="btn-primary">Ajouter une semaine pour ce joueur</Link> : undefined}
      >
        L&apos;historique se construit semaine après semaine à partir des captures d&apos;écran de statistiques.
      </EmptyState>
    );
  }
  const q = (patch: Record<string, string>) =>
    `${basePath}?${new URLSearchParams({ jeu: selected.game, mode: selected.mode, ...patch }).toString()}`;

  const filledIdx = slots.map((s, i) => (s.stat ? i : -1)).filter((i) => i >= 0);
  let index = selectedWeek ? slots.findIndex((s) => s.weekStart === selectedWeek) : -1;
  if (index < 0) index = filledIdx[filledIdx.length - 1];
  const slot = slots[index];
  const prevSlot = index > 0 ? slots[index - 1] : null;
  const nextSlot = index < slots.length - 1 ? slots[index + 1] : null;
  const compareWith = previousFilled(slots, index);
  const comparison = slot.stat ? compareStats(slot.stat, compareWith?.stat ?? null) : [];
  const filled = slots.filter((s) => s.stat);
  const missingCount = slots.length - filled.length;

  return (
    <div className="space-y-6">
      {combos.length > 1 && (
        <nav aria-label="Jeu et mode" className="flex flex-wrap gap-2">
          {combos.map((c) => {
            const active = c.game === selected.game && c.mode === selected.mode;
            return (
              <Link key={`${c.game}-${c.mode}`} href={`${basePath}?${new URLSearchParams({ jeu: c.game, mode: c.mode })}`} aria-current={active ? "true" : undefined}
                className={`rounded-full border px-3 py-1.5 text-sm ${active ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-text"}`}>
                {c.game} · {c.mode} <span className="text-xs">({c.count})</span>
              </Link>
            );
          })}
        </nav>
      )}
      <p className="text-sm text-muted">
        {selected.game} · {selected.mode} — {filled.length} semaine{filled.length > 1 ? "s" : ""} déclarée{filled.length > 1 ? "s" : ""}
        {missingCount > 0 && <>, <span className="text-warning">{missingCount} manquante{missingCount > 1 ? "s" : ""}</span></>}. Les comparaisons ne portent que sur ce jeu et ce mode.
      </p>

      <nav aria-label="Semaines" className="overflow-x-auto pb-2">
        <ol className="flex min-w-max gap-2">
          {slots.map((s) => {
            const active = s.weekStart === slot.weekStart;
            const st = s.stat?.verificationStatus as VerificationStatus | undefined;
            return (
              <li key={s.weekStart}>
                <Link href={q({ semaine: s.weekStart })} aria-current={active ? "true" : undefined} title={weekLabel(s.weekStart)}
                  className={`flex w-24 flex-col items-center rounded-lg border px-2 py-2 text-xs ${active ? "border-accent bg-accent-soft" : s.stat ? "border-border bg-surface hover:border-muted" : "border-dashed border-border text-muted hover:border-muted"}`}>
                  <span className="font-semibold">{weekShortLabel(s.weekStart)}</span>
                  <span className={`mt-1 ${st === "VERIFIED" ? "text-success" : st === "REJECTED" ? "text-danger" : st === "PENDING" ? "text-warning" : "text-muted"}`}>
                    {s.stat ? (st === "VERIFIED" ? "✓ vérifiée" : st === "REJECTED" ? "✕ refusée" : "● en attente") : "manquante"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      <section className="card p-5 sm:p-6" aria-labelledby="week-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="week-title" className="text-xl font-bold">{weekLabel(slot.weekStart)}</h2>
          <div className="flex gap-2">
            {prevSlot ? <Link href={q({ semaine: prevSlot.weekStart })} className="btn-secondary btn-sm" aria-label="Semaine précédente">← Précédente</Link> : <span className="btn-secondary btn-sm opacity-40" aria-disabled>← Précédente</span>}
            {nextSlot ? <Link href={q({ semaine: nextSlot.weekStart })} className="btn-secondary btn-sm" aria-label="Semaine suivante">Suivante →</Link> : <span className="btn-secondary btn-sm opacity-40" aria-disabled>Suivante →</span>}
          </div>
        </div>

        {!slot.stat ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="font-semibold">Semaine manquante</p>
            <p className="mt-1 text-sm text-muted">Aucune capture n&apos;a été déclarée pour cette semaine en {selected.game} · {selected.mode}.</p>
            {isOwner && (
              <Link href={`/stats/declarer?${new URLSearchParams({ semaine: slot.weekStart, jeu: selected.game, mode: selected.mode })}`} className="btn-primary mt-4">
                Déclarer cette semaine
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div>
              <Lightbox src={`/api/stats/${slot.stat.id}/capture`} alt={`Capture des statistiques — ${weekLabel(slot.weekStart)}`} thumbClassName="max-h-[28rem] w-full rounded-lg border border-border bg-surface-2 object-contain" />
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={VERIF_TONE[slot.stat.verificationStatus as VerificationStatus]}>{VERIFICATION_STATUS_LABELS[slot.stat.verificationStatus as VerificationStatus]}</Badge>
                <span className="text-xs text-muted">Déclarée le {formatDateTime(slot.stat.submittedAt)}</span>
              </div>
              {slot.stat.reviewedAt && (
                <p className="text-xs text-muted">
                  Revue par {slot.stat.reviewedBy?.displayName ?? "un administrateur"} le {formatDateTime(slot.stat.reviewedAt)}
                  {slot.stat.reviewNote && <> — « {slot.stat.reviewNote} »</>}
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="mb-2 text-left text-xs text-muted">
                    {compareWith ? <>Comparaison avec {weekLabel(compareWith.weekStart)}</> : "Première semaine déclarée : pas de comparaison."}
                  </caption>
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                      <th scope="col" className="py-2 pr-2 font-medium">Mesure</th>
                      <th scope="col" className="py-2 pr-2 text-right font-medium">Cette semaine</th>
                      <th scope="col" className="py-2 pr-2 text-right font-medium">Précédente</th>
                      <th scope="col" className="py-2 text-right font-medium">Écart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((c) => (
                      <tr key={c.key} className="border-b border-border/60">
                        <th scope="row" className="py-2 pr-2 text-left font-normal">
                          {c.label}{c.computed && <span className="ml-1 text-xs text-muted" title="Calculé à partir des éliminations et des morts déclarées">(calculé)</span>}
                        </th>
                        <td className="py-2 pr-2 text-right font-semibold">{fmt(c.current, c.decimals)}</td>
                        <td className="py-2 pr-2 text-right text-muted">{fmt(c.previous, c.decimals)}</td>
                        <td className="py-2 text-right"><Delta value={c.delta} decimals={c.decimals} inverse={c.key === "deaths"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {comparison.every((c) => c.current == null) && (
                <p className="text-xs text-muted">Aucune valeur saisie pour cette semaine : seule la capture fait foi.</p>
              )}
              {slot.stat.notes && <p className="whitespace-pre-line rounded-lg bg-surface-2 p-3 text-sm">{slot.stat.notes}</p>}
              <div className="flex flex-wrap gap-2">
                {(isAdmin || (isOwner && canPlayerEdit(slot.stat))) && (
                  <Link href={`/stats/${slot.stat.id}/modifier`} className="btn-secondary btn-sm">{isAdmin && !isOwner ? "Corriger" : "Modifier"}</Link>
                )}
                {(isAdmin || (isOwner && canPlayerEdit(slot.stat))) && (
                  <ActionForm action={deleteStatAction.bind(null, slot.stat.id, q({}))}>
                    <ConfirmSubmit title="Supprimer cette déclaration ?" message={`La capture et les valeurs de la ${weekLabel(slot.weekStart)} seront définitivement supprimées.`} confirmLabel="Supprimer">
                      Supprimer
                    </ConfirmSubmit>
                  </ActionForm>
                )}
              </div>
              {isAdmin && <ReviewForm statId={slot.stat.id} current={slot.stat.verificationStatus} note={slot.stat.reviewNote} returnTo={q({ semaine: slot.weekStart })} />}
            </div>
          </div>
        )}
      </section>

      {filled.length > 1 && (
        <section className="card overflow-x-auto p-5" aria-labelledby="history-title">
          <h2 id="history-title" className="mb-3 text-lg font-bold">Évolution</h2>
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th scope="col" className="py-2 font-medium">Semaine</th>
                <th scope="col" className="py-2 text-right font-medium">Parties</th>
                <th scope="col" className="py-2 text-right font-medium">Victoires</th>
                <th scope="col" className="py-2 text-right font-medium">Élim.</th>
                <th scope="col" className="py-2 text-right font-medium">Morts</th>
                <th scope="col" className="py-2 text-right font-medium">K/D</th>
                <th scope="col" className="py-2 text-right font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {[...slots].reverse().map((s) => {
                const kd = s.stat ? compareStats(s.stat, null).find((c) => c.key === "kdRatio")! : null;
                return (
                  <tr key={s.weekStart} className={`border-b border-border/60 ${s.weekStart === slot.weekStart ? "bg-accent-soft" : ""}`}>
                    <th scope="row" className="py-2 text-left font-normal"><Link href={q({ semaine: s.weekStart })} className="hover:text-accent">{weekShortLabel(s.weekStart)}</Link></th>
                    {s.stat ? (
                      <>
                        <td className="py-2 text-right">{fmt(s.stat.matchesPlayed, 0)}</td>
                        <td className="py-2 text-right">{fmt(s.stat.wins, 0)}</td>
                        <td className="py-2 text-right">{fmt(s.stat.kills, 0)}</td>
                        <td className="py-2 text-right">{fmt(s.stat.deaths, 0)}</td>
                        <td className="py-2 text-right">{fmt(kd!.current, 2)}{kd!.computed && <span className="text-xs text-muted">*</span>}</td>
                        <td className="py-2 text-right text-xs">{VERIFICATION_STATUS_LABELS[s.stat.verificationStatus as VerificationStatus]}</td>
                      </>
                    ) : (
                      <td colSpan={6} className="py-2 text-right text-xs text-warning">Semaine manquante</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">* K/D calculé à partir des éliminations et des morts déclarées.</p>
        </section>
      )}
    </div>
  );
}
