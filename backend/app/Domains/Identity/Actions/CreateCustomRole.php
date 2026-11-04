<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\SchoolRoleSummary;
use App\Domains\Identity\Models\SchoolRole;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use LogicException;

/** Crée un rôle personnalisé dans l'école courante (nom unique, permissions validées sans élévation). */
final readonly class CreateCustomRole
{
    public function __construct(
        private ValidateRolePermissions $validatePermissions,
        private ListSchoolRoles $listRoles,
    ) {}

    /**
     * @param  list<string>  $permissions
     */
    public function handle(User $actor, School $school, string $name, ?string $description, array $permissions): SchoolRoleSummary
    {
        $permissions = $this->validatePermissions->handle($actor, $school, $permissions);

        $role = DB::transaction(static function () use ($name, $description, $permissions): SchoolRole {
            if (SchoolRole::query()->whereNull('system_key')->whereRaw('lower(name) = lower(?)', [$name])->exists()) {
                throw ValidationException::withMessages(['name' => 'Un rôle porte déjà ce nom dans l’école.']);
            }

            return SchoolRole::query()->create([
                'name' => $name,
                'description' => $description,
                'permissions' => $permissions,
            ]);
        });

        return $this->listRoles->find($school, $role->id)
            ?? throw new LogicException('Rôle créé introuvable.');
    }
}
