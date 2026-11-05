<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Resources;

use App\Domains\Students\Models\GuardianLink;
use App\Domains\Students\Support\PersonPhoto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Tuteur d'un élève : `id` est celui du tuteur (partagé par la fratrie), les indicateurs ceux du lien avec cet élève.
 *
 * @property-read GuardianLink $resource
 */
final class GuardianLinkResource extends JsonResource
{
    /**
     * @return array{id: string, name: string, phone: string, email: string|null, profession: string|null, photo_url: string|null, relation: string, is_primary_contact: bool, is_payer: bool, can_pick_up: bool}
     */
    public function toArray(Request $request): array
    {
        $link = $this->resource;

        return [
            'id' => $link->guardian->id,
            'name' => $link->guardian->name,
            'phone' => $link->guardian->phone,
            'email' => $link->guardian->email,
            'profession' => $link->guardian->profession,
            'photo_url' => app(PersonPhoto::class)->url($link->guardian->photo_path),
            'relation' => $link->relation->value,
            'is_primary_contact' => $link->is_primary_contact,
            'is_payer' => $link->is_payer,
            'can_pick_up' => $link->can_pick_up,
        ];
    }
}
