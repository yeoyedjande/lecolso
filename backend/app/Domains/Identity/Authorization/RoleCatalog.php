<?php

declare(strict_types=1);

namespace App\Domains\Identity\Authorization;

use App\Domains\Identity\Data\EffectiveRole;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\SchoolRole;
use App\Domains\Tenancy\Models\School;
use Illuminate\Contracts\Config\Repository as Config;
use InvalidArgumentException;

/**
 * Catalogue des permissions (config/permissions.php) et rôles effectifs d'une école :
 * rôles système (permissions par défaut, ou ajustées par l'école pour ceux de config/roles.php)
 * puis rôles personnalisés de l'école (table school_roles).
 */
final readonly class RoleCatalog
{
    public function __construct(private Config $config) {}

    /**
     * Toutes les permissions connues, dans l'ordre du catalogue.
     *
     * @return list<string>
     */
    public function permissions(): array
    {
        return array_keys($this->matrix());
    }

    public function assertKnownPermission(string $permission): void
    {
        if (! array_key_exists($permission, $this->matrix())) {
            throw new InvalidArgumentException("Permission inconnue : {$permission} (config/permissions.php)");
        }
    }

    /** Groupe d'une permission (écran des rôles) : préfixe avant le premier point (« billing.manage » → « billing »). */
    public function group(string $permission): string
    {
        return explode('.', $permission, 2)[0];
    }

    /** Permission réservée aux parents (leurs enfants, leurs paiements), jamais dans un rôle du personnel. */
    public function isGuardianOnly(string $permission): bool
    {
        return in_array($permission, $this->guardianOnly(), true);
    }

    public function isEditableSystemRole(Role $role): bool
    {
        /** @var list<string> $editable */
        $editable = $this->config->array('roles.editable_system_roles');

        return in_array($role->value, $editable, true);
    }

    /**
     * Rôles effectifs d'une école, indexés par clé (valeur de role_assignments.role) :
     * rôles système dans l'ordre de l'énumération, puis rôles personnalisés par nom.
     *
     * @return array<string, EffectiveRole>
     */
    public function rolesOf(School|string $school): array
    {
        $rows = SchoolRole::ofSchool($school instanceof School ? $school->id : $school)->get();
        $overrides = $rows->filter(static fn (SchoolRole $row): bool => ! $row->isCustom())->keyBy('system_key');
        $roles = [];

        foreach (Role::cases() as $role) {
            if (! $role->isAssignableToSchool()) {
                continue;
            }

            $editable = $this->isEditableSystemRole($role);
            $override = $editable ? $overrides->get($role->value) : null;

            $roles[$role->value] = new EffectiveRole(
                key: $role->value,
                name: null,
                description: null,
                isSystem: true,
                isEditable: $editable,
                permissions: $override instanceof SchoolRole
                    ? $this->known($override->permissions)
                    : $this->defaultPermissions($role),
            );
        }

        $custom = $rows->filter(static fn (SchoolRole $row): bool => $row->isCustom())
            ->sortBy(static fn (SchoolRole $row): string => mb_strtolower((string) $row->name));

        foreach ($custom as $row) {
            $roles[$row->id] = new EffectiveRole(
                key: $row->id,
                name: $row->name,
                description: $row->description,
                isSystem: false,
                isEditable: true,
                permissions: $this->known($row->permissions),
            );
        }

        return $roles;
    }

    /**
     * Permissions par défaut d'un rôle système (config/permissions.php).
     *
     * @return list<string>
     */
    public function defaultPermissions(Role $role): array
    {
        $permissions = [];

        foreach ($this->matrix() as $permission => $roles) {
            if (in_array($role->value, $roles, true)) {
                $permissions[] = $permission;
            }
        }

        return $permissions;
    }

    /**
     * Permissions connues uniquement, dans l'ordre du catalogue (une permission retirée du code ne donne plus rien).
     *
     * @param  list<string>  $permissions
     * @return list<string>
     */
    private function known(array $permissions): array
    {
        return array_values(array_filter(
            $this->permissions(),
            static fn (string $permission): bool => in_array($permission, $permissions, true),
        ));
    }

    /**
     * @return list<string>
     */
    private function guardianOnly(): array
    {
        /** @var list<string> $permissions */
        $permissions = $this->config->array('roles.guardian_only_permissions');

        return $permissions;
    }

    /**
     * @return array<string, list<string>>
     */
    private function matrix(): array
    {
        /** @var array<string, list<string>> $matrix */
        $matrix = $this->config->array('permissions');

        return $matrix;
    }
}
