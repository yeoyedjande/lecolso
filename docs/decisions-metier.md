# Décisions métier

Journal des règles métier tranchées en cours de développement (questions posées par Claude Code ou par les écoles pilotes).
Une ligne par décision, la plus récente en haut.

| Date | Domaine | Question | Décision |
| --- | --- | --- | --- |
| 03/11/2026 | Sécurité | Comment le web s'authentifie-t-il ? | Cookie httpOnly Sanctum (SPA sur le même domaine principal) à la place du token en `localStorage` ; les tokens sont réservés à une future application native. À coder à l'étape 4 |
| 03/11/2026 | Sécurité | Que peut mettre en cache le service worker ? | Aucune réponse de l'API contenant des données personnelles ; le hors connexion passe uniquement par Dexie ; la déconnexion vide Dexie et tous les caches. À coder aux étapes 4 et 6 |
| 03/11/2026 | Tenancy | Comment le super-admin voit-il toutes les écoles ? | Rôle PostgreSQL de connexion séparé `app_platform` (BYPASSRLS, mot de passe propre, service `api` seulement), que `app_user` ne peut pas endosser ; accès par `Platform::run()` dans les routes `/api/v1/platform/*` uniquement |
| 03/11/2026 | Tenancy | Qui voit quelles écoles ? | Un utilisateur ne voit que les écoles où il a une affectation ; sans contexte, aucune ligne (RLS en mode fermé) |
| 03/11/2026 | Socle | Fuseau horaire de l'application ? | Stockage et API en UTC (ISO 8601) ; affichage en `Africa/Abidjan` via `config('app.display_timezone')` |
| 03/11/2026 | Socle | Que renvoie `GET /api/v1/health` ? | État de la base et de Redis (`ok` / `error`, sans détail), 503 si l'un est indisponible ; sert de healthcheck Railway |
| 03/11/2026 | Tenancy | Une école peut-elle avoir plusieurs cycles ? | Oui, garderie + maternelle + primaire dans un même compte ; rôles limitables par cycle |
| 03/11/2026 | Roadmap | Secondaire et supérieur ? | Collège et lycée en V2, enseignement supérieur (LMD) en V3 ; le modèle V1 les anticipe (ADR 0003) |
