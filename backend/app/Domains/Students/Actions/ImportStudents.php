<?php

declare(strict_types=1);

namespace App\Domains\Students\Actions;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Billing\Actions\CreateInvoice;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Data\GuardianInput;
use App\Domains\Students\Data\ImportCounts;
use App\Domains\Students\Data\ImportRow;
use App\Domains\Students\Data\ImportRowResult;
use App\Domains\Students\Data\NewEnrollment;
use App\Domains\Students\Enums\Gender;
use App\Domains\Students\Enums\GuardianRelation;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\ClassroomSeats;
use App\Domains\Tenancy\Models\School;
use App\Support\Http\BusinessConflict;
use App\Support\Phone\Phone;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Import d'élèves depuis un fichier Excel lu par le navigateur. Chaque ligne est vérifiée (champs, classe de l'année en
 * cours et droit d'y inscrire, places comptées sur tout le lot, doublon dans le lot) ; un élève déjà inscrit dans
 * l'école (même nom, prénom et date de naissance) est ignoré (`skipped`), si bien que relancer le même fichier ne crée
 * aucun doublon, même pour deux imports simultanés (verrou par école et identité, vérification refaite dans la
 * transaction). En vérification (`$dryRun`), rien n'est écrit ; sinon chaque ligne valide est inscrite comme une
 * inscription manuelle (EnrollStudent puis CreateInvoice, dans sa propre transaction) : une ligne refusée n'empêche
 * pas les autres. Aucune donnée d'élève n'est journalisée.
 */
final readonly class ImportStudents
{
    public const int MAX_ROWS = 500;

    public function __construct(
        private EnrollStudent $enroll,
        private CreateInvoice $createInvoice,
    ) {}

    /**
     * @param  list<ImportRow>  $rows
     * @return list<ImportRowResult>
     */
    public function handle(User $user, School $school, array $rows, bool $dryRun, Carbon $now): array
    {
        $classrooms = Classroom::query()
            ->whereHas('academicYear', static fn ($year) => $year->where('is_current', true))
            ->with(['level', 'academicYear'])
            ->get()
            ->keyBy(static fn (Classroom $classroom): string => self::key($classroom->name()));
        // Places prises par les lignes précédentes du lot, par classe (vérification)
        $planned = [];
        $seen = [];
        $today = $now->copy()->setTimezone('Africa/Abidjan')->toDateString();
        $results = [];

        foreach ($rows as $row) {
            $errors = [];
            $lastName = trim($row->lastName);
            $firstName = trim($row->firstName);
            $gender = Gender::tryFrom($row->gender);
            $birthDate = self::date($row->birthDate, $today);
            $phone = Phone::normalize($row->guardianPhone);
            $classroom = $classrooms->get(self::key($row->classroom));

            if (mb_strlen($lastName) < 1) {
                $errors[] = 'last_name';
            }
            if (mb_strlen($firstName) < 1) {
                $errors[] = 'first_name';
            }
            if ($gender === null) {
                $errors[] = 'gender';
            }
            if ($birthDate === null) {
                $errors[] = 'birth_date';
            }
            if (! $classroom instanceof Classroom || ! $user->can('enrollIn', [Student::class, $classroom])) {
                $classroom = null;
                $errors[] = 'classroom';
            } elseif ($classroom->academicYear->status === AcademicYearStatus::Closed) {
                $errors[] = 'year_closed';
            }
            if (mb_strlen(trim($row->guardianName)) < 2) {
                $errors[] = 'guardian';
            }
            if ($phone === null) {
                $errors[] = 'phone';
            }

            $identity = self::key($lastName.'|'.$firstName.'|'.($birthDate ?? ''));
            if (isset($seen[$identity])) {
                $errors[] = 'duplicate';
            }
            $seen[$identity] = true;

            if ($errors === [] && $birthDate !== null && self::alreadyEnrolled($lastName, $firstName, $birthDate)) {
                $results[] = new ImportRowResult($row->line, 'skipped');

                continue;
            }
            if ($errors === [] && $classroom !== null && $classroom->capacity !== null) {
                $taken = ClassroomSeats::taken($classroom) + ($dryRun ? ($planned[$classroom->id] ?? 0) : 0);
                if ($taken >= $classroom->capacity) {
                    $errors[] = 'classroom_full';
                }
            }
            if ($errors !== [] || $classroom === null || $gender === null || $birthDate === null || $phone === null) {
                $results[] = new ImportRowResult($row->line, 'error', $errors);

                continue;
            }

            if ($dryRun) {
                $planned[$classroom->id] = ($planned[$classroom->id] ?? 0) + 1;
                $results[] = new ImportRowResult($row->line, 'ready');

                continue;
            }

            $enrollment = new NewEnrollment(
                firstName: $firstName,
                lastName: $lastName,
                gender: $gender,
                birthDate: $birthDate,
                birthPlace: null,
                address: self::nullable($row->address),
                bloodType: null,
                allergies: null,
                medicalNotes: null,
                classroom: $classroom,
                enrolledOn: $today,
                guardians: [new GuardianInput(
                    name: trim($row->guardianName),
                    phone: $phone,
                    email: null,
                    profession: null,
                    relation: self::relation($row->guardianRelation),
                    isPrimaryContact: true,
                    isPayer: true,
                    canPickUp: true,
                )],
            );
            try {
                $student = DB::transaction(function () use ($school, $enrollment, $identity): ?Student {
                    // Deux imports simultanés du même élève (deux personnes, ou un nouvel essai pendant que la
                    // première requête tourne encore) : verrou consultatif par école et identité, puis nouvelle
                    // vérification « déjà inscrit » sous ce verrou. SQL brut justifié : aucune table lue.
                    DB::select('SELECT pg_advisory_xact_lock(hashtext(?))', ['student_identity:'.$school->id.':'.$identity]);
                    if (self::alreadyEnrolled($enrollment->lastName, $enrollment->firstName, $enrollment->birthDate)) {
                        return null;
                    }
                    $student = $this->enroll->handle($school, $enrollment);
                    $this->createInvoice->handle($student->enrollments()->firstOrFail(), []);

                    return $student;
                });
                $results[] = $student === null
                    ? new ImportRowResult($row->line, 'skipped')
                    : new ImportRowResult($row->line, 'created', [], $student->id, $student->matricule);
            } catch (BusinessConflict $conflict) {
                $results[] = new ImportRowResult($row->line, 'error', [$conflict->errorCode]);
            }
        }

        return $results;
    }

    /**
     * Totaux d'un résultat d'import.
     *
     * @param  list<ImportRowResult>  $results
     */
    public static function counts(array $results): ImportCounts
    {
        $count = static fn (string $status): int => count(array_filter($results, static fn (ImportRowResult $result): bool => $result->status === $status));

        return new ImportCounts($count('ready'), $count('created'), $count('skipped'), $count('error'));
    }

    private static function alreadyEnrolled(string $lastName, string $firstName, string $birthDate): bool
    {
        return Student::query()
            ->whereRaw('lower(last_name) = ?', [mb_strtolower($lastName)])
            ->whereRaw('lower(first_name) = ?', [mb_strtolower($firstName)])
            ->whereDate('birth_date', $birthDate)
            ->exists();
    }

    /** « 2018-03-14 » valide, passée, de moins de 25 ans ; sinon null. */
    private static function date(string $value, string $today): ?string
    {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return null;
        }
        $date = Carbon::createFromFormat('!Y-m-d', $value);
        if ($date === null || $date->toDateString() !== $value || $value >= $today || $value < Carbon::parse($today)->subYears(25)->toDateString()) {
            return null;
        }

        return $value;
    }

    private static function relation(string $value): GuardianRelation
    {
        return GuardianRelation::tryFrom($value) ?? GuardianRelation::Guardian;
    }

    private static function nullable(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    /** Comparaison sans accents ni casse ni espaces superflus (« ce1  a » = « CE1 A »). */
    private static function key(string $value): string
    {
        return (string) preg_replace('/\s+/', ' ', mb_strtolower(trim(Str::ascii($value))));
    }
}
