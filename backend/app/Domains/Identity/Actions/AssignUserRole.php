<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Academic\Models\Cycle;
use App\Domains\Identity\Authorization\RoleCatalog;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Tenancy\Models\School;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Affecte un rôle (clé système ou rôle personnalisé de l'école) à un compte, sur un cycle ou toute l'école.
 * Droits : UserPolicy::grantRole (vérifié par la requête). $field : préfixe des erreurs (« roles.0 » à la création).
 */
final readonly class AssignUserRole
{
    public function __construct(private RoleCatalog $catalog) {}

    public function handle(School $school, string $userId, string $role, ?string $cycleId, string $field = ''): RoleAssignment
    {
        $prefix = $field === '' ? '' : $field.'.';

        if (! array_key_exists($role, $this->catalog->rolesOf($school))) {
            throw ValidationException::withMessages([$prefix.'role' => 'Ce rôle n’existe pas dans l’établissement.']);
        }

        if ($cycleId !== null && ! (Str::isUuid($cycleId) && Cycle::query()->whereKey($cycleId)->exists())) {
            throw ValidationException::withMessages([$prefix.'cycle_id' => 'Ce cycle n’existe pas dans l’établissement.']);
        }

        $exists = RoleAssignment::query()
            ->where('user_id', $userId)
            ->where('role', $role)
            ->where('cycle_id', $cycleId)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([$prefix.'role' => 'Ce compte a déjà ce rôle sur ce périmètre.']);
        }

        return RoleAssignment::query()->create(['user_id' => $userId, 'role' => $role, 'cycle_id' => $cycleId]);
    }
}
