<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Resources;

use App\Domains\Messaging\Contracts\SmsSender;
use App\Domains\Tenancy\Data\PublicSchoolProfile;
use App\Domains\Tenancy\Support\SchoolLogo;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read PublicSchoolProfile $resource
 */
final class PublicSchoolResource extends JsonResource
{
    /**
     * @return array{name: string, slug: string, city: string|null, type: string, address: string|null, phone: string|null, email: string|null, motto: string|null, logo_url: string|null, cycles: list<array{code: string, name: string, levels: list<array{code: string, name: string}>}>, sms_available: bool}
     */
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->resource->name,
            'slug' => $this->resource->slug,
            'city' => $this->resource->city,
            'type' => $this->resource->type,
            'address' => $this->resource->address,
            'phone' => $this->resource->phone,
            'email' => $this->resource->email,
            'motto' => $this->resource->motto,
            'logo_url' => $this->logoUrl($this->resource->logoPath),
            'cycles' => $this->resource->cycles,
            // Un fournisseur SMS est configuré : sinon, le formulaire de pré-inscription ne promet aucun SMS
            'sms_available' => app(SmsSender::class)->available() === true,
        ];
    }

    /** URL signée du logo (30 minutes), ou null sans logo. */
    private function logoUrl(?string $path): ?string
    {
        return app(SchoolLogo::class)->url($path);
    }
}
