# Décisions métier

Journal des règles métier tranchées en cours de développement (questions posées par Claude Code ou par les écoles pilotes).
Une ligne par décision, la plus récente en haut.

| Date | Domaine | Question | Décision |
| --- | --- | --- | --- |
| 03/11/2026 | Audit | Que contient le journal d'audit ? | Un journal par école (`school_id` + RLS) : qui a modifié quoi, avant/après. Jamais de mot de passe, de jeton ni d'information médicale. Une action sans école (changer son propre mot de passe, action super-admin hors école) n'y figure pas ; journal de plateforme plus tard si besoin. Conservation prévue 365 jours, purge à planifier |
| 03/11/2026 | Démo | Où peut-on créer les données de démo ? | En local et en staging seulement ; refus explicite en production. Mot de passe commun `Demo2026!`, comptes listés dans le README |
| 03/11/2026 | Sécurité | Comment s'authentifie-t-on en V1 ? | Une seule connexion pour tous : identifiant (téléphone ou e-mail) + mot de passe. **Pas de 2FA ni d'OTP SMS en V1** (remplace la décision précédente sur l'OTP parents et la 2FA du personnel). L'interface `SmsSender` reste pour les notifications |
| 03/11/2026 | Identity | Qui crée les comptes, et le mot de passe oublié ? | Le personnel de l'école crée le compte avec un mot de passe provisoire, à changer à la première connexion (`must_change_password`). Mot de passe oublié : un directeur ou une secrétaire de l'école génère un nouveau mot de passe provisoire (dans la limite de ses cycles) ; pas de lien par e-mail en V1 |
| 03/11/2026 | Sécurité | Combien de temps dure une session ? | Personnel : 8 h d'inactivité, sans « se souvenir de moi ». Comptes sans rôle du personnel (parents) : « se souvenir de moi » 30 jours |
| 03/11/2026 | Sécurité | Qui voit les comptes utilisateurs ? | RLS sur `users` : soi-même et les membres de l'école courante ; la connexion passe par une fonction SQL `SECURITY DEFINER` qui ne renvoie qu'un identifiant |
| 03/11/2026 | Sécurité | Comment le web s'authentifie-t-il ? | Cookie httpOnly Sanctum (SPA sur le même domaine principal) à la place du token en `localStorage` ; les tokens sont réservés à une future application native. Fait à l'étape 4 |
| 03/11/2026 | Sécurité | Que peut mettre en cache le service worker ? | Aucune réponse de l'API contenant des données personnelles ; le hors connexion passe uniquement par Dexie ; la déconnexion vide Dexie et tous les caches, sauf le precache de l'application (HTML/JS/CSS, sans donnée personnelle, indispensable pour rouvrir hors connexion). Fait à l'étape 4 |
| 03/11/2026 | Tenancy | Comment le super-admin voit-il toutes les écoles ? | Rôle PostgreSQL de connexion séparé `app_platform` (BYPASSRLS, mot de passe propre, service `api` seulement), que `app_user` ne peut pas endosser ; accès par `Platform::run()` dans les routes `/api/v1/platform/*` uniquement |
| 03/11/2026 | Tenancy | Qui voit quelles écoles ? | Un utilisateur ne voit que les écoles où il a une affectation ; sans contexte, aucune ligne (RLS en mode fermé) |
| 03/11/2026 | Socle | Fuseau horaire de l'application ? | Stockage et API en UTC (ISO 8601) ; affichage en `Africa/Abidjan` via `config('app.display_timezone')` |
| 03/11/2026 | Socle | Que renvoie `GET /api/v1/health` ? | État de la base et de Redis (`ok` / `error`, sans détail), 503 si l'un est indisponible ; sert de healthcheck Railway |
| 03/11/2026 | Tenancy | Une école peut-elle avoir plusieurs cycles ? | Oui, garderie + maternelle + primaire dans un même compte ; rôles limitables par cycle |
| 03/11/2026 | Roadmap | Secondaire et supérieur ? | Collège et lycée en V2, enseignement supérieur (LMD) en V3 ; le modèle V1 les anticipe (ADR 0003) |
