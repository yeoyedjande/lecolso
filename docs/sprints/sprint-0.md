# Sprint 0 — socle technique (semaines 1 et 2)

Objectif : un monorepo qui démarre en une commande, une CI verte, l'isolation entre établissements prouvée par des tests,
la connexion et les rôles par cycle en place. Aucun écran métier encore.

Mode d'emploi : lance `claude` à la racine du dépôt, puis donne les étapes **une par une**, dans l'ordre.
Relis le plan proposé, valide, laisse Claude Code coder et tester, relis le diff, puis commit avant de passer à l'étape suivante.

---

## Étape 1 — Initialiser le backend

```text
Lis CLAUDE.md et backend/CLAUDE.md.
Crée le projet Laravel (dernière version stable) dans backend/ : installe-le d'abord dans un dossier temporaire
(le dossier backend/ n'est pas vide) puis déplace son contenu dans backend/ en conservant backend/CLAUDE.md.
Configure PostgreSQL et Redis selon docker-compose.yml, fuseau Africa/Abidjan, locale fr.
Les tests utilisent PostgreSQL (base gestion_ecole_test), jamais SQLite : vérifie phpunit.xml et crée la base de test
dans docker/postgres/init/ avec les mêmes droits pour app_user.
Installe et configure : Sanctum, Horizon, Pest, Larastan (niveau max), Pint, Scramble, spatie/laravel-activitylog.
Supprime ce qui ne sert pas à une API (vues welcome, Vite côté Laravel).
Crée la structure app/Domains/* et app/Support décrite dans backend/CLAUDE.md, avec le chargement des routes par domaine.
Ajoute une route GET /api/v1/health et son test.
Termine par php artisan test, pint --test et phpstan sans erreur.
```

Fait quand : `make up` démarre, `curl localhost:8080/api/v1/health` répond 200, les trois contrôles passent.

## Étape 2 — Initialiser le frontend

```text
Lis CLAUDE.md et frontend/CLAUDE.md.
Crée l'application React + TypeScript avec Vite dans frontend/ (même méthode : dossier temporaire puis déplacement, en gardant frontend/CLAUDE.md).
Installe et configure : TanStack Router (routes fichiers), TanStack Query, Tailwind, shadcn/ui, react-hook-form, zod,
react-i18next (fr), vite-plugin-pwa, Dexie, Vitest + Testing Library + MSW, Playwright, ESLint + Prettier, openapi-typescript.
TypeScript strict. Crée la structure src/ décrite dans frontend/CLAUDE.md.
Ajoute une page d'accueil qui appelle /api/v1/health et affiche l'état, avec un test Vitest.
Termine par npm run lint, npm run typecheck et npm run test sans erreur.
```

Fait quand : `make up` sert le frontend sur http://localhost:5173 et la page affiche « API : OK ».

## Étape 3 — Multi-tenant et RLS

```text
Implémente l'isolation multi-établissements décrite dans CLAUDE.md (règle 1) et docs/adr/0002 :
- tables organizations, schools (type, slug, settings JSONB, features JSONB), cycles (settings JSONB), levels ;
- connexions pgsql (app_user) et pgsql_owner (app_owner, migrations) ; les rôles sont créés par docker/postgres/init/01-roles.sql ;
  en test, migrations via pgsql_owner (surcharge de migrateFreshUsing dans TestCase) ;
- helper Rls::enable(), trait BelongsToSchool, singleton CurrentSchool, middleware ResolveSchool (en-tête X-School-Id),
  middleware de job SetTenantContext, remise à zéro de app.school_id en fin de requête et de job ;
- classe CycleSettings (validation des settings du cycle) et seeders des cycles garderie, maternelle, primaire avec leurs niveaux ;
- factories School::factory()->withCycles().
Écris les tests : scope global, RLS qui bloque une requête brute sur une autre école, middleware (404 si l'utilisateur
n'appartient pas à l'école), job qui garde le bon contexte.
Propose ton plan avant de coder.
```

Fait quand : un test lance une requête SQL brute sans scope et ne voit que les lignes de l'école courante.

## Étape 4 — Utilisateurs, authentification et rôles par cycle

```text
Implémente le domaine Identity :
- users (téléphone E.164 unique, e-mail facultatif, mot de passe facultatif pour les parents), role_assignments
  (user_id, school_id, role, cycle_id nullable) ; enum Role (super_admin, promoter, director, secretary, accountant, teacher, guardian) ;
- config/permissions.php qui reprend la matrice du cahier des charges, et un service Authorizer utilisé par les Policies,
  qui tient compte du cycle ;
- endpoints /api/v1/auth/login, /auth/otp/request, /auth/otp/verify, /auth/logout, /me (profil, écoles, rôles, permissions) ;
- OTP : 6 chiffres, 5 minutes, 5 essais max, envoi via l'interface SmsSender (FakeSmsSender en local qui écrit dans le log) ;
- 2FA TOTP pour le personnel (activable, obligatoire pour director et accountant) ;
- helper de test actingAsRole('director', $school, cycle: $maternelle).
Tests : connexion, OTP (expiré, trop d'essais), /me, un directeur limité à la maternelle n'a pas les droits sur le primaire.
Propose ton plan avant de coder.
```

## Étape 5 — Audit, contrat API et seeders de démo

```text
- Active spatie/laravel-activitylog sur les modèles existants, avec school_id et causer ; exclus les champs sensibles.
- Configure Scramble pour exporter docs/api/openapi.json, et la commande make types qui régénère
  frontend/src/lib/api/schema.d.ts. Ajoute le script frontend api:types.
- Seeder de démo : 2 écoles (« Les Lauriers » avec 3 cycles, « Petits Génies » avec garderie + maternelle),
  un utilisateur par rôle, dont une directrice limitée à la maternelle. Mots de passe et téléphones de démo dans le README.
```

## Étape 6 — Écrans de base du frontend

```text
Implémente dans le frontend :
- client HTTP typé avec schema.d.ts, gestion du token Sanctum, ajout de X-School-Id, rafraîchissement de /me ;
- écran de connexion personnel (téléphone ou e-mail + mot de passe, puis code 2FA si demandé) ;
- écran de connexion parent (téléphone → code OTP) ;
- sélection de l'école si l'utilisateur en a plusieurs, mise en page back-office (menu selon les permissions) et mise en page mobile parent ;
- manifeste PWA (nom, icônes provisoires, couleurs) et service worker.
Tests Vitest des formulaires, test Playwright du parcours de connexion parent avec l'API de démo.
```

## Étape 7 — CI verte

```text
Pousse une branche et ouvre une pull request avec gh pr create.
Vérifie que .github/workflows/ci.yml passe entièrement sur le projet réel (gh pr checks) : adapte les commandes si besoin,
sans jamais désactiver un contrôle. Le job ci-ok doit être vert.
Mets à jour le README (démarrage, comptes de démo, commandes).
```

Ensuite, côté GitHub (à la main) : protéger `main`, rendre le job `ci-ok` obligatoire.

## Étape 8 — Premier déploiement sur Railway (staging)

```text
Lis docs/deploiement-railway.md et docs/adr/0004.
- Écris la commande artisan db:provision-app-role, idempotente : crée le rôle app_user avec DB_PASSWORD s'il n'existe pas
  (NOSUPERUSER NOBYPASSRLS), sinon met à jour son mot de passe ; GRANT sur les tables et séquences existantes
  et ALTER DEFAULT PRIVILEGES pour les futures. Elle s'exécute avec la connexion pgsql_owner. Teste-la.
- Configure Laravel pour la production derrière le proxy Railway : TrustProxies (tous les proxys), HTTPS forcé,
  CORS limité à FRONTEND_URL et *.<domaine>, logs sur stderr, REDIS_URL, disque s3 sur le bucket (URL signées uniquement).
- Vérifie que les images docker/production/api.Dockerfile et web.Dockerfile se construisent en local
  (docker build -f docker/production/api.Dockerfile .) et que l'API démarre avec PORT=8080.
- Le frontend lit l'école depuis le sous-domaine <slug>.<domaine> quand il existe, sinon depuis le choix de l'utilisateur.
Ne lance pas toi-même railway config apply : prépare et montre-moi la sortie de railway config plan.
```

Ensuite, à la main : suivre « Première mise en place » dans `docs/deploiement-railway.md` pour l'environnement `staging`.

## Revue de fin de sprint

Lance `/revue-isolation` (commande fournie dans `.claude/commands/`) puis corrige ce qu'elle trouve.
Critères de sortie : CI verte sur GitHub, `make check` vert en local, staging Railway en ligne,
démo de connexion parent et directrice-maternelle sur les données de démo.
