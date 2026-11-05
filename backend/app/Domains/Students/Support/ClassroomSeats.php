<?php

declare(strict_types=1);

namespace App\Domains\Students\Support;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Domains\Students\Models\Enrollment;
use App\Support\Http\BusinessConflict;

/**
 * Place dans une classe : année ouverte et capacité non atteinte (inscriptions actives d'élèves non supprimés).
 * À appeler dans la transaction qui inscrit l'élève : la classe est verrouillée jusqu'à la fin, deux inscriptions
 * simultanées ne prennent donc jamais la dernière place à elles deux.
 */
final class ClassroomSeats
{
    /**
     * @throws BusinessConflict year_closed, classroom_full
     */
    public function reserve(Classroom $classroom): void
    {
        Classroom::query()->whereKey($classroom->id)->lockForUpdate()->first();

        if ($classroom->academicYear->status === AcademicYearStatus::Closed) {
            throw new BusinessConflict('year_closed', 'Cette année scolaire est clôturée : rouvrez-la pour y inscrire un élève.');
        }

        if ($classroom->capacity !== null && self::taken($classroom) >= $classroom->capacity) {
            throw new BusinessConflict('classroom_full', sprintf('La classe %s est complète (%d places).', $classroom->name(), $classroom->capacity));
        }
    }

    /** Élèves inscrits (inscription active) dans la classe. */
    public static function taken(Classroom $classroom): int
    {
        return Enrollment::query()
            ->where('classroom_id', $classroom->id)
            ->where('status', EnrollmentStatus::Active)
            ->whereHas('student')
            ->count();
    }
}
