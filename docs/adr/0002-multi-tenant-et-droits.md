# ADR 0002 — Isolation multi-établissements et droits par cycle

- Statut : accepté
- Date : 03/11/2026

## Décision

1. **Base partagée + `school_id` + Row-Level Security PostgreSQL.** Implémentation maison légère dans `app/Support`
   et `app/Domains/Tenancy` (middleware `ResolveSchool`, trait `BelongsToSchool`, helper `Rls`), plutôt qu'un paquet de tenancy.
2. **Rôles et permissions maison** : rôles définis dans un enum, permissions dans `config/permissions.php`,
   affectations dans `role_assignments (user_id, school_id, role, cycle_id nullable)`, contrôles dans les Policies Laravel.
   Depuis l'ADR 0006 : rôles système ajustables et rôles personnalisés par école (`school_roles`).

## Raisons

- Le cahier des charges citait `stancl/tenancy` et `spatie/laravel-permission`. Après analyse, ils compliquent deux besoins clés :
  - `stancl/tenancy` est pensé d'abord pour une base par tenant ; le mode base unique ne gère pas la RLS PostgreSQL.
  - `spatie/laravel-permission` sait limiter un rôle à une « équipe » (l'école), mais pas à un cycle dans l'école.
- Une implémentation maison fait environ 300 lignes, est entièrement testée et reste lisible pour Claude Code comme pour un relecteur.
- `spatie/laravel-activitylog` reste utilisé pour le journal d'audit.

## Conséquences

- Les tests d'isolation entre deux écoles et de droits par cycle sont obligatoires pour chaque ressource (voir `backend/CLAUDE.md`).
- L'application se connecte avec un rôle PostgreSQL non propriétaire (`app_user`) pour que la RLS s'applique ;
  les migrations utilisent `app_owner`.
- Passage à une base dédiée pour l'offre Premium (V2) : possible en changeant la connexion résolue par `ResolveSchool`.

## Compléments (03/11/2026, sprint 0 étape 3)

- **Mode fermé** : les politiques comparent à `NULLIF(current_setting('app.school_id', true), '')::uuid`. Sans contexte
  (variable jamais définie, ou remise à zéro), aucune ligne n'est visible ni écrivable, sans erreur de conversion.
- **Table `schools`** : visible pour l'école courante et pour les écoles où l'utilisateur courant (`app.user_id`) a une affectation
  (`role_assignments`) ; mise à jour de l'école courante seulement ; aucune création ni suppression par `app_user`.
  `role_assignments` est lisible pour l'école courante ou pour ses propres affectations ; `organizations` si l'une de ses écoles l'est.
- **Super-admin** : rôle de connexion séparé `app_platform` (`LOGIN BYPASSRLS NOSUPERUSER`, aucun droit sur le schéma, mot de passe propre,
  fourni au seul service `api`). `app_user` n'en est pas membre et ne peut pas l'endosser (`pg_has_role` testé) : une injection SQL
  sur la connexion applicative ne suffit pas à contourner la RLS. Écarté : `SET ROLE` depuis `app_user` et un indicateur de session
  `app.platform`, contournables par une simple injection SQL. Accès par `Platform::run()` uniquement, limité aux routes `/api/v1/platform/*`.
- **Workers** : contexte remis à zéro avant et après chaque job ; test d'enchaînement de jobs de deux écoles sur un même worker.
