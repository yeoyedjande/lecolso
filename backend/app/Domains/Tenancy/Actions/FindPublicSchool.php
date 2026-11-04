<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Actions;

use App\Domains\Tenancy\Data\PublicSchoolProfile;
use Illuminate\Support\Facades\DB;

/** Page publique d'une école : lecture par la fonction SECURITY DEFINER public_school_profile (hors RLS, données publiques). */
final class FindPublicSchool
{
    public function handle(string $slug): ?PublicSchoolProfile
    {
        // SQL brut justifié : appel de la fonction public_school_profile, seule lecture publique autorisée
        // (elle ne renvoie ni identifiant ni donnée personnelle ; la RLS des tables reste fermée)
        $row = DB::selectOne('SELECT name, slug, city, type, cycles FROM public_school_profile(?)', [$slug]);

        if (! is_object($row)) {
            return null;
        }

        /** @var object{name: string, slug: string, city: string|null, type: string, cycles: string} $row */
        /** @var list<array{code: string, name: string, levels: list<string>}> $cycles */
        $cycles = json_decode($row->cycles, true, flags: JSON_THROW_ON_ERROR);

        return new PublicSchoolProfile($row->name, $row->slug, $row->city, $row->type, $cycles);
    }
}
