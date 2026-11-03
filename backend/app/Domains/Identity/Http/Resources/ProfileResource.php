<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Resources;

use App\Domains\Identity\Data\Profile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read Profile $resource
 */
final class ProfileResource extends JsonResource
{
    public function __construct(Profile $resource)
    {
        parent::__construct($resource);
    }

    /**
     * @return array{id: string, name: string, phone: string, email: string|null, must_change_password: bool, is_super_admin: bool, can_be_remembered: bool, schools: AnonymousResourceCollection}
     */
    public function toArray(Request $request): array
    {
        $user = $this->resource->user;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'phone' => $user->phone,
            'email' => $user->email,
            'must_change_password' => $user->must_change_password,
            'is_super_admin' => $user->isSuperAdmin(),
            // « Se souvenir de moi » proposé (comptes sans rôle du personnel)
            'can_be_remembered' => $user->canBeRemembered(),
            'schools' => SchoolMembershipResource::collection($this->resource->schools),
        ];
    }
}
