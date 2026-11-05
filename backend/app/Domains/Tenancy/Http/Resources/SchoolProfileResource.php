<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Resources;

use App\Domains\Tenancy\Models\School;
use App\Domains\Tenancy\Support\SchoolLogo;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Identité de l'école courante. `logo_url` : URL signée de lecture, valable 30 minutes (null sans logo).
 *
 * @property-read School $resource
 */
final class SchoolProfileResource extends JsonResource
{
    /**
     * @return array{id: string, name: string, slug: string, type: string, city: string|null, address: string|null, phone: string|null, email: string|null, motto: string|null, currency: string, logo_url: string|null}
     */
    public function toArray(Request $request): array
    {
        $school = $this->resource;

        return [
            'id' => $school->id,
            'name' => $school->name,
            'slug' => $school->slug,
            'type' => $school->type->value,
            'city' => $school->city,
            'address' => $school->address,
            'phone' => $school->phone,
            'email' => $school->email,
            'motto' => $school->motto,
            'currency' => $school->currency,
            'logo_url' => $this->logoUrl($school->logo_path),
        ];
    }

    /** URL signée du logo (30 minutes), ou null sans logo. */
    private function logoUrl(?string $path): ?string
    {
        return app(SchoolLogo::class)->url($path);
    }
}
