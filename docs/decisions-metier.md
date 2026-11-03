# Décisions métier

Journal des règles métier tranchées en cours de développement (questions posées par Claude Code ou par les écoles pilotes).
Une ligne par décision, la plus récente en haut.

| Date | Domaine | Question | Décision |
| --- | --- | --- | --- |
| 03/11/2026 | Socle | Fuseau horaire de l'application ? | Stockage et API en UTC (ISO 8601) ; affichage en `Africa/Abidjan` via `config('app.display_timezone')` |
| 03/11/2026 | Socle | Que renvoie `GET /api/v1/health` ? | État de la base et de Redis (`ok` / `error`, sans détail), 503 si l'un est indisponible ; sert de healthcheck Railway |
| 03/11/2026 | Tenancy | Une école peut-elle avoir plusieurs cycles ? | Oui, garderie + maternelle + primaire dans un même compte ; rôles limitables par cycle |
| 03/11/2026 | Roadmap | Secondaire et supérieur ? | Collège et lycée en V2, enseignement supérieur (LMD) en V3 ; le modèle V1 les anticipe (ADR 0003) |
