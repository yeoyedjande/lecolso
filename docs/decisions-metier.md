# Décisions métier

Journal des règles métier tranchées en cours de développement (questions posées par Claude Code ou par les écoles pilotes).
Une ligne par décision, la plus récente en haut.

| Date | Domaine | Question | Décision |
| --- | --- | --- | --- |
| 04/11/2026 | Parents | Quels enfants voit un parent ? | Ceux dont il est tuteur, rapprochés par le téléphone du compte (E.164). Toute autre fiche, tout autre reçu ou message est introuvable. L'API appliquera la même règle (Policy + test d'isolation) |
| 04/11/2026 | Parents | Justification d'absence ? | Le parent justifie une absence passée ou prévient d'une absence à venir (jours de classe seulement) ; l'absence devient « excusée ». Validation par l'école à prévoir avec le module présences |
| 04/11/2026 | Paiements | Paiement Mobile Money ? | Orange Money, MTN MoMo, Moov Money, Wave. En démonstration, simulé (aucun prélèvement) ; en réel, le paiement ne sera validé qu'à la réception du webhook signé de l'opérateur, traité de façon idempotente |
| 04/11/2026 | Interface | Quels écrans pédagogiques pour quelle classe ? | D'après les paramètres du cycle, jamais son nom : notes (moyenne pondérée), compétences, appel ou arrivées/départs, bulletin ou livret. Un établissement qui change un paramètre voit l'écran correspondant changer |
| 04/11/2026 | Finances | Taux de recouvrement affiché ? | Part de l'échu effectivement réglée à ce jour ; les paiements d'avance ne gonflent pas le taux |
| 04/11/2026 | Finances | Reçu de paiement ? | Numéro séquentiel par établissement et par année, montant en chiffres et en lettres, reste à payer après le paiement, caissier ; une erreur se corrige par une annulation (à venir avec le module paiements) |
| 04/11/2026 | Interface | Quel espace pour quel rôle ? | Promoteur, direction, secrétariat, comptabilité : back-office `/gestion`. Enseignant seul : `/enseignant` (mobile). Parent seul : `/parent` (mobile). Plusieurs rôles : premier espace dans cet ordre, puis sélecteur d'espace dans l'en-tête. Le menu masque ce que les permissions de `/me` ne permettent pas ; l'API reste la vraie barrière |
| 04/11/2026 | Interface | Le mode sombre ? | Back-office seulement ; espaces parent et enseignant toujours en clair |
| 04/11/2026 | Connexion | La case « se souvenir de moi » ? | Toujours affichée, avec l'aide « uniquement sur un téléphone personnel » : le type de compte n'est connu qu'après la connexion, et l'API ignore la case pour le personnel (session de 8 h) |
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
