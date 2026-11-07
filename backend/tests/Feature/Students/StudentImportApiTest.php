<?php

declare(strict_types=1);

use App\Domains\Billing\Models\Invoice;
use App\Domains\Identity\Enums\Role;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function importRow(int $line, array $overrides = []): array
{
    return [
        'line' => $line,
        'last_name' => 'Kouassi',
        'first_name' => 'Aya',
        'gender' => 'F',
        'birth_date' => '2018-03-14',
        'classroom' => 'CE1 A',
        'address' => 'Cocody',
        'guardian_name' => 'Adjoua Kouassi',
        'guardian_relation' => 'mother',
        'guardian_phone' => '07 00 00 00 21',
        ...$overrides,
    ];
}

/**
 * @param  list<array<string, mixed>>  $rows
 * @return TestResponse<Response>
 */
function importStudents(School $school, array $rows, bool $dryRun): TestResponse
{
    return spa('POST', '/api/v1/students/import', ['dry_run' => $dryRun, 'rows' => $rows], $school);
}

function studentCount(School $school): int
{
    return inSchool($school, static fn (): int => Student::query()->count());
}

beforeEach(function (): void {
    Carbon::setTestNow('2026-11-07 10:00:00');
});

afterEach(function (): void {
    Carbon::setTestNow();
});

it('vérifie les lignes sans rien écrire, puis inscrit les lignes valides avec matricule et facture', function (): void {
    $school = makeSchool(['primary'], ['code' => 'LAU']);
    setFees($school, 'CE1', ['registration' => 25000, 'tuition' => 180000]);
    classroomOf($school, 'CE1');
    actingAsRole(Role::Secretary, $school);
    $rows = [
        importRow(2),
        importRow(3, ['first_name' => 'Yao', 'gender' => 'M', 'classroom' => 'ce1  a', 'guardian_relation' => 'father', 'guardian_phone' => '+2250500000022']),
        importRow(4, ['last_name' => '', 'gender' => 'X', 'birth_date' => '2018-02-31', 'classroom' => 'CM9 Z', 'guardian_name' => 'K', 'guardian_phone' => '1234']),
        importRow(5),
    ];

    importStudents($school, $rows, true)->assertOk()
        ->assertJsonPath('data.counts', ['ready' => 2, 'created' => 0, 'skipped' => 0, 'error' => 2])
        ->assertJsonPath('data.rows.0.status', 'ready')
        ->assertJsonPath('data.rows.1.status', 'ready')
        ->assertJsonPath('data.rows.2.errors', ['last_name', 'gender', 'birth_date', 'classroom', 'guardian', 'phone'])
        ->assertJsonPath('data.rows.3.errors', ['duplicate']);
    expect(studentCount($school))->toBe(0);

    importStudents($school, [$rows[0], $rows[1]], false)->assertOk()
        ->assertJsonPath('data.counts.created', 2)
        ->assertJsonPath('data.rows.0.matricule', 'LAU-000001')
        ->assertJsonPath('data.rows.1.matricule', 'LAU-000002');
    $aya = inSchool($school, static fn (): Student => Student::query()->where('first_name', 'Aya')->with('guardianLinks.guardian')->sole());
    expect($aya->address)->toBe('Cocody')
        ->and(inSchool($school, static fn (): int => Invoice::query()->count()))->toBe(2);
    spa('GET', '/api/v1/students/'.$aya->id, [], $school)->assertOk()
        ->assertJsonPath('data.guardians.0.phone', '+2250700000021')
        ->assertJsonPath('data.guardians.0.relation', 'mother')
        ->assertJsonPath('data.guardians.0.is_payer', true);
});

it('ne crée aucun doublon quand le même fichier est relancé', function (): void {
    $school = makeSchool(['primary']);
    classroomOf($school, 'CE1');
    actingAsRole(Role::Director, $school);
    importStudents($school, [importRow(2)], false)->assertOk()->assertJsonPath('data.counts.created', 1);

    importStudents($school, [importRow(2, ['last_name' => 'KOUASSI']), importRow(3, ['first_name' => 'Ange'])], true)->assertOk()
        ->assertJsonPath('data.counts', ['ready' => 1, 'created' => 0, 'skipped' => 1, 'error' => 0]);
    importStudents($school, [importRow(2), importRow(3, ['first_name' => 'Ange'])], false)->assertOk()
        ->assertJsonPath('data.rows.0.status', 'skipped')
        ->assertJsonPath('data.rows.1.status', 'created');
    expect(studentCount($school))->toBe(2);
});

it('compte les places de la classe sur tout le fichier', function (): void {
    $school = makeSchool(['primary']);
    $classroom = classroomOf($school, 'CE1');
    inSchool($school, static fn (): bool => $classroom->fill(['capacity' => 1])->save());
    actingAsRole(Role::Director, $school);

    importStudents($school, [importRow(2), importRow(3, ['first_name' => 'Yao'])], true)->assertOk()
        ->assertJsonPath('data.rows.0.status', 'ready')
        ->assertJsonPath('data.rows.1.errors', ['classroom_full']);
    importStudents($school, [importRow(2), importRow(3, ['first_name' => 'Yao'])], false)->assertOk()
        ->assertJsonPath('data.rows.0.status', 'created')
        ->assertJsonPath('data.rows.1.errors', ['classroom_full']);
    expect(studentCount($school))->toBe(1);
});

it('réserve l’import au personnel qui inscrit, classe par classe de ses cycles', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    classroomOf($school, 'CE1');
    classroomOf($school, 'MS');

    actingAsRole(Role::Accountant, $school);
    importStudents($school, [importRow(2)], true)->assertForbidden();
    actingAsRole(Role::Teacher, $school);
    importStudents($school, [importRow(2)], true)->assertForbidden();

    // Secrétariat de la maternelle : une classe du primaire est inconnue pour lui
    actingAsRole(Role::Secretary, $school, cycleOf($school, 'kindergarten'));
    importStudents($school, [importRow(2), importRow(3, ['first_name' => 'Yao', 'classroom' => 'MS A', 'birth_date' => '2021-05-02'])], false)->assertOk()
        ->assertJsonPath('data.rows.0.errors', ['classroom'])
        ->assertJsonPath('data.rows.1.status', 'created');
    expect(studentCount($school))->toBe(1);
});

it('valide la forme du lot', function (): void {
    $school = makeSchool(['primary']);
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/students/import', ['rows' => [importRow(2)]], $school)->assertUnprocessable()->assertJsonValidationErrors('dry_run');
    importStudents($school, [], true)->assertUnprocessable()->assertJsonValidationErrors('rows');
    importStudents($school, array_map(static fn (int $line): array => importRow($line), range(2, 502)), true)
        ->assertUnprocessable()->assertJsonValidationErrors('rows');
});

it('isole l’import entre deux écoles', function (): void {
    $school = makeSchool(['primary']);
    $other = makeSchool(['primary']);
    classroomOf($school, 'CE1');
    classroomOf($other, 'CE1');
    actingAsRole(Role::Director, $school);
    importStudents($school, [importRow(2)], false)->assertOk()->assertJsonPath('data.counts.created', 1);

    // Même élève dans une autre école : inscrit là-bas, pas « déjà inscrit », et rien ne change ici
    actingAsRole(Role::Director, $other);
    importStudents($other, [importRow(2)], false)->assertOk()->assertJsonPath('data.rows.0.status', 'created');
    expect(studentCount($school))->toBe(1)->and(studentCount($other))->toBe(1);
});
