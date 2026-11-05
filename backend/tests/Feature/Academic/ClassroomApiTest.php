<?php

declare(strict_types=1);

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Academic\Models\Level;
use App\Domains\Identity\Enums\Role;
use App\Domains\Tenancy\Models\School;

function levelOf(School $school, string $code): Level
{
    return inSchool($school, static fn (): Level => Level::query()->where('code', $code)->firstOrFail());
}

function currentYearOf(School $school): AcademicYear
{
    return inSchool($school, static fn (): AcademicYear => AcademicYear::query()->where('is_current', true)->first()
        ?? AcademicYear::factory()->createOne());
}

/**
 * Classe de l'année en cours.
 *
 * @param  array<string, mixed>  $attributes
 */
function classroomOf(School $school, string $levelCode, string $section = 'A', array $attributes = []): Classroom
{
    $year = currentYearOf($school);
    $level = levelOf($school, $levelCode);

    return inSchool($school, static fn (): Classroom => Classroom::factory()->createOne([
        'academic_year_id' => $year->id,
        'level_id' => $level->id,
        'section' => $section,
        ...$attributes,
    ]));
}

it('liste les classes de l’année en cours par cycle, niveau et section', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    classroomOf($school, 'CE1', 'B');
    classroomOf($school, 'CE1', 'A');
    classroomOf($school, 'PS');
    $teacher = makeUser();
    assignRole($teacher, $school, Role::Teacher);
    classroomOf($school, 'CP1', 'A', ['homeroom_teacher_id' => $teacher->id, 'room' => 'Salle 4', 'capacity' => 28]);
    actingAsRole(Role::Director, $school);

    $response = spa('GET', '/api/v1/classrooms', [], $school)->assertOk()->assertJsonCount(4, 'data');

    expect(array_column((array) $response->json('data'), 'name'))->toBe(['PS A', 'CP1 A', 'CE1 A', 'CE1 B']);
    $response->assertJsonPath('data.1.homeroom_teacher.id', $teacher->id)
        ->assertJsonPath('data.1.room', 'Salle 4')
        ->assertJsonPath('data.1.capacity', 28)
        ->assertJsonPath('data.1.level.cycle_code', 'primary')
        ->assertJsonPath('data.1.can_manage', true);
});

it('limite la liste aux classes des cycles de l’utilisateur', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    classroomOf($school, 'PS');
    classroomOf($school, 'CE1');
    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));

    $response = spa('GET', '/api/v1/classrooms', [], $school)->assertOk()->assertJsonCount(1, 'data');
    expect($response->json('data.0.name'))->toBe('PS A');
});

it('crée une classe dans l’année en cours', function (): void {
    $school = makeSchool(['primary']);
    $year = currentYearOf($school);
    $teacher = makeUser();
    assignRole($teacher, $school, Role::Teacher);
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/classrooms', [
        'level_id' => levelOf($school, 'CM2')->id,
        'section' => ' b ',
        'capacity' => 32,
        'room' => 'Salle 12',
        'homeroom_teacher_id' => $teacher->id,
    ], $school)
        ->assertCreated()
        ->assertJsonPath('data.name', 'CM2 B')
        ->assertJsonPath('data.academic_year_id', $year->id)
        ->assertJsonPath('data.homeroom_teacher.id', $teacher->id);
});

it('valide la classe', function (Closure $payload, string $field): void {
    $school = makeSchool(['primary']);
    classroomOf($school, 'CE1');
    actingAsRole(Role::Director, $school);

    $data = $payload($school);
    \assert(is_array($data));

    spa('POST', '/api/v1/classrooms', $data, $school)->assertUnprocessable()->assertJsonValidationErrors([$field]);
})->with([
    'section déjà prise' => [static fn (School $school): array => ['level_id' => levelOf($school, 'CE1')->id, 'section' => 'a'], 'section'],
    'sans section' => [static fn (School $school): array => ['level_id' => levelOf($school, 'CE1')->id], 'section'],
    'niveau inconnu' => [static fn (School $school): array => ['level_id' => '0195f000-0000-7000-8000-00000000dead', 'section' => 'A'], 'level_id'],
    'titulaire hors de l’école' => [static fn (School $school): array => ['level_id' => levelOf($school, 'CE2')->id, 'section' => 'A', 'homeroom_teacher_id' => makeUser()->id], 'homeroom_teacher_id'],
    'capacité nulle' => [static fn (School $school): array => ['level_id' => levelOf($school, 'CE2')->id, 'section' => 'A', 'capacity' => 0], 'capacity'],
]);

it('limite la gestion d’une direction de cycle aux classes de son cycle', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    $primary = classroomOf($school, 'CE1');
    $kindergarten = classroomOf($school, 'PS');
    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));

    spa('POST', '/api/v1/classrooms', ['level_id' => levelOf($school, 'CE2')->id, 'section' => 'A'], $school)->assertForbidden();
    spa('PATCH', "/api/v1/classrooms/{$primary->id}", ['room' => 'Salle 1'], $school)->assertForbidden();
    // Déplacer sa classe vers un niveau du primaire : refusé aussi
    spa('PATCH', "/api/v1/classrooms/{$kindergarten->id}", ['level_id' => levelOf($school, 'CE2')->id], $school)->assertForbidden();
    spa('PATCH', "/api/v1/classrooms/{$kindergarten->id}", ['room' => 'Salle verte'], $school)->assertOk()->assertJsonPath('data.room', 'Salle verte');

    actingAsRole(Role::Secretary, $school);
    spa('DELETE', "/api/v1/classrooms/{$kindergarten->id}", [], $school)->assertForbidden();
});

it('modifie puis supprime une classe', function (): void {
    $school = makeSchool(['primary']);
    $classroom = classroomOf($school, 'CE1');
    actingAsRole(Role::Director, $school);

    spa('PATCH', "/api/v1/classrooms/{$classroom->id}", ['section' => 'C', 'capacity' => null, 'homeroom_teacher_id' => null], $school)
        ->assertOk()
        ->assertJsonPath('data.name', 'CE1 C')
        ->assertJsonPath('data.capacity', null);

    spa('DELETE', "/api/v1/classrooms/{$classroom->id}", [], $school)->assertNoContent();
    expect(inSchool($school, static fn (): int => Classroom::query()->count()))->toBe(0);
});

it('isole les classes entre écoles (404, rien à deviner)', function (): void {
    $schoolA = makeSchool(['primary']);
    $schoolB = makeSchool(['primary']);
    $classA = classroomOf($schoolA, 'CE1');
    currentYearOf($schoolB);
    actingAsRole(Role::Director, $schoolB);

    spa('GET', '/api/v1/classrooms', [], $schoolB)->assertOk()->assertJsonCount(0, 'data');
    spa('PATCH', "/api/v1/classrooms/{$classA->id}", ['room' => 'Piraté'], $schoolB)->assertNotFound();
    spa('DELETE', "/api/v1/classrooms/{$classA->id}", [], $schoolB)->assertNotFound();
    // Niveau d'une autre école : introuvable
    spa('POST', '/api/v1/classrooms', ['level_id' => levelOf($schoolA, 'CE2')->id, 'section' => 'A'], $schoolB)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['level_id']);

    expect(inSchool($schoolA, static fn (): ?string => Classroom::query()->find($classA->id)?->room))->toBeNull();
});

it('refuse la liste des classes à qui ne voit ni les paramètres ni les élèves', function (): void {
    $school = makeSchool();
    $user = makeUser();
    $role = customRole($school, ['messaging.send'], 'Communication');
    assignRole($user, $school, $role->id);
    login($user)->assertOk();

    spa('GET', '/api/v1/classrooms', [], $school)->assertForbidden();
});
