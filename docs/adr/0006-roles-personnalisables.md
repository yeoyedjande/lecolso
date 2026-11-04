# ADR 0006 — Rôles personnalisables par établissement

- Statut : accepté
- Date : 04/11/2026
- Complète l'ADR 0002 (point 2) : la matrice des permissions n'est plus fixe.

## Contexte

Recette du staging : la direction doit pouvoir gérer les rôles et les permissions de son établissement, et l'école doit
pouvoir créer ses propres rôles (« Surveillant général », « Économe »…) avec les permissions de son choix. Jusqu'ici,
`config/permissions.php` fixait une matrice rôle → permissions identique pour toutes les écoles.

## Décision

- **Rôles système** (`App\Domains\Identity\Enums\Role`) : toujours présents dans chaque école, permissions par défaut dans
  `config/permissions.php` (qui devient le **catalogue** des permissions). Ils ne sont **pas** recopiés en base :
  les affectations existantes restent valides sans migration de données.
- **Rôles système modifiables** (`config/roles.php`, `editable_system_roles` : secrétariat, comptabilité) : l'école peut
  ajuster leurs permissions ; l'ajustement est une ligne `school_roles` avec `system_key`. Promoteur, direction, enseignant
  et parent sont **verrouillés** (sécurité, espaces enseignant et parent) ; ils peuvent être dupliqués.
- **Rôles personnalisés** : lignes `school_roles` (`system_key` nul, nom unique dans l'école, casse ignorée). Une
  affectation les cite par leur identifiant : `role_assignments.role` contient une clé système **ou** un UUID de rôle
  personnalisé de la même école (vérifié à l'enregistrement, avec verrou partagé contre une suppression concurrente).
  Espace : back-office.
- **Calcul des droits** : `RoleCatalog::rolesOf($school)` donne les rôles effectifs ; `Authorizer` (inchangé pour les
  Policies) cherche la permission dans le rôle de chaque affectation, avec la même règle des cycles. Une affectation à un
  rôle inconnu ne donne rien (mode fermé).
- **Pas d'élévation** : on ne peut mettre dans un rôle qu'une permission que l'on détient soi-même **sur toute l'école**
  (seules les permissions ajoutées sont contrôlées). Les permissions des parents (`config/roles.php`,
  `guardian_only_permissions`) ne vont jamais dans un rôle du personnel.
- **Isolation** : `school_roles` a `school_id` et la RLS en mode fermé ; une politique de lecture supplémentaire laisse voir
  les rôles des écoles où l'utilisateur courant a une affectation (calcul de `/me`), jamais les écrire.
  `SchoolRole::ofSchool()` est la seconde exception autorisée au scope « école courante » (test d'architecture).

## Conséquences

- API : `GET/POST /roles`, `PATCH/DELETE /roles/{role}` (clé système ou UUID), `GET /permissions` ; conflits métier en 409
  avec `code` (`role_locked`, `role_in_use`) via `App\Support\Http\BusinessConflict`.
- `/me` renvoie `role` (clé) et `role_name` (nom d'un rôle personnalisé, nul pour un rôle système).
- Ajouter une permission : une ligne dans `config/permissions.php` (rôles système qui la reçoivent par défaut), son libellé
  dans `frontend/src/i18n/fr.json` (`permissions.<clé>`). Elle apparaît dans l'écran des rôles sans autre changement.
- Retirer une permission du catalogue : elle cesse d'être accordée, même si un rôle en base la cite encore.
