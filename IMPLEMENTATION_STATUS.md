# État d'implémentation — MK.S

Dernière mise à jour : 16 octobre 2026.

Contexte : le dépôt `LV9-OPS/MK.S` était **vide** (aucun commit). La plateforme a été construite de zéro ;
il n'existait ni code, ni charte graphique, ni base à préserver.

Statuts : `NOT_STARTED` · `IN_PROGRESS` · `IMPLEMENTED` · `TESTED` · `BLOCKED_EXTERNAL_DEPENDENCY`

« Unit » = Vitest sur les services (base SQLite réelle, migrations rejouées). « E2E » = Playwright Chromium
sur le build de production (`next start`), base et stockage jetables.

## Fonctionnalités

| Fonctionnalité | Fichiers principaux | Statut | Tests | Dépendances / remarques |
| --- | --- | --- | --- | --- |
| Authentification (connexion, sessions, déconnexion, changement de mot de passe) | `src/server/auth.ts`, `src/lib/session.ts`, `src/lib/password.ts`, `src/app/connexion`, `src/app/compte` | TESTED | Unit : bon/mauvais mot de passe, message générique, limitation (8 essais / 15 min), session expirée, compte désactivé, révocation. E2E : identifiants invalides, redirection `?suite=` après connexion | Limiteur en mémoire (une instance) |
| Garde d'accès HTTP (307 vers /connexion, /acces-refuse pour non-admin) | `src/middleware.ts` | TESTED | E2E : `/admin`, `/ressources`, `/stats` anonymes → 307 ; joueur sur `/admin` → `/acces-refuse` | Défense en profondeur : chaque page, action, route et service revérifie aussi |
| Gestion des membres (création, rôle, désactivation, réinitialisation) | `src/server/users.ts`, `src/app/admin/membres` | TESTED | Unit : réservé admin, doublon e-mail, mot de passe court, pas d'auto-rétrogradation, dernier admin protégé, sessions révoquées. E2E : création de 2 membres, erreur affichée avec saisie conservée | — |
| Navigation, en-tête, menu mobile, pages 403/404/erreur | `src/components/site-header.tsx`, `nav.tsx`, `src/app/not-found.tsx`, `error.tsx` | TESTED | E2E : tous les liens de l'accueil < 400, aucun `#`, aucune erreur console ; menu mobile ; aucun débordement horizontal à 375 px sur 5 pages | — |
| Bibliothèque de ressources privée (catégories, recherche, tri, aperçu, téléchargement) | `src/server/resources.ts`, `src/app/ressources`, `src/app/api/ressources/[id]/{fichier,apercu}` | TESTED | Unit : refus anonyme, publication, niveau ADMINS, recherche/filtre/tri. E2E : aperçu réel (image 1×1 chargée), téléchargement octet pour octet identique, ressource ADMINS refusée (404), URL copiée sans session → 401 | — |
| Administration des ressources (envoi, remplacement, aperçu, publication, suppression, échecs) | `src/app/admin/ressources`, `src/lib/files.ts`, `src/lib/storage.ts` | TESTED | Unit : SVG refusé, extension ≠ contenu refusée, aperçu non-image refusé, échecs journalisés, remplacement supprime l'ancien fichier, suppression nettoie le disque. E2E : envoi PNG + PDF, faux PNG refusé et visible dans « Échecs d'envoi » | 100 Mo max par fichier |
| Statistiques hebdomadaires (déclaration joueur, historique, semaines manquantes, comparaison, plein écran) | `src/server/stats.ts`, `src/app/stats`, `src/components/stats-timeline.tsx`, `src/lib/weeks.ts` | TESTED | Unit : semaine ISO dans le fuseau de l'équipe (dimanche, changement d'année, heure d'hiver), doublon refusé, semaine future refusée, cohérence victoires ≤ parties, rien d'inventé (K/D calculé signalé), historique avec trous, comparaison sans précédent. E2E : 2 déclarations, doublon → lien vers l'existante, « 1 manquante », écarts +80 / K/D « (calculé) », navigation semaine précédente, plein écran | Aucune API officielle CoD : captures + saisie manuelle |
| Isolation des données joueur | `src/server/stats.ts`, `src/app/api/stats/[id]/capture` | TESTED | Unit : un autre joueur ne peut ni lire, ni voir la capture, ni modifier, ni supprimer. E2E : capture d'un autre joueur → 404, page de modification → 404 | — |
| Administration des statistiques (saisie pour un joueur, correction, vérification) | `src/app/admin/stats`, `src/components/review-form.tsx` | TESTED | Unit : saisie admin tracée, déclaration vérifiée non modifiable par le joueur, correction admin, correction joueur → repasse en attente. E2E : vérification admin puis statut et note visibles côté joueur, bouton Modifier retiré | — |
| Méta : consultation (recherche, filtres catégorie/jeu/mode, fiches, configurations, source, date) | `src/server/meta.ts`, `src/app/meta` | TESTED | Unit : brouillons masqués au public, filtres, slugs uniques, « À VÉRIFIER » après 21 j. E2E : recherche vide, filtre, fiche avec badge EN HAUSSE, lien source, date, accessoires | — |
| Méta : administration manuelle (armes, accessoires, statut, source, publication, revérification) | `src/app/admin/meta` | TESTED | Unit : réservé admin, source HTTPS obligatoire, date future refusée, journal du changement de statut, configurations (JSON validé). E2E : création + configuration de 2 accessoires | — |
| Méta : synchronisation WZStats | — | BLOCKED_EXTERNAL_DEPENDENCY | — | Aucune API publique documentée ni conditions autorisant l'extraction trouvées (wzstats.gg ; robots.txt restreint certaines pages). Repli manuel complet en place ; chaque fiche cite sa page WZStats |
| Tournois : annuaire (recherche, plateforme, solo/équipe, devise + montant, dates, jeu, format, statut, tri) | `src/server/tournaments.ts`, `src/app/tournois` | TESTED | Unit : chaque filtre, filtre de montant ignoré sans devise, tri groupé par devise (inconnus en dernier), terminés masqués par défaut. E2E : filtres CMG / équipe + EUR ≥ 100, avertissement devise, détail avec « Non communiqué » géré | — |
| Tournois : bouton « Participer » | `src/app/tournois/[id]/participer/route.ts`, `src/lib/urls.ts` | TESTED | Unit : HTTPS + hôte autorisé seulement (faceit.com, checkmategaming.com + `EXTRA_TOURNAMENT_HOSTS`), lien revérifié à chaque clic, brouillon/archive bloqués. E2E : 302 vers `https://www.faceit.com/fr/championship/e2e-test` | — |
| Tournois : administration manuelle (ajout, édition, publication, archivage, suppression) | `src/app/admin/tournois` | TESTED | Unit : réservé admin, lien non autorisé / incohérent avec la plateforme refusé, montant sans devise refusé. E2E : lien `evil.example` refusé avec saisie conservée, puis création | Saisie manuelle et date de vérification affichées publiquement |
| Tournois : import FACEIT (API Data v4) | `src/server/faceit.ts` | BLOCKED_EXTERNAL_DEPENDENCY (code IMPLEMENTED + testé hors ligne) | Unit (fetch simulé) : en-tête `Bearer`, 401/403, 429, 5xx, JSON invalide, format inattendu, délai réseau, éléments invalides ignorés, import en brouillon, mise à jour, 1 synchro / 5 min, points FACEIT jamais convertis en cashprize | **Aucun appel réel effectué** : il faut `FACEIT_API_KEY` (developers.faceit.com) et `FACEIT_GAME_ID` (via `GET /games`). Non vérifié : présence de tournois Call of Duty sur FACEIT |
| Tournois : CheckMate Gaming | — | BLOCKED_EXTERNAL_DEPENDENCY | — | Aucune API publique trouvée ; saisie manuelle |
| Journal d'administration | `src/lib/audit.ts`, `src/app/admin/journal` | TESTED | E2E : user.create, resource.create, resource.upload_failed, meta.create, tournament.create, stat.review présents | — |

## Sécurité — contrôles effectués

- Autorisation vérifiée côté serveur dans chaque service (`assertUser` / `assertAdmin`), indépendamment de l'UI ; tests unitaires d'autorisation pour chaque domaine.
- Fichiers privés : clés aléatoires, chemin validé (pas de traversée), servis avec `Cache-Control: private, no-store`, `nosniff`, CSP `sandbox`, `attachment` hors images ; « inexistant » et « non autorisé » répondent pareil (404) pour ne pas révéler l'existence.
- Envois : type réel détecté par signature, extension cohérente, taille bornée, SVG refusé, nom d'origine assaini.
- Redirections : `?suite=` limité aux chemins internes (`//evil`, `/\evil` refusés) ; liens externes en HTTPS vers hôtes autorisés, revérifiés au clic.
- Mots de passe scrypt, comparaison à temps constant, temps de réponse égalisé pour un e-mail inconnu, message d'erreur générique, limitation des tentatives.
- Formulaires en `method="post"` et boutons désactivés avant hydratation : un envoi natif ne peut jamais placer des champs (mots de passe) dans l'URL.
- Aucun secret dans le dépôt (`.env` ignoré ; `.env.example` sans vraie valeur). Clé FACEIT uniquement côté serveur.
- En-têtes globaux : `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `poweredByHeader` désactivé.

## Problèmes rencontrés et corrigés pendant la vérification

1. **Redirections HTTP** : avec le `loading.tsx` racine, `redirect()` dans une page renvoyait un statut 200 (redirection côté client, sans fuite de données). → Middleware Node renvoyant de vrais 307 ; `loading.tsx` racine supprimé.
2. **Hydratation retardée** : la frontière Suspense de `loading.tsx` retardait l'hydratation du contenu principal (React 19 regroupe les révélations via `requestAnimationFrame`). Avant hydratation, un clic sur « Créer » faisait un envoi natif en GET. → `loading.tsx` racine supprimé, formulaires en POST, boutons d'envoi désactivés jusqu'à l'hydratation.
3. **Formulaires bloqués en « Envoi… » / données périmées** après une action redirigée (file de `useActionState`, réponses 303 non appliquées). → `ActionForm` appelle l'action directement ; en cas de succès l'action renvoie `redirectTo` (URL unique) et le formulaire fait une navigation complète. 20/20 exécutions consécutives réussies sur le scénario qui échouait.
4. **Identifiants de champs dupliqués** (`id="name"` dans deux formulaires d'une même page). → identifiants uniques via `useId()` (corrige aussi l'association libellé ↔ champ pour les lecteurs d'écran).

## Résultats des vérifications (16/10/2026)

| Vérification | Commande | Résultat |
| --- | --- | --- |
| Types | `npm run typecheck` | OK, 0 erreur |
| Lint | `npm run lint` | OK, 0 erreur, 0 avertissement |
| Migrations | rejouées sur base vide par `npm test` et `npm run test:e2e` | OK |
| Unitaires / intégration | `npm test` | 46/46 réussis (5 fichiers) |
| Build production | `npm run build` | OK (35 routes) |
| Bout en bout | `npm run test:e2e` | 19/19 réussis, 3 exécutions consécutives |
| Revue visuelle | captures Playwright 1280 px et 375 px (accueil, méta, fiche, tournois, stats, ressources, admin) | Mise en page correcte, aucun débordement |

## Limites connues / reste à faire

- Intégration FACEIT réelle non testée (clé requise). WZStats et CheckMate Gaming : pas d'API → manuel.
- Aucune OCR des captures (non demandée comme obligatoire ; la saisie manuelle reste la source).
- Limiteur de connexion en mémoire et stockage disque local : adaptés à une instance unique.
- Pas de récupération de mot de passe par e-mail (aucun service d'envoi configuré) : réinitialisation par un administrateur.
- Visuels d'armes : aucun visuel sous licence fourni ; l'upload est prêt mais les cartes affichent la catégorie à défaut.
