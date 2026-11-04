# Déploiement sur Railway

Code sur GitHub, déploiement automatique sur Railway quand `main` est vert en CI.
L'infrastructure est décrite dans `.railway/railway.ts` (infrastructure en code de Railway).

## Architecture déployée

| Service Railway | Source | Rôle | Domaine public |
| --- | --- | --- | --- |
| `api` | `docker/production/api.Dockerfile` | API Laravel (FrankenPHP) ; migrations avant chaque déploiement | `api.<domaine>` |
| `worker` | même image, `php artisan horizon` | Files : PDF, SMS, WhatsApp, webhooks | — |
| `scheduler` | même image, `php artisan schedule:work` | Relances, tâches planifiées | — |
| `gotenberg` | image `gotenberg/gotenberg:8` | Rendu PDF, réseau privé uniquement | — |
| `web` | `docker/production/web.Dockerfile` | Back-office + PWA (fichiers statiques, Caddy) | `app.<domaine>`, `*.<domaine>` |

`<domaine>` vaut `PRODUCTION_DOMAIN` en production et `STAGING_DOMAIN` en staging (`.railway/railway.ts`).
| `postgres` | base gérée Railway | Données | — |
| `redis` | base gérée Railway | Files et cache | — |
| `fichiers` | bucket Railway (S3, privé) | Photos, pièces jointes, PDF | — (URL signées) |

Région : **EU West (Amsterdam)** pour tous les services et le bucket (`ams`), la plus proche d'Abidjan.
Les données sont donc hébergées hors de Côte d'Ivoire : point à faire valider pour la déclaration ARTCI avant le pilote.

## Environnements

| Environnement Railway | Branche | Domaine | Usage |
| --- | --- | --- | --- |
| `production` | `main` | `PRODUCTION_DOMAIN` | Écoles pilotes puis clients |
| `staging` | `develop` | `STAGING_DOMAIN` | Recette avant mise en production, données de démo uniquement |

Le staging a son **propre domaine**, jamais `staging.<domaine de production>` : le cookie de session de production
est posé sur `.<domaine>` et serait sinon envoyé aux serveurs de staging. Un domaine propre est obligatoire dans les deux
cas : sur `*.up.railway.app` (suffixe public), `api.` et `app.` ne peuvent pas partager de cookie.
Les noms de cookie diffèrent aussi (`lecolso_session`, `lecolso_staging_session`).

En staging, le pré-déploiement de `api` rejoue aussi `DemoSeeder` (idempotent, refusé en production) : les comptes
de démo du README existent toujours, avec le mot de passe `Demo2026!`.

## Première mise en place (une fois)

1. **GitHub** : dépôt `yeoyedjande/lecolso` ; protéger `main` (pull request obligatoire, job `ci-ok` requis).
2. **Railway** : créer un compte, installer la CLI **5.42.1 ou plus récente** (`npm i -g @railway/cli`, le moteur IaC est
   fourni par la CLI), `railway login`, créer le projet et le lier : `railway link`.
3. **Infrastructure** : remplacer `VOTRE-DOMAINE` et `VOTRE-DOMAINE-STAGING` dans `.railway/railway.ts`, puis
   ```bash
   cd .railway && npm install
   railway config plan      # vérifier ce qui sera créé
   railway config apply
   ```
4. **Région des bases** : `railway.ts` crée `postgres` (PostgreSQL 17) et `redis` en EU West (`europe-west4`) ;
   vérifier dans le plan puis dans le tableau de bord que l'identifiant de région est bien accepté, avant d'y mettre des données.
5. **Secrets** à saisir dans Railway (onglet Variables de `api`, `worker`, `scheduler`) — jamais dans le dépôt :
   - `APP_KEY` : `php artisan key:generate --show` en local ;
   - `DB_PASSWORD` : mot de passe fort pour le rôle `app_user` (même valeur dans les trois services, via une variable partagée) ;
   - `DB_PLATFORM_PASSWORD` : mot de passe fort et **différent** pour le rôle `app_platform`, saisi **uniquement** dans le service `api`
     (jamais dans `worker` ni `scheduler`, ni dans une variable partagée) ;
   - clés SMS, paiement et secret de webhook quand les fournisseurs seront choisis.
6. **Wait for CI** : dans les réglages de chaque service relié à GitHub, activer l'attente de la CI GitHub avant déploiement.
7. **Domaines** : ajouter chez le registrar les enregistrements CNAME et TXT donnés par Railway pour `api.`, `app.` et `*.` (le joker exige aussi un CNAME `_acme-challenge`).
8. **Premier déploiement** : staging en poussant sur `develop`, production en fusionnant `develop` → `main`.
   Le pré-déploiement de `api` crée ou met à jour les rôles `app_user` et `app_platform`, lance les migrations
   (et, en staging, les comptes de démo).
9. **Vérifier** : `https://api.<domaine>/api/v1/health` répond 200 (`database` et `redis` à `ok`) ; la page
   `https://app.<domaine>` s'affiche ; connexion avec un compte de démo (staging) ; `https://les-lauriers.<domaine>`
   ouvre la page publique de l'école ; un test d'envoi de fichier atterrit dans le bucket.

## Rôles PostgreSQL en production

Railway fournit un utilisateur propriétaire de la base, qui contourne la RLS. Il ne sert qu'aux migrations (`pgsql_owner`).
La commande `php artisan db:provision-app-role` (`backend/app/Console/Commands/ProvisionAppRole.php`) est idempotente
et s'exécute avec la connexion `pgsql_owner` :
- crée `app_user` avec `DB_PASSWORD` (`LOGIN NOSUPERUSER NOBYPASSRLS`), ou met à jour son mot de passe et rétablit ces attributs ;
- crée `app_platform` avec `DB_PLATFORM_PASSWORD` (`LOGIN BYPASSRLS NOSUPERUSER NOINHERIT`), de la même façon ;
- retire toute appartenance croisée (ni l'un ni l'autre ne peut endosser l'autre rôle ni le rôle propriétaire) ;
- donne `CONNECT`, `USAGE` sur le schéma (sans `CREATE`), les droits de lecture et d'écriture sur les tables et séquences
  existantes, et les mêmes droits par défaut sur celles que créeront les migrations.

Elle refuse un mot de passe vide ou de moins de 12 caractères et n'affiche jamais les mots de passe.
L'application (`api`, `worker`, `scheduler`) se connecte toujours avec `app_user`.

| Rôle | Connexion Laravel | Services | Contourne la RLS |
| --- | --- | --- | --- |
| propriétaire Railway | `pgsql_owner` | pré-déploiement de `api` (migrations) | oui (propriétaire) |
| `app_user` | `pgsql` | `api`, `worker`, `scheduler` | **non** |
| `app_platform` | `pgsql_platform` | `api` uniquement | oui (`BYPASSRLS`), routes super-admin seulement |

`app_platform` est un rôle de **connexion séparé** (`LOGIN BYPASSRLS NOSUPERUSER`, aucun droit de créer dans le schéma,
mot de passe propre `DB_PLATFORM_PASSWORD`). `app_user` n'en est pas membre et ne peut pas l'endosser (`SET ROLE` refusé) :
une injection SQL sur la connexion applicative ne suffit donc pas à contourner la RLS.
Le code n'utilise cette connexion qu'à travers `Platform::run()`, dans les routes `/api/v1/platform/*` (super-admin).
`db:provision-app-role` crée aussi `app_platform` avec `DB_PLATFORM_PASSWORD` et retire toute appartenance croisée.
Comme `DB_PLATFORM_PASSWORD` n'existe que dans `api`, seul le pré-déploiement de `api` lance cette commande.

## Session et authentification (navigateur)

Le frontend (`app.<domaine>`, `<slug>.<domaine>`) et l'API (`api.<domaine>`) partagent le domaine principal : la session
est un cookie httpOnly posé sur `.<domaine>`, et Sanctum (mode SPA) protège les requêtes par le jeton CSRF `XSRF-TOKEN`.

| Variable | Valeur en production | Rôle |
| --- | --- | --- |
| `SESSION_DRIVER` | `redis` | sessions partagées par les répliques de `api` |
| `SESSION_LIFETIME` | `480` | 8 h d'inactivité ; « se souvenir de moi » (30 jours) réservé aux comptes sans rôle du personnel |
| `SESSION_DOMAIN` | `.<domaine>` | cookie lisible par `api.` et envoyé depuis `app.` et `<slug>.` |
| `SESSION_COOKIE` | `lecolso_session` (staging : `lecolso_staging_session`) | nom du cookie propre à chaque environnement |
| `SESSION_SECURE_COOKIE` | `true` | cookie envoyé en HTTPS uniquement |
| `SESSION_SAME_SITE` | `lax` | même site : les requêtes du frontend emportent le cookie |
| `SANCTUM_STATEFUL_DOMAINS` | `app.<domaine>,*.<domaine>` | origines traitées en session (sinon : aucune session) |
| `FRONTEND_URL` | `https://app.<domaine>` | origine autorisée par CORS (avec cookies) |
| `CORS_ALLOWED_ORIGIN_PATTERN` | `#^https://[a-z0-9-]+\.<domaine>$#` | pages des écoles autorisées par CORS |

Ces valeurs sont dans `.railway/railway.ts` (communes à `api`, `worker`, `scheduler`).

## Laravel derrière le proxy Railway

- `trustProxies(at: '*')` (`bootstrap/app.php`) : Railway termine TLS et transmet `X-Forwarded-*` ; le schéma https,
  l'hôte et l'IP réelle (limites de débit) en dépendent. Les conteneurs ne sont joignables que par le proxy Railway.
- `URL::forceScheme('https')` en staging et en production (`AppServiceProvider`).
- Journaux sur stderr (`LOG_CHANNEL=stderr`, `LOG_LEVEL=info`), collectés par Railway.
- Redis par `REDIS_URL` (sessions, cache, files). Préfixes figés (`REDIS_PREFIX`, `CACHE_PREFIX`, `HORIZON_PREFIX`) : ils ne
  dépendent plus d'`APP_NAME`, dont un changement (nom affiché) aurait déconnecté tout le monde et orphelin les files.
- Disque `s3` sur le bucket : `league/flysystem-aws-s3-v3`, visibilité `private`, accès par URL signée (`temporaryUrl`) uniquement.
- Images : `.dockerignore` exclut `.env`, `vendor`, `node_modules`, tests et documentation du contexte de build.
- `web` : `index.html` (servi pour toutes les routes), `sw.js` et le manifeste en `Cache-Control: no-cache` ;
  `/assets/*` (noms versionnés) en cache long.

## Variables du frontend (service `web`, lues au build)

| Variable | staging | production | Rôle |
| --- | --- | --- | --- |
| `VITE_API_URL` | `https://api.<domaine>/api/v1` | idem | URL de l'API |
| `VITE_APP_ENV` | `staging` | `production` | `/design` présente en staging, absente du build de production |
| `VITE_DEMO_MODULES` | `true` | `false` | données de démonstration des modules dont le backend n'existe pas encore |
| `VITE_TENANT_DOMAIN` | `STAGING_DOMAIN` | `PRODUCTION_DOMAIN` | sur `<slug>.<domaine>` : page publique sans session, établissement présélectionné une fois connecté |

Elles sont déclarées en `ARG` dans `docker/production/web.Dockerfile` ; un changement impose un nouveau build.

## Opérations courantes

| Besoin | Commande ou action |
| --- | --- |
| Logs d'un service | `railway logs --service api` |
| Commande artisan en production | `railway ssh --service api` puis `php artisan …` (avec prudence) |
| Retour arrière | Railway → service → Deployments → redéployer la version précédente |
| Sauvegardes | Activer les sauvegardes de la base Postgres dans Railway + export quotidien chiffré vers le bucket (job planifié) |
| Rôles PostgreSQL en local (volume existant) | `make db-roles` (rejoue `docker/postgres/init/01-roles.sql`, idempotent) |
| Changer l'infrastructure | modifier `.railway/railway.ts`, `railway config plan`, revue, `railway config apply` |
