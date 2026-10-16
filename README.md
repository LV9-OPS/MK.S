# MK.S — plateforme esport Call of Duty

Application web de l'équipe MK.S : méta Call of Duty sourcée et datée, annuaire de tournois cashprize
(FACEIT, CheckMate Gaming), bibliothèque privée de ressources et suivi des statistiques hebdomadaires
par captures d'écran.

## Pile technique

- **Next.js 15.5** (App Router, server actions, middleware Node) + **React 19** + **TypeScript** strict
- **Prisma 6** + **SQLite** (fichier local ; voir « PostgreSQL » plus bas)
- **Tailwind CSS 4**
- Authentification maison : mots de passe hachés en **scrypt**, sessions en base (jeton aléatoire, seul
  son SHA-256 est stocké), cookie `httpOnly` / `SameSite=Lax` / `Secure` en production
- Stockage de fichiers **privé sur disque** (`STORAGE_DIR`, hors de `/public`), servi uniquement par des
  routes qui vérifient la session et les droits à chaque requête
- Tests : **Vitest** (services, autorisations, validation) et **Playwright** (parcours réels sur le build de production)

## Démarrage

```bash
npm install
cp .env.example .env        # puis modifiez ADMIN_EMAIL / ADMIN_PASSWORD
npx prisma migrate deploy   # crée prisma/dev.db
npm run db:seed             # crée le premier administrateur depuis .env
npm run dev                 # http://localhost:3000
```

npm 11 bloque les scripts d'installation non approuvés : les paquets nécessaires (Prisma, esbuild,
unrs-resolver) sont déjà approuvés dans `package.json` (`allowScripts`).

Créer / réparer un administrateur à tout moment :

```bash
npm run create-admin -- admin@exemple.fr "Nom affiché" "mot-de-passe-long"
```

Il n'y a **pas d'inscription publique** : les comptes sont créés par un administrateur dans
*Administration → Membres*.

## Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Base Prisma (`file:./dev.db` par défaut, relatif à `prisma/`) |
| `STORAGE_DIR` | Dossier privé des fichiers envoyés (ressources, captures, visuels) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Premier administrateur (`npm run db:seed`) |
| `TEAM_TIMEZONE` | Fuseau des bornes de semaine et des dates affichées (défaut `Europe/Paris`) |
| `FACEIT_API_KEY`, `FACEIT_GAME_ID` | Import facultatif des championnats FACEIT (clé serveur developers.faceit.com) |
| `FACEIT_GAME_LABEL` | Libellé de jeu des tournois importés (défaut « Call of Duty ») |
| `EXTRA_TOURNAMENT_HOSTS` | Hôtes HTTPS supplémentaires autorisés pour « Participer » (virgules) |

## Tests et vérifications

```bash
npm run typecheck
npm run lint
npm test              # Vitest : base SQLite jetable prisma/test.db, migrations rejouées
npm run build
npm run test:e2e      # Playwright : nécessite `npm run build` ; base prisma/e2e.db et storage-e2e/ jetables
```

Première exécution de Playwright : `npx playwright install chromium`.

## Déploiement

1. Serveur Node 20+ avec un **disque persistant** pour `prisma/*.db` et `STORAGE_DIR` (sauvegardez les deux).
2. `npm ci && npx prisma migrate deploy && npm run build`
3. `npm run db:seed` (une fois) puis `npm start` (port 3000) derrière un reverse proxy **HTTPS**
   (le cookie de session est `Secure` en production : le site doit être servi en HTTPS).
4. Une seule instance : la limitation des tentatives de connexion est en mémoire. Pour plusieurs instances,
   passez à PostgreSQL + un stockage partagé (S3 compatible) + un limiteur partagé.

### PostgreSQL

Les champs « énumérés » sont des `String` validées côté serveur, donc le schéma est portable :
changez `provider = "postgresql"` dans `prisma/schema.prisma`, régénérez les migrations
(`npx prisma migrate dev --name init` sur une base vide) et pointez `DATABASE_URL` vers PostgreSQL.

## Sources de données externes

- **WZStats** : aucune API publique documentée trouvée. La méta est saisie et revérifiée manuellement ;
  chaque fiche porte son URL source et sa date de vérification, et passe « À VÉRIFIER » après 21 jours.
- **FACEIT** : intégration serveur de l'API officielle Data v4 (`/championships`), inactive tant que
  `FACEIT_API_KEY` / `FACEIT_GAME_ID` ne sont pas fournis. Les tournois importés arrivent en brouillon.
  Les « prizes » FACEIT sont des points FACEIT, jamais convertis en cashprize.
- **CheckMate Gaming** : aucune API publique trouvée ; saisie manuelle.
- **Statistiques Call of Duty** : aucune API officielle publique d'Activision ; les captures d'écran font foi,
  les valeurs chiffrées sont saisies à la main (jamais extraites ni estimées).

Voir `IMPLEMENTATION_STATUS.md` pour l'état détaillé et les vérifications effectuées.
