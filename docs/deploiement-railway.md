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
| `postgres` | base gérée Railway | Données | — |
| `redis` | base gérée Railway | Files et cache | — |
| `fichiers` | bucket Railway (S3, privé) | Photos, pièces jointes, PDF | — (URL signées) |

Région : **EU West (Amsterdam)** pour tous les services et le bucket (`ams`), la plus proche d'Abidjan.
Les données sont donc hébergées hors de Côte d'Ivoire : point à faire valider pour la déclaration ARTCI avant le pilote.

## Environnements

| Environnement Railway | Branche | Usage |
| --- | --- | --- |
| `production` | `main` | Écoles pilotes puis clients |
| `staging` | `develop` | Recette avant mise en production, données de démo uniquement |

## Première mise en place (une fois)

1. **GitHub** : créer le dépôt `gestion-ecole` (privé), pousser le kit, protéger `main` (pull request obligatoire, job `ci-ok` requis).
2. **Railway** : créer un compte, installer la CLI (`npm i -g @railway/cli`), `railway login`, créer le projet et le lier : `railway link`.
3. **Infrastructure** : remplacer `VOTRE-COMPTE` et `VOTRE-DOMAINE` dans `.railway/railway.ts`, puis
   ```bash
   cd .railway && npm install
   railway config plan      # vérifier ce qui sera créé
   railway config apply
   ```
4. **Région des bases** : dans le tableau de bord, vérifier que `postgres` et `redis` sont en EU West (sinon les déplacer avant d'y mettre des données).
5. **Secrets** à saisir dans Railway (onglet Variables de `api`, `worker`, `scheduler`) — jamais dans le dépôt :
   - `APP_KEY` : `php artisan key:generate --show` en local ;
   - `DB_PASSWORD` : mot de passe fort pour le rôle `app_user` (même valeur dans les trois services, via une variable partagée) ;
   - `DB_PLATFORM_PASSWORD` : mot de passe fort et **différent** pour le rôle `app_platform`, saisi **uniquement** dans le service `api`
     (jamais dans `worker` ni `scheduler`, ni dans une variable partagée) ;
   - clés SMS, paiement et secret de webhook quand les fournisseurs seront choisis.
6. **Wait for CI** : dans les réglages de chaque service relié à GitHub, activer l'attente de la CI GitHub avant déploiement.
7. **Domaines** : ajouter chez le registrar les enregistrements CNAME et TXT donnés par Railway pour `api.`, `app.` et `*.` (le joker exige aussi un CNAME `_acme-challenge`).
8. **Premier déploiement** : pousser sur `main`. Le pré-déploiement de `api` crée le rôle `app_user` puis lance les migrations.
9. **Vérifier** : `https://api.<domaine>/api/v1/health` répond 200 ; la page `https://app.<domaine>` s'affiche ; un test d'envoi de fichier atterrit dans le bucket.

## Rôles PostgreSQL en production

Railway fournit un utilisateur propriétaire de la base, qui contourne la RLS. Il ne sert qu'aux migrations (`pgsql_owner`).
La commande `php artisan db:provision-app-role` (à écrire au sprint 0, étape 8) est idempotente :
elle crée le rôle `app_user` avec `DB_PASSWORD` s'il n'existe pas, sans `BYPASSRLS`, et lui donne les droits sur les tables
et séquences actuelles et futures. L'application (`api`, `worker`, `scheduler`) se connecte toujours avec `app_user`.

| Rôle | Connexion Laravel | Services | Contourne la RLS |
| --- | --- | --- | --- |
| propriétaire Railway | `pgsql_owner` | pré-déploiement de `api` (migrations) | oui (propriétaire) |
| `app_user` | `pgsql` | `api`, `worker`, `scheduler` | **non** |
| `app_platform` | `pgsql_platform` | `api` uniquement | oui (`BYPASSRLS`), routes super-admin seulement |

`app_platform` est un rôle de **connexion séparé** (`LOGIN BYPASSRLS NOSUPERUSER`, aucun droit de créer dans le schéma,
mot de passe propre `DB_PLATFORM_PASSWORD`). `app_user` n'en est pas membre et ne peut pas l'endosser (`SET ROLE` refusé) :
une injection SQL sur la connexion applicative ne suffit donc pas à contourner la RLS.
Le code n'utilise cette connexion qu'à travers `Platform::run()`, dans les routes `/api/v1/platform/*` (super-admin).
`db:provision-app-role` (étape 8) devra aussi créer `app_platform` avec `DB_PLATFORM_PASSWORD`, en refusant toute appartenance croisée.

## Opérations courantes

| Besoin | Commande ou action |
| --- | --- |
| Logs d'un service | `railway logs --service api` |
| Commande artisan en production | `railway ssh --service api` puis `php artisan …` (avec prudence) |
| Retour arrière | Railway → service → Deployments → redéployer la version précédente |
| Sauvegardes | Activer les sauvegardes de la base Postgres dans Railway + export quotidien chiffré vers le bucket (job planifié) |
| Rôles PostgreSQL en local (volume existant) | `make db-roles` (rejoue `docker/postgres/init/01-roles.sql`, idempotent) |
| Changer l'infrastructure | modifier `.railway/railway.ts`, `railway config plan`, revue, `railway config apply` |
