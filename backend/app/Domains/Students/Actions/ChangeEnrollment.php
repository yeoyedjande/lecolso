<?php

declare(strict_types=1);

namespace App\Domains\Students\Actions;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Domains\Students\Events\StudentLeft;
use App\Domains\Students\Events\StudentReturned;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Support\ClassroomSeats;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Facades\DB;

/**
 * Changement de classe (même année), départ (date et motif) ou retour d'un élève parti. Année clôturée : rien ne change.
 */
final readonly class ChangeEnrollment
{
    public function __construct(private ClassroomSeats $seats) {}

    /**
     * @throws BusinessConflict year_closed, classroom_full, other_year
     */
    public function moveTo(Enrollment $enrollment, Classroom $classroom): Enrollment
    {
        if ($classroom->academic_year_id !== $enrollment->academic_year_id) {
            throw new BusinessConflict('other_year', 'La nouvelle classe doit appartenir à la même année scolaire.');
        }

        if ($classroom->id === $enrollment->classroom_id) {
            return $enrollment;
        }

        return DB::transaction(function () use ($enrollment, $classroom): Enrollment {
            if ($enrollment->status === EnrollmentStatus::Active) {
                $this->seats->reserve($classroom);
            } else {
                self::assertOpen($enrollment);
            }

            $enrollment->fill(['classroom_id' => $classroom->id])->save();

            return $enrollment;
        });
    }

    /**
     * @throws BusinessConflict year_closed
     */
    public function leave(Enrollment $enrollment, string $leftOn, ?string $reason): Enrollment
    {
        self::assertOpen($enrollment);

        // Même transaction que les conséquences du départ (facture : Billing\Listeners\ApplyDeparture)
        return DB::transaction(static function () use ($enrollment, $leftOn, $reason): Enrollment {
            $enrollment->fill(['status' => EnrollmentStatus::Left, 'left_on' => $leftOn, 'leave_reason' => $reason])->save();
            StudentLeft::dispatch($enrollment->school_id, $enrollment->id);

            return $enrollment;
        });
    }

    /**
     * @throws BusinessConflict year_closed, classroom_full
     */
    public function return(Enrollment $enrollment): Enrollment
    {
        if ($enrollment->status === EnrollmentStatus::Active) {
            return $enrollment;
        }

        return DB::transaction(function () use ($enrollment): Enrollment {
            $this->seats->reserve($enrollment->classroom);
            $enrollment->fill(['status' => EnrollmentStatus::Active, 'left_on' => null, 'leave_reason' => null])->save();
            StudentReturned::dispatch($enrollment->school_id, $enrollment->id);

            return $enrollment;
        });
    }

    private static function assertOpen(Enrollment $enrollment): void
    {
        if ($enrollment->academicYear->status === AcademicYearStatus::Closed) {
            throw new BusinessConflict('year_closed', 'Cette année scolaire est clôturée : l’inscription ne peut plus changer.');
        }
    }
}
