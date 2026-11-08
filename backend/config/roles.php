<?php

declare(strict_types=1);

/*
| Rôles d'établissement (décision du 04/11/2026, docs/decisions-metier.md).
|
| - Rôles système (App\Domains\Identity\Enums\Role) : toujours présents dans chaque école, permissions par défaut dans
|   config/permissions.php. Seuls ceux de editable_system_roles peuvent être ajustés par l'école ; les autres sont
|   liés aux espaces (enseignant, parent) ou à la sécurité (promoteur, direction). Tous peuvent être dupliqués.
| - Rôles personnalisés : créés par l'école (table school_roles), espace back-office.
*/

return [
    'editable_system_roles' => ['secretary', 'accountant'],

    // Permissions propres aux parents (leurs enfants, leurs paiements) : jamais dans un rôle du personnel
    'guardian_only_permissions' => ['billing.pay', 'attendance.justify'],
];
