<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Resources;

use App\Domains\Identity\Data\SchoolMembership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Une école de l'utilisateur : ses rôles (cycle_id null = toute l'école) et ses permissions
 * (valeur null = toute l'école, sinon la liste des cycles concernés).
 *
 * @property-read SchoolMembership $resource
 */
final class SchoolMembershipResource extends JsonResource
{
    /**
     * @return array{id: string, name: string, slug: string, roles: AnonymousResourceCollection, permissions: array<string, list<string>|null>}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->school->id,
            'name' => $this->resource->school->name,
            'slug' => $this->resource->school->slug,
            'roles' => RoleAssignmentResource::collection($this->resource->assignments),
            'permissions' => $this->resource->permissions,
        ];
    }
}
