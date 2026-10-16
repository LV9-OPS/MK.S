// Valeurs autorisées pour les champs « énumérés » + libellés français.

export const ROLES = ["PLAYER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = { PLAYER: "Joueur", ADMIN: "Administrateur" };

export const WEAPON_CATEGORIES = [
  "ASSAULT_RIFLE", "SMG", "LMG", "BATTLE_RIFLE", "MARKSMAN", "SNIPER", "SHOTGUN", "PISTOL", "LAUNCHER", "MELEE",
] as const;
export type WeaponCategory = (typeof WEAPON_CATEGORIES)[number];
export const WEAPON_CATEGORY_LABELS: Record<WeaponCategory, string> = {
  ASSAULT_RIFLE: "Fusil d'assaut",
  SMG: "Mitraillette",
  LMG: "Mitrailleuse légère",
  BATTLE_RIFLE: "Fusil tactique",
  MARKSMAN: "Fusil de précision (DMR)",
  SNIPER: "Fusil de sniper",
  SHOTGUN: "Fusil à pompe",
  PISTOL: "Pistolet",
  LAUNCHER: "Lanceur",
  MELEE: "Corps à corps",
};

export const META_TIERS = ["S", "A", "B", "C"] as const;
export type MetaTier = (typeof META_TIERS)[number];

export const META_TRENDS = ["CURRENT_META", "RISING", "FALLING", "NEW", "TO_VERIFY"] as const;
export type MetaTrend = (typeof META_TRENDS)[number];
export const META_TREND_LABELS: Record<MetaTrend, string> = {
  CURRENT_META: "META ACTUELLE",
  RISING: "EN HAUSSE",
  FALLING: "EN BAISSE",
  NEW: "NOUVEAU",
  TO_VERIFY: "À VÉRIFIER",
};
/** Au-delà de ce délai sans vérification, une fiche méta est affichée « À VÉRIFIER ». */
export const META_STALE_DAYS = 21;

export const TOURNAMENT_PLATFORMS = ["FACEIT", "CMG", "OTHER"] as const;
export type TournamentPlatform = (typeof TOURNAMENT_PLATFORMS)[number];
export const TOURNAMENT_PLATFORM_LABELS: Record<TournamentPlatform, string> = {
  FACEIT: "FACEIT",
  CMG: "CheckMate Gaming",
  OTHER: "Autre",
};

export const PARTICIPANT_TYPES = ["SOLO", "TEAM", "UNKNOWN"] as const;
export type ParticipantType = (typeof PARTICIPANT_TYPES)[number];
export const PARTICIPANT_TYPE_LABELS: Record<ParticipantType, string> = {
  SOLO: "Solo",
  TEAM: "Équipe",
  UNKNOWN: "Non communiqué",
};

export const TOURNAMENT_STATUSES = [
  "UPCOMING", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "ONGOING", "COMPLETED", "UNKNOWN",
] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];
export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  UPCOMING: "À venir",
  REGISTRATION_OPEN: "Inscriptions ouvertes",
  REGISTRATION_CLOSED: "Inscriptions closes",
  ONGOING: "En cours",
  COMPLETED: "Terminé",
  UNKNOWN: "Statut non communiqué",
};

export const DATA_SOURCES = ["MANUAL", "FACEIT_API"] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export const CURRENCIES = ["EUR", "USD", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const RESOURCE_CATEGORIES = [
  "STREAM_OVERLAYS", "LOGOS", "WALLPAPERS", "BRANDING", "SOCIAL_MEDIA", "OTHER",
] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];
export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  STREAM_OVERLAYS: "Overlays de stream",
  LOGOS: "Logos officiels",
  WALLPAPERS: "Fonds d'écran",
  BRANDING: "Charte graphique",
  SOCIAL_MEDIA: "Réseaux sociaux",
  OTHER: "Autres ressources",
};

export const RESOURCE_ACCESS = ["MEMBERS", "ADMINS"] as const;
export type ResourceAccess = (typeof RESOURCE_ACCESS)[number];
export const RESOURCE_ACCESS_LABELS: Record<ResourceAccess, string> = {
  MEMBERS: "Tous les membres",
  ADMINS: "Administrateurs uniquement",
};

export const VERIFICATION_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  PENDING: "En attente de vérification",
  VERIFIED: "Vérifiée",
  REJECTED: "Refusée",
};

/** Jeux/modes proposés dans les formulaires de statistiques. */
export const STAT_GAMES = ["Warzone", "Black Ops 7", "Black Ops 6"] as const;
export const STAT_MODES = ["Battle Royale", "Résurgence", "Classé", "Multijoueur", "Autre"] as const;

export const STAT_METRICS = [
  { key: "matchesPlayed", label: "Parties jouées", decimals: 0 },
  { key: "wins", label: "Victoires", decimals: 0 },
  { key: "kills", label: "Éliminations", decimals: 0 },
  { key: "deaths", label: "Morts", decimals: 0 },
  { key: "kdRatio", label: "Ratio K/D", decimals: 2 },
] as const;
export type StatMetricKey = (typeof STAT_METRICS)[number]["key"];
