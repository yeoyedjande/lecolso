<?php

declare(strict_types=1);

namespace App\Domains\Students\Actions;

use App\Domains\Students\Data\NewEnrollment;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Domains\Students\Events\StudentEnrolled;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\GuardianLink;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\ClassroomSeats;
use App\Domains\Students\Support\GuardianDirectory;
use App\Domains\Tenancy\Models\School;
use App\Support\Http\BusinessConflict;
use App\Support\Sequences\Sequence;
use Illuminate\Support\Facades\DB;

/**
 * Inscription d'un nouvel élève, en une transaction : place dans la classe (année ouverte, capacité), dossier et
 * matricule « LAU-000123 » (compteur de l'école, verrouillé jusqu'à la fin), tuteurs (réutilisés par téléphone),
 * liens et inscription de l'année de la classe.
 */
final readonly class EnrollStudent
{
    public function __construct(
        private ClassroomSeats $seats,
        private GuardianDirectory $guardians,
        private Sequence $sequence,
    ) {}

    /**
     * @throws BusinessConflict year_closed, classroom_full
     */
    public function handle(School $school, NewEnrollment $data): Student
    {
        $student = DB::transaction(function () use ($school, $data): Student {
            $this->seats->reserve($data->classroom);

            $student = new Student([
                'first_name' => $data->firstName,
                'last_name' => $data->lastName,
                'gender' => $data->gender,
                'birth_date' => $data->birthDate,
                'birth_place' => $data->birthPlace,
                'address' => $data->address,
                'blood_type' => $data->bloodType,
                'allergies' => $data->allergies,
                'medical_notes' => $data->medicalNotes,
            ]);
            $student->matricule = self::matricule($school, $this->sequence->next(Sequence::STUDENT_MATRICULE));
            $student->save();

            foreach ($data->guardians as $input) {
                GuardianLink::query()->create([
                    'guardian_id' => $this->guardians->findOrCreate($input)->id,
                    'student_id' => $student->id,
                    'relation' => $input->relation,
                    'is_primary_contact' => $input->isPrimaryContact,
                    'is_payer' => $input->isPayer,
                    'can_pick_up' => $input->canPickUp,
                ]);
            }

            Enrollment::query()->create([
                'student_id' => $student->id,
                'academic_year_id' => $data->classroom->academic_year_id,
                'classroom_id' => $data->classroom->id,
                'status' => EnrollmentStatus::Active,
                'enrolled_on' => $data->enrolledOn,
            ]);

            return $student;
        });

        $enrollment = $student->enrollments()->firstOrFail();
        StudentEnrolled::dispatch($school->id, $student->id, $enrollment->id);

        return $student;
    }

    /** « LAU-000123 » : préfixe de l'école et numéro sur 6 chiffres (au-delà, le numéro s'allonge). */
    public static function matricule(School $school, int $number): string
    {
        return $school->code.'-'.str_pad((string) $number, 6, '0', STR_PAD_LEFT);
    }
}
