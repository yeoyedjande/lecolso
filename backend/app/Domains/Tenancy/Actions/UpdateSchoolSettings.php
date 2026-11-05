<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Actions;

use App\Domains\Tenancy\Models\School;

/** Fusionne des paramètres dans schools.settings de l'école courante (les autres clés sont conservées). */
final class UpdateSchoolSettings
{
    /**
     * @param  array<string, mixed>  $settings
     */
    public function handle(School $school, array $settings): School
    {
        // École courante : autorisé par la RLS (politique current_school_update)
        $school->fill(['settings' => [...$school->settings, ...$settings]])->save();

        return $school;
    }
}
