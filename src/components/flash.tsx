import { DismissibleNotice } from "./forms";

// Messages de succès affichés après une redirection ; seules ces clés connues sont acceptées
// (aucun texte libre venant de l'URL n'est affiché).
const MESSAGES: Record<string, string> = {
  login: "Connexion réussie.",
  logout: "Vous êtes déconnecté.",
  password: "Mot de passe modifié. Reconnectez-vous avec le nouveau mot de passe.",
  "stat-created": "Déclaration enregistrée. Elle apparaît dans votre historique.",
  "stat-updated": "Déclaration mise à jour.",
  "stat-deleted": "Déclaration supprimée.",
  "resource-created": "Ressource enregistrée.",
  "resource-updated": "Ressource mise à jour.",
  "resource-deleted": "Ressource supprimée.",
  "meta-created": "Fiche méta créée.",
  "meta-updated": "Fiche méta mise à jour.",
  "meta-deleted": "Fiche méta supprimée.",
  "tournament-created": "Tournoi enregistré.",
  "tournament-updated": "Tournoi mis à jour.",
  "tournament-deleted": "Tournoi supprimé.",
  "user-created": "Membre créé.",
  "user-updated": "Membre mis à jour.",
  "password-reset": "Mot de passe réinitialisé. Les sessions du membre ont été fermées ; communiquez-lui le nouveau mot de passe par un canal sûr.",
  "meta-published": "Fiche publiée.",
  "meta-unpublished": "Fiche retirée de la publication.",
  "meta-verified": "Date de vérification mise à jour.",
  "loadout-created": "Configuration ajoutée.",
  "loadout-updated": "Configuration mise à jour.",
  "loadout-deleted": "Configuration supprimée.",
  "resource-published": "Ressource publiée.",
  "resource-unpublished": "Ressource dépubliée.",
  "stat-reviewed": "Vérification enregistrée.",
};

export function Flash({ ok }: { ok?: string | string[] }) {
  const key = Array.isArray(ok) ? ok[0] : ok;
  const msg = key ? MESSAGES[key] : undefined;
  return msg ? <DismissibleNotice key={key} message={msg} /> : null;
}
