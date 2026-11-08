<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Resources;

use App\Domains\Identity\Data\UserAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Une affectation d'un compte : `id` (pour la retirer), `role` (clé), `role_name` (rôle personnalisé, sinon null),
 * `cycle_id` (null = toute l'école).
 *
 * @property-read UserAssignment $resource
 */
final class UserAssignmentResource extends JsonResource
{
    /**
     * @return array{id: string, role: string, role_name: string|null, cycle_id: string|null}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'role' => $this->resource->role,
            'role_name' => $this->resource->roleName,
            'cycle_id' => $this->resource->cycleId,
        ];
    }
}
