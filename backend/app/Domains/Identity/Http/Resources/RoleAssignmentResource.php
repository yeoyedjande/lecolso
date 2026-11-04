<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Resources;

use App\Domains\Identity\Models\RoleAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Un rôle dans une école : cycle_id null = toute l'école.
 *
 * @property-read RoleAssignment $resource
 */
final class RoleAssignmentResource extends JsonResource
{
    /**
     * @return array{role: string, cycle_id: string|null}
     */
    public function toArray(Request $request): array
    {
        return [
            'role' => $this->resource->role,
            'cycle_id' => $this->resource->cycle_id,
        ];
    }
}
