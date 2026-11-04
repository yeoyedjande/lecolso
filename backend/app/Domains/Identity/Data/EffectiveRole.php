<?php

declare(strict_types=1);

namespace App\Domains\Identity\Data;

/**
 * Rôle tel qu'il s'applique dans une école : rôle système (clé de App\Domains\Identity\Enums\Role, permissions
 * par défaut ou ajustées par l'école) ou rôle personnalisé (clé = identifiant de la ligne school_roles).
 * La clé est la valeur de role_assignments.role.
 */
final readonly class EffectiveRole
{
    /**
     * @param  list<string>  $permissions
     */
    public function __construct(
        public string $key,
        public ?string $name,
        public ?string $description,
        public bool $isSystem,
        public bool $isEditable,
        public array $permissions,
    ) {}

    public function grants(string $permission): bool
    {
        return in_array($permission, $this->permissions, true);
    }
}
