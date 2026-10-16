import {
  PARTICIPANT_TYPE_LABELS, TOURNAMENT_PLATFORM_LABELS, TOURNAMENT_STATUS_LABELS,
  type ParticipantType, type TournamentPlatform, type TournamentStatus,
} from "@/lib/constants";
import { Badge } from "./ui";

const STATUS_TONE: Record<TournamentStatus, "success" | "info" | "warning" | "accent" | "neutral"> = {
  REGISTRATION_OPEN: "success",
  UPCOMING: "info",
  REGISTRATION_CLOSED: "warning",
  ONGOING: "accent",
  COMPLETED: "neutral",
  UNKNOWN: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as TournamentStatus;
  return <Badge tone={STATUS_TONE[s] ?? "neutral"}>{TOURNAMENT_STATUS_LABELS[s] ?? status}</Badge>;
}

export function PlatformBadge({ platform }: { platform: string }) {
  return <Badge tone="info">{TOURNAMENT_PLATFORM_LABELS[platform as TournamentPlatform] ?? platform}</Badge>;
}

export function participantLabel(type: string, teamSize: number | null) {
  const base = PARTICIPANT_TYPE_LABELS[type as ParticipantType] ?? type;
  if (type === "TEAM" && teamSize) return `${base} (${teamSize} joueurs)`;
  if (type === "TEAM") return `${base} (taille non communiquée)`;
  return base;
}

export function SourceNote({ dataSource }: { dataSource: string }) {
  return dataSource === "FACEIT_API" ? (
    <span title="Données importées depuis l'API officielle FACEIT">Données API FACEIT</span>
  ) : (
    <span title="Fiche saisie et vérifiée manuellement par un administrateur MK.S">Saisie manuelle</span>
  );
}
