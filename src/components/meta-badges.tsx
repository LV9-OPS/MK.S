import { META_TREND_LABELS, type MetaTrend } from "@/lib/constants";
import { Badge } from "./ui";

const TREND_TONE: Record<MetaTrend, "accent" | "success" | "danger" | "info" | "warning"> = {
  CURRENT_META: "accent",
  RISING: "success",
  FALLING: "danger",
  NEW: "info",
  TO_VERIFY: "warning",
};

export function TrendBadge({ trend, stale }: { trend: MetaTrend; stale?: boolean }) {
  return (
    <Badge tone={TREND_TONE[trend]} title={stale ? "Fiche non revérifiée récemment : informations possiblement obsolètes." : undefined}>
      {trend === "RISING" && <span aria-hidden>▲</span>}
      {trend === "FALLING" && <span aria-hidden>▼</span>}
      {META_TREND_LABELS[trend]}
    </Badge>
  );
}

const TIER_STYLE: Record<string, string> = {
  S: "bg-accent text-black",
  A: "bg-success/20 text-success border border-success/40",
  B: "bg-info/15 text-info border border-info/40",
  C: "bg-surface-2 text-muted border border-border",
};

export function TierBadge({ tier }: { tier: string }) {
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md font-[family-name:var(--font-display)] text-lg font-black ${TIER_STYLE[tier] ?? TIER_STYLE.C}`} aria-label={`Classement ${tier}`}>
      {tier}
    </span>
  );
}
