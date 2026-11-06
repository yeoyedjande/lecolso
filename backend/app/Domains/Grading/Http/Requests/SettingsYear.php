<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

use App\Domains\Academic\Models\AcademicYear;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** Année des réglages : celle demandée (422 si inconnue), sinon l'année en cours (409 no_current_year). */
final class SettingsYear
{
    public static function resolve(mixed $id, bool $required): AcademicYear
    {
        if (is_string($id) && $id !== '') {
            $year = Str::isUuid($id) ? AcademicYear::query()->find($id) : null;

            return $year ?? throw ValidationException::withMessages(['academic_year_id' => 'Année scolaire inconnue.']);
        }
        if ($required) {
            throw ValidationException::withMessages(['academic_year_id' => 'Indiquez l’année scolaire.']);
        }

        return AcademicYear::query()->where('is_current', true)->first()
            ?? throw new BusinessConflict('no_current_year', 'Aucune année scolaire n’est en cours.');
    }
}
