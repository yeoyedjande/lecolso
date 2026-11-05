<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Actions;

use App\Domains\Tenancy\Models\School;

/** Modifie l'identité de l'école courante : nom, ville, adresse, téléphone, e-mail, devise (champs fournis seulement). */
final class UpdateSchoolProfile
{
    /**
     * @param  array{name?: string, city?: string|null, address?: string|null, phone?: string|null, email?: string|null, motto?: string|null}  $attributes
     */
    public function handle(School $school, array $attributes): School
    {
        // École courante : autorisé par la RLS (politique current_school_update)
        $school->fill($attributes)->save();

        return $school;
    }
}
