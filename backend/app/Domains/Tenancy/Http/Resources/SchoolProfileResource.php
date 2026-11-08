<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Resources;

use App\Domains\Tenancy\Actions\UpdateSchoolProfile;
use App\Domains\Tenancy\Models\School;
use App\Domains\Tenancy\Support\SchoolLogo;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Identité de l'école courante. `code` : préfixe des matricules (« LAU »), modifiable tant que `code_locked` est faux
 * (aucun matricule émis). `logo_url` : URL signée de lecture, valable 30 minutes (null sans logo). `public_fees` :
 * tarifs de l'année en cours publiés sur la page publique.
 *
 * @property-read School $resource
 */
final class SchoolProfileResource extends JsonResource
{
    /**
     * @return array{id: string, name: string, slug: string, code: string, code_locked: bool, type: string, city: string|null, address: string|null, phone: string|null, email: string|null, motto: string|null, currency: string, logo_url: string|null, public_fees: bool}
     */
    public function toArray(Request $request): array
    {
        $school = $this->resource;

        return [
            'id' => $school->id,
            'name' => $school->name,
            'slug' => $school->slug,
            'code' => $school->code,
            'code_locked' => UpdateSchoolProfile::codeLocked(),
            'type' => $school->type->value,
            'city' => $school->city,
            'address' => $school->address,
            'phone' => $school->phone,
            'email' => $school->email,
            'motto' => $school->motto,
            'currency' => $school->currency,
            'logo_url' => $this->logoUrl($school->logo_path),
            'public_fees' => ($school->settings['public_fees'] ?? false) === true,
        ];
    }

    /** URL signée du logo (30 minutes), ou null sans logo. */
    private function logoUrl(?string $path): ?string
    {
        return app(SchoolLogo::class)->url($path);
    }
}
