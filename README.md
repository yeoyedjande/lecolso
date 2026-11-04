# Gestion École

Plateforme SaaS de gestion d'établissements scolaires (garderie, maternelle, primaire ; secondaire en V2, supérieur en V3).
Développée à 100 % avec [Claude Code](https://docs.claude.com/en/docs/claude-code/overview), hébergée sur GitHub, déployée sur Railway.

## Prérequis

- Docker et Docker Compose, Git, Make
- [GitHub CLI](https://cli.github.com/) (`gh`) connectée à votre compte
- Claude Code (`claude` dans le terminal)
- Plus tard, pour le déploiement : [Railway CLI](https://docs.railway.com/guides/cli)

## Démarrer

```bash
git init -b main
git add . && git commit -m "chore: kit de démarrage"
gh repo create gestion-ecole --private --source=. --push
git switch -c develop && git push -u origin develop

make up          # Postgres, Redis, MinIO, Gotenberg, PHP, nginx en local
claude           # puis /sprint 0 1 et la suite de docs/sprints/sprint-0.md
```

Une fois les étapes 1 et 2 du sprint 0 faites, `make up` démarre aussi Horizon, le scheduler et le serveur Vite.

| Service local | URL |
| --- | --- |
| API | http://localhost:8080/api/v1 |
| Frontend | http://localhost:5173 |
| Console MinIO (stockage local) | http://localhost:9001 (minio / minio_secret) |
| PostgreSQL | localhost:5432 (app_owner / app_owner_secret) |

## Branches et déploiement

| Branche | CI GitHub Actions | Déploiement Railway |
| --- | --- | --- |
| `feat/*` | sur chaque pull request | — |
| `develop` | oui | `staging` |
| `main` | oui | `production` |

Procédure complète : [docs/deploiement-railway.md](docs/deploiement-railway.md).

## Travailler avec Claude Code

| Fichier ou commande | Rôle |
| --- | --- |
| `CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md` | Conventions lues automatiquement par Claude Code |
| `docs/cahier-des-charges.md` | Référence fonctionnelle (export du document partagé) |
| `docs/adr/` | Décisions d'architecture |
| `docs/sprints/` | Plans de sprint avec les demandes à donner à Claude Code |
| `docs/decisions-metier.md` | Règles métier tranchées en cours de route |
| `/sprint <n> <étape>` | Lance une étape d'un plan de sprint |
| `/fonctionnalite <description>` | Développe une fonctionnalité de bout en bout |
| `/revue-isolation` | Audit des fuites entre établissements |

Avant chaque commit : `make check`. Claude Code n'a pas le droit d'appliquer un changement d'infrastructure Railway
ni de pousser sur `main` (voir `.claude/settings.json`).

## Comptes de démo

Créés par `make migrate` ou `make fresh` (seeder `DemoSeeder`), en local et en staging uniquement : le seeder refuse
de s'exécuter en production. Connexion par téléphone (« 07 00 00 00 03 » ou « +2250700000003 ») ou par e-mail.

**Mot de passe commun : `Demo2026!`** (aucun changement de mot de passe demandé à la première connexion).

| Compte | Téléphone | E-mail | Rôle |
| --- | --- | --- | --- |
| Super-admin Démo | +225 07 00 00 00 01 | superadmin@demo.lecolso.ci | super-admin de la plateforme |
| Konan Promoteur | +225 07 00 00 00 02 | promoteur@demo.lecolso.ci | promoteur des deux écoles |
| Yao Directeur | +225 07 00 00 00 03 | directeur@demo.lecolso.ci | directeur, Les Lauriers (toute l'école) |
| Aminata Directrice maternelle | +225 07 00 00 00 04 | directrice.maternelle@demo.lecolso.ci | directrice, Les Lauriers, **maternelle uniquement** |
| Awa Secrétaire | +225 07 00 00 00 05 | secretaire@demo.lecolso.ci | secrétaire, Les Lauriers |
| Moussa Comptable | +225 07 00 00 00 06 | comptable@demo.lecolso.ci | comptable, Les Lauriers |
| Fatou Enseignante | +225 07 00 00 00 07 | enseignante@demo.lecolso.ci | enseignante, Les Lauriers, primaire |
| Kouadio Parent | +225 07 00 00 00 08 | parent@demo.lecolso.ci | parent dans les deux écoles |
| Mariam Directrice | +225 07 00 00 00 09 | directrice@demo.lecolso.ci | directrice, Petits Génies |

| École | Cycles |
| --- | --- |
| Les Lauriers | garderie, maternelle, primaire |
| Petits Génies | garderie, maternelle |

### Espaces de l'application

Une seule application, un chemin par établissement : `https://app.ekalewa.com/{slug}/…` (staging :
`https://staging.ekalewa.com/{slug}/…`), sans sous-domaine par école (ADR 0005). Écoles de démo : `les-lauriers`, `petits-genies`.

| Espace | Adresse | Pour qui | À essayer avec |
| --- | --- | --- | --- |
| Back-office | `/{slug}/tableau-de-bord`, `/{slug}/eleves`, `/{slug}/encaissements`… | promoteur, direction, secrétariat, comptabilité | Yao Directeur, Moussa Comptable, Aminata (maternelle) |
| Enseignant (mobile) | `/{slug}/enseignant` | enseignants | Fatou Enseignante (CE1 A et CM1 A) |
| Parent (mobile) | `/{slug}/parent` | parents | Kouadio Parent (2 enfants aux Lauriers, 1 aux Petits Génies) |
| Page publique | `/{slug}`, `/{slug}/preinscription` | tout le monde, sans connexion | `/les-lauriers`, pré-inscription |
| Plateforme | `/plateforme` | super-admin | Super-admin Démo (liste et création d'écoles) |
| Compte, connexion | `/compte`, `/connexion`, `/etablissements` | tous | — |
| Design system | `/design` | équipe (local et staging seulement) | — |

Les modules sans backend (élèves, paiements, notes, présences, messages…) affichent des **données de démonstration**
générées dans le navigateur (`VITE_DEMO_MODULES=true`) : elles sont cohérentes entre les écrans mais repartent de zéro
au rechargement. Restent sur la vraie API : connexion, profil, établissements, cycles et leurs paramètres,
réinitialisation de mot de passe, liste et création d'écoles (super-admin), page publique d'une école.
