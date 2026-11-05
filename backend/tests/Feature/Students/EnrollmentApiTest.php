<?php

declare(strict_types=1);

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Identity\Enums\Role;
use App\Domains\Students\Models\Guardian;
use App\Domains\Students\Models\Student;

/**
 * Corps de POST /enrollments.
 *
 * @param  array<string, mixed>  $student
 * @param  list<array<string, mixed>>|null  $guardians
 * @return array<string, mixed>
 */
function enrollmentPayload(Classroom $classroom, array $student = [], ?array $guardians = null): array
{
    return [
        'classroom_id' => $classroom->id,
        'student' => [
            'first_name' => 'Awa',
            'last_name' => 'Koné',
            'gender' => 'F',
            'birth_date' => '2019-03-14',
            'address' => 'Cocody Angré',
            ...$student,
        ],
        'guardians' => $guardians ?? [
            ['name' => 'Mariam Koné', 'phone' => '07 01 02 03 04', 'relation' => 'mother', 'is_payer' => true],
            ['name' => 'Ibrahim Koné', 'phone' => '05 01 02 03 04', 'relation' => 'father', 'profession' => 'Comptable'],
        ],
    ];
}

it('inscrit un élève avec ses tuteurs et lui attribue un matricule', function (): void {
    $school = makeSchool(['primary'], ['code' => 'LAU']);
    $classroom = classroomOf($school, 'CE1');
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/enrollments', enrollmentPayload($classroom, ['allergies' => 'Arachide', 'blood_type' => 'O+']), $school)
        ->assertCreated()
        ->assertJsonPath('data.matricule', 'LAU-000001')
        ->assertJsonPath('data.full_name', 'KONÉ Awa')
        ->assertJsonPath('data.medical.allergies', 'Arachide')
        ->assertJsonPath('data.medical.blood_type', 'O+')
        ->assertJsonPath('data.enrollments.0.classroom.name', 'CE1 A')
        ->assertJsonPath('data.enrollments.0.status', 'active')
        ->assertJsonPath('data.guardians.0.name', 'Mariam Koné')
        ->assertJsonPath('data.guardians.0.phone', '+2250701020304')
        ->assertJsonPath('data.guardians.0.is_payer', true)
        ->assertJsonPath('data.guardians.0.is_primary_contact', true)
        ->assertJsonPath('data.guardians.1.is_payer', false)
        ->assertJsonPath('data.guardians.1.profession', 'Comptable')
        ->assertJsonPath('data.can_manage', true);

    spa('POST', '/api/v1/enrollments', enrollmentPayload($classroom, ['first_name' => 'Yao'], [
        ['name' => 'Rose Kouassi', 'phone' => '0709090909', 'relation' => 'guardian'],
    ]), $school)->assertCreated()->assertJsonPath('data.matricule', 'LAU-000002');
});

it('numérote les matricules par école', function (): void {
    $lauriers = makeSchool(['primary'], ['code' => 'LAU']);
    $genies = makeSchool(['primary'], ['code' => 'PGE']);
    enrollStudent($lauriers, classroomOf($lauriers, 'CP1'));
    enrollStudent($lauriers, classroomOf($lauriers, 'CP2'), ['guardian_phone' => '+2250102030405']);
    $student = enrollStudent($genies, classroomOf($genies, 'CP1'));

    expect($student->matricule)->toBe('PGE-000001');
});

it('réutilise le tuteur d’un frère ou d’une sœur et relie la fratrie', function (): void {
    $school = makeSchool(['primary']);
    $elder = enrollStudent($school, classroomOf($school, 'CM2'), ['first_name' => 'Koffi', 'guardian_phone' => '+2250701020304']);
    actingAsRole(Role::Director, $school);

    $response = spa('POST', '/api/v1/enrollments', enrollmentPayload(classroomOf($school, 'CP1'), [], [
        ['name' => 'Autre nom saisi', 'phone' => '07 01 02 03 04', 'relation' => 'mother', 'profession' => 'Infirmière'],
    ]), $school)->assertCreated();

    $response->assertJsonPath('data.guardians.0.name', 'Mariam Koné')
        ->assertJsonPath('data.guardians.0.profession', 'Infirmière')
        ->assertJsonPath('data.siblings.0.id', $elder->id)
        ->assertJsonPath('data.siblings.0.classroom_name', 'CM2 A');
    expect(inSchool($school, static fn (): int => Guardian::query()->count()))->toBe(1);
});

it('valide l’inscription', function (Closure $payload, string $field): void {
    $school = makeSchool(['primary']);
    $classroom = classroomOf($school, 'CE1');
    actingAsRole(Role::Director, $school);

    $body = $payload($classroom);
    expect($body)->toBeArray();
    spa('POST', '/api/v1/enrollments', is_array($body) ? $body : [], $school)->assertUnprocessable()->assertJsonValidationErrors($field);
    expect(inSchool($school, static fn (): int => Student::withTrashed()->count()))->toBe(0);
})->with([
    'prénom manquant' => [static fn (Classroom $c): array => enrollmentPayload($c, ['first_name' => '']), 'student.first_name'],
    'naissance future' => [static fn (Classroom $c): array => enrollmentPayload($c, ['birth_date' => '2099-01-01']), 'student.birth_date'],
    'sexe inconnu' => [static fn (Classroom $c): array => enrollmentPayload($c, ['gender' => 'X']), 'student.gender'],
    'sans tuteur' => [static fn (Classroom $c): array => enrollmentPayload($c, [], []), 'guardians'],
    'téléphone invalide' => [static fn (Classroom $c): array => enrollmentPayload($c, [], [['name' => 'Mariam', 'phone' => '123', 'relation' => 'mother']]), 'guardians.0.phone'],
    'deux payeurs' => [static fn (Classroom $c): array => enrollmentPayload($c, [], [
        ['name' => 'Mariam', 'phone' => '0701020304', 'relation' => 'mother', 'is_payer' => true],
        ['name' => 'Ibrahim', 'phone' => '0501020304', 'relation' => 'father', 'is_payer' => true],
    ]), 'guardians'],
    'même téléphone' => [static fn (Classroom $c): array => enrollmentPayload($c, [], [
        ['name' => 'Mariam', 'phone' => '0701020304', 'relation' => 'mother'],
        ['name' => 'Ibrahim', 'phone' => '07 01 02 03 04', 'relation' => 'father'],
    ]), 'guardians.1.phone'],
    'même numéro, deux formats' => [static fn (Classroom $c): array => enrollmentPayload($c, [], [
        ['name' => 'Mariam', 'phone' => '0701020304', 'relation' => 'mother'],
        ['name' => 'Ibrahim', 'phone' => '+2250701020304', 'relation' => 'father'],
    ]), 'guardians.1.phone'],
    'classe inconnue' => [static fn (Classroom $c): array => [...enrollmentPayload($c), 'classroom_id' => '0195f000-0000-7000-8000-00000000dead'], 'classroom_id'],
]);

it('désigne le premier tuteur payeur et contact principal quand aucun ne l’est', function (): void {
    $school = makeSchool(['primary']);
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/enrollments', enrollmentPayload(classroomOf($school, 'CE1'), [], [
        ['name' => 'Mariam Koné', 'phone' => '0701020304', 'relation' => 'mother', 'is_payer' => false, 'is_primary_contact' => false],
        ['name' => 'Ibrahim Koné', 'phone' => '0501020304', 'relation' => 'father', 'is_payer' => false],
    ]), $school)->assertCreated()
        ->assertJsonPath('data.guardians.0.is_payer', true)
        ->assertJsonPath('data.guardians.0.is_primary_contact', true)
        ->assertJsonPath('data.guardians.1.is_payer', false)
        ->assertJsonPath('data.guardians.1.is_primary_contact', false);
});

it('refuse une classe complète ou une année clôturée', function (): void {
    $school = makeSchool(['primary']);
    $classroom = classroomOf($school, 'CE1', 'A', ['capacity' => 1]);
    enrollStudent($school, $classroom);
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/enrollments', enrollmentPayload($classroom, [], [['name' => 'Rose', 'phone' => '0709090909', 'relation' => 'guardian']]), $school)
        ->assertStatus(409)->assertJsonPath('code', 'classroom_full');

    $open = classroomOf($school, 'CE2');
    inSchool($school, static fn () => $open->academicYear->forceFill(['status' => AcademicYearStatus::Closed, 'is_current' => false])->save());
    spa('POST', '/api/v1/enrollments', enrollmentPayload($open, [], [['name' => 'Rose', 'phone' => '0709090909', 'relation' => 'guardian']]), $school)
        ->assertStatus(409)->assertJsonPath('code', 'year_closed');
    expect(inSchool($school, static fn (): int => Student::query()->count()))->toBe(1);
});

it('refuse les données médicales à qui ne peut pas les voir', function (): void {
    $school = makeSchool(['primary']);
    $classroom = classroomOf($school, 'CE1');
    $role = customRole($school, ['students.view', 'students.manage'], 'Agent d’accueil');
    actingAsRole($role->id, $school);

    spa('POST', '/api/v1/enrollments', enrollmentPayload($classroom, ['allergies' => 'Arachide']), $school)
        ->assertUnprocessable()->assertJsonValidationErrors('student.allergies');
    spa('POST', '/api/v1/enrollments', enrollmentPayload($classroom), $school)
        ->assertCreated()->assertJsonPath('data.medical', null)->assertJsonPath('data.can_view_medical', false);
});

it('limite l’inscription au cycle de la classe', function (Role $role, ?string $cycle, int $status): void {
    $school = makeSchool(['kindergarten', 'primary']);
    $classroom = classroomOf($school, 'CE1');
    actingAsRole($role, $school, $cycle === null ? null : cycleOf($school, $cycle));

    spa('POST', '/api/v1/enrollments', enrollmentPayload($classroom), $school)->assertStatus($status);
})->with([
    'direction de la maternelle' => [Role::Director, 'kindergarten', 403],
    'secrétariat du primaire' => [Role::Secretary, 'primary', 201],
    'comptabilité' => [Role::Accountant, null, 403],
    'enseignant' => [Role::Teacher, null, 403],
]);

it('n’inscrit pas dans la classe d’une autre école', function (): void {
    $school = makeSchool(['primary']);
    $other = makeSchool(['primary']);
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/enrollments', enrollmentPayload(classroomOf($other, 'CE1')), $school)
        ->assertUnprocessable()->assertJsonValidationErrors('classroom_id');
    expect(inSchool($other, static fn (): int => Student::query()->count()))->toBe(0);
});

it('rend le numéro si l’inscription échoue', function (): void {
    $school = makeSchool(['primary'], ['code' => 'LAU']);
    $full = classroomOf($school, 'CE1', 'A', ['capacity' => 1]);
    enrollStudent($school, $full);
    actingAsRole(Role::Director, $school);
    spa('POST', '/api/v1/enrollments', enrollmentPayload($full, [], [['name' => 'Rose', 'phone' => '0709090909', 'relation' => 'guardian']]), $school)->assertStatus(409);

    spa('POST', '/api/v1/enrollments', enrollmentPayload(classroomOf($school, 'CE2'), [], [['name' => 'Rose', 'phone' => '0709090909', 'relation' => 'guardian']]), $school)
        ->assertCreated()->assertJsonPath('data.matricule', 'LAU-000002');
});

it('ne journalise jamais les données médicales', function (): void {
    $school = makeSchool(['primary']);
    actingAsRole(Role::Director, $school);
    spa('POST', '/api/v1/enrollments', enrollmentPayload(classroomOf($school, 'CE1'), ['allergies' => 'Arachide', 'medical_notes' => 'Asthme']), $school)->assertCreated();

    $logged = json_encode(inSchool($school, static fn (): array => rows('select properties from activity_log')), JSON_UNESCAPED_UNICODE);
    $logged = is_string($logged) ? $logged : '';
    expect(str_contains($logged, 'Arachide'))->toBeFalse()
        ->and(str_contains($logged, 'Asthme'))->toBeFalse()
        ->and(str_contains($logged, 'Koné'))->toBeTrue();
});
