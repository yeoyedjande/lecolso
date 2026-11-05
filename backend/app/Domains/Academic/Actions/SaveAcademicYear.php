<?php

declare(strict_types=1);

namespace App\Domains\Academic\Actions;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\AcademicYear;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Crée ou modifie une année scolaire. Une seule année est en cours : en désigner une retire l'indicateur des autres
 * (même transaction, index unique en base). L'année en cours ne se clôture pas (409 current_year) : on en désigne
 * d'abord une autre ; une année clôturée ne devient pas l'année en cours.
 */
final class SaveAcademicYear
{
    /**
     * @param  array{label?: string, starts_on?: string, ends_on?: string, status?: AcademicYearStatus, is_current?: bool}  $attributes
     */
    public function handle(?AcademicYear $year, array $attributes): AcademicYear
    {
        return DB::transaction(static function () use ($year, $attributes): AcademicYear {
            $year ??= new AcademicYear(['status' => AcademicYearStatus::Open, 'is_current' => false]);
            $year->fill($attributes);

            if ($year->status === AcademicYearStatus::Closed && $year->is_current) {
                throw new BusinessConflict('current_year', 'L’année en cours ne peut pas être clôturée : désignez d’abord une autre année en cours.');
            }

            if ($year->ends_on->lessThanOrEqualTo($year->starts_on)) {
                throw ValidationException::withMessages(['ends_on' => 'La fin de l’année doit suivre son début.']);
            }

            $others = static fn () => AcademicYear::query()->when($year->exists, static fn ($query) => $query->whereKeyNot($year->id));

            if ($others()->where('label', $year->label)->exists()) {
                throw ValidationException::withMessages(['label' => 'Cette année scolaire existe déjà.']);
            }

            if ($year->is_current && $year->isDirty('is_current')) {
                $others()->where('is_current', true)->update(['is_current' => false]);
            }

            $year->save();

            return $year;
        });
    }
}
