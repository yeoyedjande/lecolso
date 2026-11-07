<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Actions;

use App\Domains\Tenancy\Data\PublicSchoolProfile;
use Illuminate\Support\Facades\DB;

/** Page publique d'une école : lecture par la fonction SECURITY DEFINER public_school_page (hors RLS, données publiques). */
final class FindPublicSchool
{
    public function handle(string $slug): ?PublicSchoolProfile
    {
        // SQL brut justifié : appel de la fonction public_school_page, seule lecture publique autorisée
        // (elle ne renvoie ni identifiant ni donnée personnelle ; la RLS des tables reste fermée)
        $row = DB::selectOne(
            'SELECT name, slug, city, type, address, phone, email, motto, logo_path, cycles FROM public_school_page(?)',
            [$slug],
        );

        if (! is_object($row)) {
            return null;
        }

        /** @var object{name: string, slug: string, city: string|null, type: string, address: string|null, phone: string|null, email: string|null, motto: string|null, logo_path: string|null, cycles: string} $row */
        /** @var list<array{code: string, name: string, levels: list<array{code: string, name: string}>}> $cycles */
        $cycles = json_decode($row->cycles, true, flags: JSON_THROW_ON_ERROR);

        return new PublicSchoolProfile(
            $row->name,
            $row->slug,
            $row->city,
            $row->type,
            $cycles,
            address: $row->address,
            phone: $row->phone,
            email: $row->email,
            motto: $row->motto,
            logoPath: $row->logo_path,
        );
    }
}
