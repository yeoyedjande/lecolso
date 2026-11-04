# Déploiement sur Railway

Code sur GitHub, déploiement automatique sur Railway quand `main` est vert en CI.
L'infrastructure est décrite dans `.railway/railway.ts` (infrastructure en code de Railway).

## Architecture déployée

Routage par chemin (ADR 0005) : une seule application, `https://app.ekalewa.com/{slug}/*`, **aucun sous-domaine par école**.

| Service Railway | Source | Rôle | Domaine public |
| --- | --- | --- | --- |
| `web` | `docker/production/web.Dockerfile` | Application + PWA (Caddy) et proxy `/api/*`, `/sanctum/*` vers `api` | `app.ekalewa.com` (staging : `staging.ekalewa.com`) |
| `api` | `docker/production/api.Dockerfile` | API Laravel (FrankenPHP, port 8080) ; migrations avant chaque déploiement | `api.ekalewa.com` en production seulement (webhooks, intégrations) |
| `worker` | même image, `php artisan horizon` | Files : PDF, SMS, WhatsApp, webhooks | — |
| `scheduler` | même image, `php artisan schedule:work` | Relances, tâches planifiées | — |
| `gotenberg` | image `gotenberg/gotenberg:8` | Rendu PDF, réseau privé uniquement | — |
| `postgres` | base gérée Railway | Données | — |
| `redis` | base gérée Railway | Files et cache | — |
| `fichiers` | bucket Railway (S3, privé) | Photos, pièces jointes, PDF | — (URL signées) |

`ekalewa.com` (site vitrine) n'est pas servi par ce dépôt.

Région : **EU West (Amsterdam)** pour tous les services et le bucket (`ams`), la plus proche d'Abidjan.
Les données sont donc hébergées hors de Côte d'Ivoire : point à faire valider pour la déclaration ARTCI avant le pilote.

### Chemin d'une requête du navigateur

```text
navigateur ─https─▶ proxy Railway (TLS) ─▶ web (Caddy) ─┬─ /api/*, /sanctum/* ─▶ api:8080 (réseau privé)
                                                         └─ le reste ─▶ fichiers de l'application (index.html)
```

Le navigateur ne parle qu'à l'origine de l'application : pas de CORS, pas de requête `OPTIONS` préalable, cookies
limités à cet hôte. `api.ekalewa.com` ne sert qu'aux appels de serveur à serveur.

## Environnements

| Environnement Railway | Branche | Adresse | Usage |
| --- | --- | --- | --- |
| `production` | `main` | `https://app.ekalewa.com` | Écoles pilotes puis clients |
| `staging` | `develop` | `https://staging.ekalewa.com` | Recette avant mise en production, données de démo uniquement |

Les cookies de session et `XSRF-TOKEN` sont **limités à l'hôte** (`SESSION_DOMAIN` vide) : un cookie de
`app.ekalewa.com` n'est jamais envoyé à `staging.ekalewa.com`, et inversement. Les noms diffèrent aussi
(`lecolso_session`, `lecolso_staging_session`). Ne jamais poser `SESSION_DOMAIN=.ekalewa.com`.

En staging, le pré-déploiement de `api` rejoue aussi `DemoSeeder` (idempotent, refusé en production) : les comptes
de démo du README existent toujours, avec le mot de passe `Demo2026!`.

## Première mise en place (une fois)

1. **GitHub** : dépôt `yeoyedjande/lecolso` ; protéger `main` (pull request obligatoire, job `ci-ok` requis).
2. **Railway** : créer un compte, installer la CLI **5.42.1 ou plus récente** (`npm i -g @railway/cli`, le moteur IaC est
   fourni par la CLI), `railway login`, créer le projet et le lier : `railway link`.
3. **Infrastructure** :
   ```bash
   cd .railway && npm ci
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
7. **DNS** (chez le registrar de `ekalewa.com`), enregistrements CNAME et TXT donnés par Railway pour :
   `app.ekalewa.com` et `api.ekalewa.com` (production), `staging.ekalewa.com` (staging). **Aucun joker `*.`.**
   `ekalewa.com` (vitrine) : hébergé ailleurs, ou redirigé vers `app.ekalewa.com` en attendant.
8. **Premier déploiement** : staging en poussant sur `develop`, production en fusionnant `develop` → `main`.
   Le pré-déploiement de `api` crée ou met à jour les rôles `app_user` et `app_platform`, lance les migrations
   (et, en staging, les comptes de démo). La migration `assert_no_reserved_school_slugs` échoue si une école porte
   un slug réservé (`config/tenancy.php`) : la renommer à la main avant de redéployer.
9. **Vérifier** (remplacer l'hôte par `staging.ekalewa.com` pour le staging) :
   - `https://app.ekalewa.com/api/v1/health` répond 200 (`database` et `redis` à `ok`), à travers le proxy ;
   - `https://app.ekalewa.com/connexion` : connexion d'un compte de démo (staging), puis `/me` ;
   - dans les outils du navigateur, le cookie de session n'a **pas** d'attribut `Domain` (limité à l'hôte) ;
   - `https://app.ekalewa.com/les-lauriers` ouvre la page publique de l'école sans connexion ;
   - les journaux de `api` montrent l'adresse IP réelle des visiteurs (pas celle du proxy) : sinon, ajouter la plage
     d'adresses du proxy Railway à `trusted_proxies` dans `docker/production/web.Caddyfile` ;
   - un test d'envoi de fichier atterrit dans le bucket.

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

Le frontend appelle l'API sur sa propre origine (`/api/v1`, `/sanctum/csrf-cookie`), relayée par Caddy : la session est
un cookie httpOnly **limité à l'hôte**, et Sanctum (mode SPA) protège les requêtes par le jeton CSRF `XSRF-TOKEN`
(cookie lisible par l'application, renvoyé dans l'en-tête `X-XSRF-TOKEN`).

| Variable | Valeur en production (staging) | Rôle |
| --- | --- | --- |
| `SESSION_DRIVER` | `redis` | sessions partagées par les répliques de `api` |
| `SESSION_LIFETIME` | `480` | 8 h d'inactivité ; « se souvenir de moi » (30 jours) réservé aux comptes sans rôle du personnel |
| `SESSION_DOMAIN` | vide (`null`) | cookie limité à l'hôte : jamais partagé avec un autre sous-domaine d'`ekalewa.com` |
| `SESSION_COOKIE` | `lecolso_session` (`lecolso_staging_session`) | nom du cookie propre à chaque environnement |
| `SESSION_SECURE_COOKIE` | `true` | cookie envoyé en HTTPS uniquement |
| `SESSION_SAME_SITE` | `lax` | même origine : les requêtes du frontend emportent le cookie |
| `SANCTUM_STATEFUL_DOMAINS` | `app.ekalewa.com` (`staging.ekalewa.com`) | origine traitée en session (sinon : aucune session) |
| `APP_URL`, `FRONTEND_URL` | `https://app.ekalewa.com` (`https://staging.ekalewa.com`) | base des liens envoyés (`SchoolUrl`) |

Ces valeurs sont dans `.railway/railway.ts` (communes à `api`, `worker`, `scheduler`). CORS n'autorise que `FRONTEND_URL`,
utile seulement en développement local (Vite sur `localhost:5173`, API sur `localhost:8080`).

## Laravel derrière les proxys (Railway, puis Caddy)

- Caddy (`docker/production/web.Caddyfile`) n'accepte `X-Forwarded-*` que du réseau privé (`trusted_proxies`), puis
  transmet à l'API **une seule** adresse client (`X-Forwarded-For`, `X-Real-IP`), `X-Forwarded-Proto: https`, et l'hôte
  public d'origine ; il retire `X-Forwarded-Host` et `X-Forwarded-Port`. Une valeur envoyée par le navigateur n'est
  jamais retransmise.
- Laravel : `trustProxies(at: '*')` (`bootstrap/app.php`) fait confiance à l'adresse qui le joint (Caddy, ou le proxy Railway
  pour `api.ekalewa.com`) : schéma https et IP réelle (limites de débit) en dépendent. Les conteneurs ne sont
  joignables que par le proxy Railway ou le réseau privé.
- `URL::forceScheme('https')` en staging et en production (`AppServiceProvider`).
- Journaux sur stderr (`LOG_CHANNEL=stderr`, `LOG_LEVEL=info`), collectés par Railway.
- Redis par `REDIS_URL` (sessions, cache, files). Préfixes figés (`REDIS_PREFIX`, `CACHE_PREFIX`, `HORIZON_PREFIX`) : ils ne
  dépendent plus d'`APP_NAME`, dont un changement (nom affiché) aurait déconnecté tout le monde et orphelin les files.
- Disque `s3` sur le bucket : `league/flysystem-aws-s3-v3`, visibilité `private`, accès par URL signée (`temporaryUrl`) uniquement.
- Images : `.dockerignore` exclut `.env`, `vendor`, `node_modules`, tests et documentation du contexte de build.
- `web` : `index.html` (servi pour toutes les routes, dont `/{slug}/…`), `sw.js` et le manifeste en
  `Cache-Control: no-cache` ; `/assets/*` (noms versionnés) en cache long. Les réponses de l'API gardent leurs propres en-têtes.

## Variables du service `web`

| Variable | Valeur | Rôle |
| --- | --- | --- |
| `VITE_API_URL` | `/api/v1` | API sur la même origine (lue au build) |
| `VITE_APP_ENV` | `staging` / `production` | `/design` présente en staging, absente du build de production (lue au build) |
| `VITE_DEMO_MODULES` | `true` / `false` | données de démonstration des modules dont le backend n'existe pas encore (lue au build) |
| `API_UPSTREAM` | `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:8080` | adresse privée de l'API pour le proxy Caddy (lue au démarrage) |

Les variables `VITE_*` sont déclarées en `ARG` dans `docker/production/web.Dockerfile` ; un changement impose un nouveau build.

## Liens envoyés aux utilisateurs

E-mails, SMS, WhatsApp et PDF ne contiennent que des liens construits par `App\Support\Tenancy\SchoolUrl::to($school,
'chemin')` : `FRONTEND_URL/{slug}/chemin`. Jamais de sous-domaine ni d'URL composée à la main ; un lien ne donne
aucun droit (session, appartenance et Policies sont vérifiées à l'ouverture).

## Opérations courantes

| Besoin | Commande ou action |
| --- | --- |
| Logs d'un service | `railway logs --service api` |
| Commande artisan en production | `railway ssh --service api` puis `php artisan …` (avec prudence) |
| Retour arrière | Railway → service → Deployments → redéployer la version précédente |
| Sauvegardes | Activer les sauvegardes de la base Postgres dans Railway + export quotidien chiffré vers le bucket (job planifié) |
| Rôles PostgreSQL en local (volume existant) | `make db-roles` (rejoue `docker/postgres/init/01-roles.sql`, idempotent) |
| Changer l'infrastructure | modifier `.railway/railway.ts`, `railway config plan`, revue, `railway config apply` |
