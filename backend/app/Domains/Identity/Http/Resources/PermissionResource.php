<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Resources;

use App\Domains\Identity\Data\PermissionEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Une permission du catalogue : `group` regroupe les cases de l'écran des rôles ; `staff_assignable` est faux
 * pour les permissions réservées aux parents (jamais dans un rôle du personnel).
 *
 * @property-read PermissionEntry $resource
 */
final class PermissionResource extends JsonResource
{
    /**
     * @return array{key: string, group: string, staff_assignable: bool}
     */
    public function toArray(Request $request): array
    {
        return [
            'key' => $this->resource->key,
            'group' => $this->resource->group,
            'staff_assignable' => $this->resource->staffAssignable,
        ];
    }
}
