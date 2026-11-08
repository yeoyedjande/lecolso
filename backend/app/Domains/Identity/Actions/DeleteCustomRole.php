<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\SchoolRole;
use App\Support\Http\BusinessConflict;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Supprime un rôle personnalisé de l'école courante.
 * 409 role_locked pour un rôle système ; 409 role_in_use s'il est encore attribué (retirer d'abord les affectations).
 */
final class DeleteCustomRole
{
    public function handle(string $key): void
    {
        if (Role::tryFrom($key) !== null) {
            throw new BusinessConflict('role_locked', 'Un rôle système ne peut pas être supprimé.');
        }

        if (! Str::isUuid($key)) {
            throw (new ModelNotFoundException)->setModel(SchoolRole::class, [$key]);
        }

        DB::transaction(static function () use ($key): void {
            // Verrou : aucune affectation ne peut citer le rôle pendant sa suppression
            $role = SchoolRole::query()->whereNull('system_key')->lockForUpdate()->findOrFail($key);

            if (RoleAssignment::query()->where('role', $role->id)->exists()) {
                throw new BusinessConflict('role_in_use', 'Ce rôle est encore attribué. Retirez-le d’abord aux utilisateurs concernés.');
            }

            $role->delete();
        });
    }
}
