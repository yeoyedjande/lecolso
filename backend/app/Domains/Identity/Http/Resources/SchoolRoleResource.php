<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Resources;

use App\Domains\Identity\Data\SchoolRoleSummary;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Un rôle de l'école. `key` : valeur à utiliser dans une affectation (clé système, ou identifiant d'un rôle
 * personnalisé). `name` : nul pour un rôle système (libellé traduit par l'interface).
 *
 * @property-read SchoolRoleSummary $resource
 */
final class SchoolRoleResource extends JsonResource
{
    /**
     * @return array{key: string, name: string|null, description: string|null, is_system: bool, is_editable: bool, permissions: list<string>, assignments_count: int}
     */
    public function toArray(Request $request): array
    {
        $role = $this->resource->role;

        return [
            'key' => $role->key,
            'name' => $role->name,
            'description' => $role->description,
            'is_system' => $role->isSystem,
            'is_editable' => $role->isEditable,
            'permissions' => $role->permissions,
            'assignments_count' => $this->resource->assignmentsCount,
        ];
    }
}
