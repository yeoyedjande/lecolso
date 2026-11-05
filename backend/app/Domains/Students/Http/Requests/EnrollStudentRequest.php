<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Data\NewEnrollment;
use App\Domains\Students\Enums\BloodType;
use App\Domains\Students\Enums\Gender;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Policies\StudentPolicy;
use App\Support\Phone\Phone;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\Validator;
use LogicException;

/**
 * Inscription complète d'un nouvel élève : `student` (dossier), `guardians` (1 à 4 ; un seul payeur et un seul
 * contact principal, le premier tuteur par défaut), `classroom_id` et `options` (codes des services optionnels). Droits : students.manage sur le cycle de la
 * classe ; champs médicaux de `student` refusés sans students.medical.view sur ce cycle.
 */
final class EnrollStudentRequest extends FormRequest
{
    use StudentFieldRules;

    private ?Classroom $resolvedClassroom = null;

    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user instanceof User || ! $user->can('create', Student::class)) {
            return false;
        }

        $classroom = $this->targetClassroom();

        // Classe inconnue ou d'une autre école : la validation l'explique (422)
        return $classroom === null || $user->can('enrollIn', [Student::class, $classroom]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'student' => ['required', 'array'],
            ...self::studentRules('student.', true, $this->medicalAllowed()),
            'classroom_id' => ['required', 'uuid', 'exists:classrooms,id'],
            'enrolled_on' => ['sometimes', 'date_format:Y-m-d'],
            'options' => ['sometimes', 'array', 'max:10'],
            'options.*' => ['string', 'distinct', 'exists:fee_types,code,is_optional,1'],
            'guardians' => ['required', 'array', 'min:1', 'max:4'],
            ...self::guardianRules('guardians.*.', true),
        ];
    }

    /**
     * @return list<Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            static function (Validator $validator): void {
                $guardians = $validator->getData()['guardians'] ?? null;
                if (! is_array($guardians)) {
                    return;
                }

                $flags = static fn (string $flag): int => count(array_filter(
                    $guardians,
                    static fn (mixed $guardian): bool => is_array($guardian) && filter_var($guardian[$flag] ?? false, FILTER_VALIDATE_BOOL),
                ));

                if ($flags('is_payer') > 1) {
                    $validator->errors()->add('guardians', 'Un seul tuteur peut être le payeur.');
                }
                if ($flags('is_primary_contact') > 1) {
                    $validator->errors()->add('guardians', 'Un seul tuteur peut être le contact principal.');
                }

                $phones = [];
                foreach ($guardians as $index => $guardian) {
                    // Comparaison en E.164, comme à l'enregistrement : « 0701020304 » et « +2250701020304 » sont le même numéro
                    $phone = is_array($guardian) && is_string($guardian['phone'] ?? null) ? Phone::normalize($guardian['phone']) : null;
                    if ($phone !== null && in_array($phone, $phones, true)) {
                        $validator->errors()->add("guardians.{$index}.phone", 'Ce numéro est déjà celui d’un autre tuteur.');
                    }
                    $phones[] = $phone;
                }
            },
        ];
    }

    public function enrollment(): NewEnrollment
    {
        /** @var array<string, mixed> $student */
        $student = $this->validated('student');
        $validatedGuardians = $this->validated('guardians');
        /** @var list<array<string, mixed>> $guardians */
        $guardians = is_array($validatedGuardians) ? array_values($validatedGuardians) : [];
        $attributes = self::studentAttributes($student);

        $hasPayer = array_filter($guardians, static fn (array $g): bool => filter_var($g['is_payer'] ?? false, FILTER_VALIDATE_BOOL)) !== [];
        $hasPrimary = array_filter($guardians, static fn (array $g): bool => filter_var($g['is_primary_contact'] ?? false, FILTER_VALIDATE_BOOL)) !== [];

        $firstName = $attributes['first_name'] ?? null;
        $lastName = $attributes['last_name'] ?? null;
        $gender = $attributes['gender'] ?? null;
        $birthDate = $attributes['birth_date'] ?? null;
        $bloodType = $attributes['blood_type'] ?? null;

        return new NewEnrollment(
            firstName: is_string($firstName) ? $firstName : '',
            lastName: is_string($lastName) ? $lastName : '',
            gender: $gender instanceof Gender ? $gender : Gender::Female,
            birthDate: is_string($birthDate) ? $birthDate : '',
            birthPlace: self::nullableString($attributes['birth_place'] ?? null),
            address: self::nullableString($attributes['address'] ?? null),
            bloodType: $bloodType instanceof BloodType ? $bloodType : null,
            allergies: self::nullableString($attributes['allergies'] ?? null),
            medicalNotes: self::nullableString($attributes['medical_notes'] ?? null),
            classroom: $this->targetClassroom() ?? throw new LogicException('Classe validée introuvable.'),
            enrolledOn: $this->filled('enrolled_on')
                ? $this->string('enrolled_on')->toString()
                : Carbon::now(self::displayTimezone())->toDateString(),
            // Sans payeur ou sans contact principal désigné (absents ou tous à false), c'est le premier tuteur
            guardians: array_map(
                static fn (int $index, array $guardian) => self::guardianInput([
                    ...$guardian,
                    ...(! $hasPrimary && $index === 0 ? ['is_primary_contact' => true] : []),
                    ...(! $hasPayer && $index === 0 ? ['is_payer' => true] : []),
                ], false, false),
                array_keys($guardians),
                $guardians,
            ),
        );
    }

    /**
     * Codes des services optionnels choisis (cantine, transport…), facturés avec l'inscription.
     *
     * @return list<string>
     */
    public function options(): array
    {
        $options = $this->validated('options', []);

        return is_array($options) ? array_values(array_filter($options, 'is_string')) : [];
    }

    private function targetClassroom(): ?Classroom
    {
        if ($this->resolvedClassroom !== null) {
            return $this->resolvedClassroom;
        }

        $id = $this->input('classroom_id');

        return $this->resolvedClassroom = is_string($id) && Str::isUuid($id)
            ? Classroom::query()->with(['level', 'academicYear'])->find($id)
            : null;
    }

    private function medicalAllowed(): bool
    {
        $user = $this->user();
        $classroom = $this->targetClassroom();

        return $user instanceof User && $classroom !== null
            && app(StudentPolicy::class)->viewMedicalIn($user, $classroom);
    }

    private static function nullableString(mixed $value): ?string
    {
        return is_string($value) ? $value : null;
    }
}
