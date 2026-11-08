<?php

declare(strict_types=1);

namespace App\Domains\Academic\Actions;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Identity\Models\RoleAssignment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Crée ou modifie une classe : année ouverte, section unique pour ce niveau et cette année, titulaire membre de
 * l'école (un compte d'une autre école est introuvable : même refus).
 */
final class SaveClassroom
{
    /**
     * @param  array{academic_year_id?: string, level_id?: string, section?: string, capacity?: int|null, room?: string|null, homeroom_teacher_id?: string|null}  $attributes
     */
    public function handle(?Classroom $classroom, array $attributes): Classroom
    {
        return DB::transaction(static function () use ($classroom, $attributes): Classroom {
            $classroom ??= new Classroom;
            $classroom->fill($attributes);

            $year = Str::isUuid((string) $classroom->academic_year_id)
                ? AcademicYear::query()->find($classroom->academic_year_id)
                : null;

            if (! $year instanceof AcademicYear) {
                throw ValidationException::withMessages(['academic_year_id' => 'Aucune année scolaire en cours : créez-en une dans les paramètres.']);
            }

            if ($year->status === AcademicYearStatus::Closed && $classroom->isDirty(['academic_year_id', 'level_id', 'section'])) {
                throw ValidationException::withMessages(['academic_year_id' => 'Cette année scolaire est clôturée.']);
            }

            $taken = Classroom::query()
                ->where('academic_year_id', $classroom->academic_year_id)
                ->where('level_id', $classroom->level_id)
                ->where('section', $classroom->section)
                ->when($classroom->exists, static fn ($query) => $query->whereKeyNot($classroom->id))
                ->exists();

            if ($taken) {
                throw ValidationException::withMessages(['section' => 'Cette classe existe déjà pour ce niveau et cette année.']);
            }

            $teacher = $classroom->homeroom_teacher_id;

            if ($teacher !== null && ! RoleAssignment::query()->where('user_id', $teacher)->exists()) {
                throw ValidationException::withMessages(['homeroom_teacher_id' => 'Le titulaire doit être un compte de l’établissement.']);
            }

            $classroom->save();

            return $classroom->load(['level.cycle', 'homeroomTeacher']);
        });
    }
}
