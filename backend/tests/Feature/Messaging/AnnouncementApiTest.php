<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Classroom;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * CE1 A (titulaire) avec Awa (mère : compte Parent), CE1 B, MS A avec Bintou (autre famille, compte Parent).
 *
 * @return array{0: School, 1: Classroom, 2: Classroom, 3: User, 4: User, 5: User}
 */
function announcementSchool(): array
{
    $school = makeSchool(['kindergarten', 'primary']);
    $teacher = makeUser();
    assignRole($teacher, $school, Role::Teacher, cycleOf($school, 'primary'));
    $a = classroomOf($school, 'CE1', 'A', ['homeroom_teacher_id' => $teacher->id]);
    $b = classroomOf($school, 'CE1', 'B');
    enrollStudent($school, $a);
    enrollStudent($school, classroomOf($school, 'MS'), ['first_name' => 'Bintou', 'guardian_phone' => '+2250505050505']);
    $mother = User::factory()->createOne(['phone' => '+2250701020304']);
    assignRole($mother, $school, Role::Guardian);
    $other = User::factory()->createOne(['phone' => '+2250505050505']);
    assignRole($other, $school, Role::Guardian);

    return [$school, $a, $b, $teacher, $mother, $other];
}

/** @param TestResponse<Response> $response */
function announcementId(TestResponse $response): string
{
    $id = $response->json('data.id');

    return is_string($id) ? $id : throw new LogicException('Identifiant attendu.');
}

beforeEach(function (): void {
    Carbon::setTestNow('2026-10-05 08:00:00');
});

afterEach(function (): void {
    Carbon::setTestNow();
});

it('publie pour toute l’école, un cycle ou une classe, et chacun lit ce qui le concerne', function (): void {
    [$school, $a, $b, $teacher, $mother, $other] = announcementSchool();
    $primary = cycleOf($school, 'primary');
    $kindergarten = cycleOf($school, 'kindergarten');

    actingAsRole(Role::Director, $school);
    spa('GET', '/api/v1/announcements/targets', [], $school)->assertOk()
        ->assertJsonPath('data.school', true)
        ->assertJsonCount(2, 'data.cycles')
        ->assertJsonCount(3, 'data.classrooms');
    spa('POST', '/api/v1/announcements', ['title' => 'Rentrée des congés', 'body' => 'Reprise lundi.', 'audience' => 'school'], $school)
        ->assertSuccessful()->assertJsonPath('data.reach', 2)->assertJsonPath('data.audience', 'school');

    // Secrétariat du primaire : son cycle seulement
    actingAsRole(Role::Secretary, $school, $primary);
    spa('GET', '/api/v1/announcements/targets', [], $school)->assertOk()
        ->assertJsonPath('data.school', false)->assertJsonCount(1, 'data.cycles')->assertJsonCount(2, 'data.classrooms');
    spa('POST', '/api/v1/announcements', ['title' => 'Toute l’école', 'body' => 'x', 'audience' => 'school'], $school)->assertForbidden();
    spa('POST', '/api/v1/announcements', ['title' => 'Maternelle', 'body' => 'x', 'audience' => 'cycle', 'cycle_id' => $kindergarten->id], $school)->assertForbidden();
    spa('POST', '/api/v1/announcements', ['title' => 'Kermesse du primaire', 'body' => 'Samedi.', 'audience' => 'cycle', 'cycle_id' => $primary->id], $school)
        ->assertSuccessful()->assertJsonPath('data.reach', 1)->assertJsonPath('data.cycle.id', $primary->id);

    // Titulaire : sa classe seulement
    login($teacher);
    spa('POST', '/api/v1/announcements', ['title' => 'Sortie au zoo', 'body' => 'Autorisation à signer.', 'audience' => 'classroom', 'classroom_id' => $a->id], $school)
        ->assertSuccessful()->assertJsonPath('data.classroom.name', 'CE1 A')->assertJsonPath('data.cycle.id', $primary->id);
    spa('POST', '/api/v1/announcements', ['title' => 'Autre classe', 'body' => 'x', 'audience' => 'classroom', 'classroom_id' => $b->id], $school)->assertForbidden();
    spa('POST', '/api/v1/announcements', ['title' => 'Cycle', 'body' => 'x', 'audience' => 'cycle', 'cycle_id' => $primary->id], $school)->assertForbidden();

    // Lecteurs
    login($mother);
    spa('GET', '/api/v1/announcements', [], $school)->assertOk()->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.can_delete', false);
    login($other);
    spa('GET', '/api/v1/announcements', [], $school)->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Rentrée des congés');
    actingAsRole(Role::Director, $school, $kindergarten);
    spa('GET', '/api/v1/announcements', [], $school)->assertOk()->assertJsonCount(1, 'data');
    actingAsRole(Role::Secretary, $school, $primary);
    spa('GET', '/api/v1/announcements', [], $school)->assertOk()->assertJsonCount(3, 'data');
});

it('retire une annonce avec le droit de la publier, et valide la demande', function (): void {
    [$school, $a, , $teacher] = announcementSchool();
    $primary = cycleOf($school, 'primary');

    actingAsRole(Role::Director, $school);
    $schoolWide = announcementId(spa('POST', '/api/v1/announcements', ['title' => 'Réunion', 'body' => 'Jeudi.', 'audience' => 'school'], $school)->assertSuccessful());
    $cycle = announcementId(spa('POST', '/api/v1/announcements', ['title' => 'Primaire', 'body' => 'Note.', 'audience' => 'cycle', 'cycle_id' => $primary->id], $school)->assertSuccessful());
    spa('POST', '/api/v1/announcements', ['title' => 'Sans cycle', 'body' => 'x', 'audience' => 'cycle'], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('cycle_id');
    spa('POST', '/api/v1/announcements', ['title' => 'Vide', 'body' => '', 'audience' => 'school'], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('body');
    $elsewhere = classroomOf(makeSchool(['primary']), 'CE1');
    spa('POST', '/api/v1/announcements', ['title' => 'Ailleurs', 'body' => 'x', 'audience' => 'classroom', 'classroom_id' => $elsewhere->id], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('classroom_id');

    login($teacher);
    $mine = announcementId(spa('POST', '/api/v1/announcements', ['title' => 'Classe', 'body' => 'x', 'audience' => 'classroom', 'classroom_id' => $a->id], $school)->assertSuccessful());
    spa('DELETE', "/api/v1/announcements/{$schoolWide}", [], $school)->assertForbidden();
    spa('DELETE', "/api/v1/announcements/{$mine}", [], $school)->assertNoContent();

    actingAsRole(Role::Secretary, $school, $primary);
    spa('DELETE', "/api/v1/announcements/{$schoolWide}", [], $school)->assertForbidden();
    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));
    spa('DELETE', "/api/v1/announcements/{$cycle}", [], $school)->assertNotFound();
});

it('isole les annonces entre établissements', function (): void {
    [$school] = announcementSchool();
    actingAsRole(Role::Director, $school);
    $id = announcementId(spa('POST', '/api/v1/announcements', ['title' => 'Interne', 'body' => 'x', 'audience' => 'school'], $school)->assertSuccessful());

    $other = makeSchool(['primary']);
    actingAsRole(Role::Director, $other);
    spa('GET', '/api/v1/announcements', [], $other)->assertOk()->assertJsonCount(0, 'data');
    spa('DELETE', "/api/v1/announcements/{$id}", [], $other)->assertNotFound();
    spa('POST', '/api/v1/announcements', ['title' => 'Cycle', 'body' => 'x', 'audience' => 'cycle', 'cycle_id' => cycleOf($school, 'primary')->id], $other)
        ->assertUnprocessable()->assertJsonValidationErrors('cycle_id');
});
