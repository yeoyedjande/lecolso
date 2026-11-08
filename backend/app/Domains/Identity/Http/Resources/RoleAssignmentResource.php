<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Resources;

use App\Domains\Identity\Data\MembershipRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Un rôle dans une école : `role` = clé système ou identifiant d'un rôle personnalisé ; `role_name` = nom du rôle
 * personnalisé (null pour un rôle système) ; cycle_id null = toute l'école.
 *
 * @property-read MembershipRole $resource
 */
final class RoleAssignmentResource extends JsonResource
{
    /**
     * @return array{role: string, role_name: string|null, cycle_id: string|null}
     */
    public function toArray(Request $request): array
    {
        return [
            'role' => $this->resource->role,
            'role_name' => $this->resource->roleName,
            'cycle_id' => $this->resource->cycleId,
        ];
    }
}
