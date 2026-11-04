<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Resources;

use App\Domains\Identity\Data\SchoolUser;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Un compte de l'école courante. `active` : faux s'il est désactivé dans cette école. `can_manage` : l'utilisateur
 * connecté peut le modifier, le désactiver ou le supprimer (cycles, hiérarchie, jamais soi-même).
 *
 * @property-read SchoolUser $resource
 */
final class SchoolUserResource extends JsonResource
{
    /**
     * @return array{id: string, name: string, phone: string, email: string|null, active: bool, must_change_password: bool, last_login_at: string|null, roles: AnonymousResourceCollection, can_manage: bool}
     */
    public function toArray(Request $request): array
    {
        $user = $this->resource->user;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'phone' => $user->phone,
            'email' => $user->email,
            'active' => $this->resource->active,
            'must_change_password' => $user->must_change_password,
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'roles' => UserAssignmentResource::collection($this->resource->assignments),
            'can_manage' => $this->resource->canManage,
        ];
    }
}
