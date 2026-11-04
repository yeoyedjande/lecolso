<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\SchoolRoleSummary;
use App\Domains\Identity\Models\SchoolRole;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use App\Support\Http\BusinessConflict;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use LogicException;

/**
 * Modifie un rôle de l'école courante :
 * - rôle personnalisé : nom, description, permissions ;
 * - rôle système modifiable (config/roles.php) : permissions seulement, enregistrées comme ajustement de l'école ;
 * - autre rôle système : 409 role_locked.
 * Les permissions ajoutées sont validées sans élévation ; l'effet est immédiat pour les utilisateurs du rôle.
 */
final readonly class UpdateSchoolRole
{
    public function __construct(
        private ValidateRolePermissions $validatePermissions,
        private ListSchoolRoles $listRoles,
    ) {}

    /**
     * @param  list<string>|null  $permissions
     */
    public function handle(
        User $actor,
        School $school,
        string $key,
        ?string $name,
        ?string $description,
        bool $descriptionGiven,
        ?array $permissions,
    ): SchoolRoleSummary {
        $current = $this->listRoles->find($school, $key) ?? throw (new ModelNotFoundException)->setModel(SchoolRole::class, [$key]);
        $role = $current->role;

        if (! $role->isEditable) {
            throw new BusinessConflict('role_locked', 'Ce rôle système ne peut pas être modifié. Dupliquez-le pour créer une variante.');
        }

        if ($role->isSystem && ($name !== null || $descriptionGiven)) {
            throw ValidationException::withMessages(['name' => 'Le nom et la description d’un rôle système ne peuvent pas être modifiés.']);
        }

        $validated = $permissions === null
            ? null
            : $this->validatePermissions->handle($actor, $school, $permissions, $role->permissions);

        DB::transaction(static function () use ($role, $name, $description, $descriptionGiven, $validated): void {
            if ($role->isSystem) {
                if ($validated !== null) {
                    SchoolRole::query()->updateOrCreate(['system_key' => $role->key], ['permissions' => $validated]);
                }

                return;
            }

            $row = SchoolRole::query()->whereNull('system_key')->findOrFail($role->key);

            if ($name !== null && SchoolRole::query()->whereNull('system_key')->whereKeyNot($row->id)
                ->whereRaw('lower(name) = lower(?)', [$name])->exists()) {
                throw ValidationException::withMessages(['name' => 'Un rôle porte déjà ce nom dans l’école.']);
            }

            $row->fill(array_filter([
                'name' => $name,
                'permissions' => $validated,
            ], static fn (mixed $value): bool => $value !== null));

            if ($descriptionGiven) {
                $row->description = $description;
            }

            $row->save();
        });

        return $this->listRoles->find($school, $key) ?? throw new LogicException('Rôle modifié introuvable.');
    }
}
