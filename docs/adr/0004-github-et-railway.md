# ADR 0004 — GitHub pour le code, Railway pour l'hébergement

- Statut : accepté
- Date : 03/11/2026

## Décision

- Code et revue sur **GitHub** ; CI sur **GitHub Actions** (`.github/workflows/ci.yml`).
- Hébergement sur **Railway**, région EU West (Amsterdam), déploiement automatique de `main` après une CI verte.
- Infrastructure décrite en code dans `.railway/railway.ts` : la configuration `railway.json` est dépréciée par Railway
  (fichiers lus jusqu'au 01/12/2026 seulement), elle n'est donc pas utilisée.
- Images de production construites depuis la racine du dépôt (`docker/production/`) :
  FrankenPHP pour l'API (un seul processus, pas de nginx séparé), Caddy pour le frontend statique.
- Stockage de fichiers : bucket Railway (compatible S3, privé) ; accès aux fichiers uniquement par URL signée ou via l'API.
- Résolution de l'école : toujours par l'en-tête `X-School-Id` envoyé par le frontend ; le sous-domaine `<slug>.<domaine>`
  sert au frontend (page publique, présélection de l'école), pas à l'API, qui a son propre domaine `api.<domaine>`.

## Conséquences

- Développement local inchangé (Docker Compose, MinIO à la place du bucket).
- Données hébergées hors de Côte d'Ivoire : à valider juridiquement (ARTCI) avant le pilote. Si un hébergement local est exigé,
  les images Docker restent portables vers un autre hébergeur.
- Le rôle PostgreSQL `app_user` est créé par une commande artisan idempotente au pré-déploiement (voir `docs/deploiement-railway.md`).
