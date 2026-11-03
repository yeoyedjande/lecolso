# ADR 0002 — Isolation multi-établissements et droits par cycle

- Statut : accepté
- Date : 03/11/2026

## Décision

1. **Base partagée + `school_id` + Row-Level Security PostgreSQL.** Implémentation maison légère dans `app/Support`
   et `app/Domains/Tenancy` (middleware `ResolveSchool`, trait `BelongsToSchool`, helper `Rls`), plutôt qu'un paquet de tenancy.
2. **Rôles et permissions maison** : rôles définis dans un enum, permissions dans `config/permissions.php`,
   affectations dans `role_assignments (user_id, school_id, role, cycle_id nullable)`, contrôles dans les Policies Laravel.

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
