<?php

declare(strict_types=1);

use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;

/** @param TestResponse<Response> $response */
function eventId(TestResponse $response): string
{
    $id = $response->json('data.id');

    return is_string($id) ? $id : throw new LogicException('Identifiant attendu.');
}

it('gère le calendrier par cycle et le montre à chacun selon ses cycles', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    $primary = cycleOf($school, 'primary');
    $kindergarten = cycleOf($school, 'kindergarten');
    $teacher = makeUser();
    assignRole($teacher, $school, Role::Teacher, $primary);
    enrollStudent($school, classroomOf($school, 'CE1'));
    $mother = User::factory()->createOne(['phone' => '+2250701020304']);
    assignRole($mother, $school, Role::Guardian);

    actingAsRole(Role::Director, $school);
    $holiday = eventId(spa('POST', '/api/v1/calendar/events', ['title' => 'Congés de Toussaint', 'kind' => 'holiday', 'starts_on' => '2026-10-31', 'ends_on' => '2026-11-04'], $school)
        ->assertSuccessful()->assertJsonPath('data.cycle', null)->assertJsonPath('data.can_manage', true));
    spa('POST', '/api/v1/calendar/events', ['title' => 'Fin', 'kind' => 'event', 'starts_on' => '2026-11-05', 'ends_on' => '2026-11-01'], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('ends_on');

    actingAsRole(Role::Director, $school, $kindergarten);
    spa('POST', '/api/v1/calendar/events', ['title' => 'Examens', 'kind' => 'exam', 'starts_on' => '2026-11-10', 'ends_on' => '2026-11-12', 'cycle_id' => $primary->id], $school)->assertForbidden();
    spa('POST', '/api/v1/calendar/events', ['title' => 'Toute l’école', 'kind' => 'event', 'starts_on' => '2026-11-10', 'ends_on' => '2026-11-10'], $school)->assertForbidden();
    $party = eventId(spa('POST', '/api/v1/calendar/events', ['title' => 'Fête de la maternelle', 'kind' => 'event', 'starts_on' => '2026-11-20', 'ends_on' => '2026-11-20', 'cycle_id' => $kindergarten->id, 'location' => 'Cour'], $school)
        ->assertSuccessful()->assertJsonPath('data.cycle.id', $kindergarten->id));
    spa('GET', '/api/v1/calendar/events?from=2026-10-01&to=2026-11-30', [], $school)->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.id', $holiday)->assertJsonPath('data.0.can_manage', false)
        ->assertJsonPath('data.1.can_manage', true);
    spa('PATCH', "/api/v1/calendar/events/{$holiday}", ['title' => 'Congés', 'kind' => 'holiday', 'starts_on' => '2026-10-31', 'ends_on' => '2026-11-04'], $school)->assertForbidden();
    spa('PATCH', "/api/v1/calendar/events/{$party}", ['title' => 'Fête de fin de trimestre', 'kind' => 'event', 'starts_on' => '2026-12-18', 'ends_on' => '2026-12-18', 'cycle_id' => $kindergarten->id], $school)
        ->assertOk()->assertJsonPath('data.title', 'Fête de fin de trimestre');

    actingAsRole(Role::Director, $school);
    $exams = eventId(spa('POST', '/api/v1/calendar/events', ['title' => 'Examens du primaire', 'kind' => 'exam', 'starts_on' => '2026-11-10', 'ends_on' => '2026-11-12', 'cycle_id' => $primary->id], $school)->assertSuccessful());

    // Lecteurs : le primaire ne voit pas la fête de la maternelle
    login($teacher);
    spa('GET', '/api/v1/calendar/events?from=2026-10-01&to=2026-12-31', [], $school)->assertOk()->assertJsonCount(2, 'data');
    login($mother);
    spa('GET', '/api/v1/calendar/events?from=2026-10-01&to=2026-12-31', [], $school)->assertOk()
        ->assertJsonCount(2, 'data')->assertJsonPath('data.1.id', $exams)->assertJsonPath('data.1.can_manage', false);
    spa('POST', '/api/v1/calendar/events', ['title' => 'Parent', 'kind' => 'event', 'starts_on' => '2026-11-10', 'ends_on' => '2026-11-10'], $school)->assertForbidden();

    actingAsRole(Role::Director, $school, $kindergarten);
    spa('DELETE', "/api/v1/calendar/events/{$exams}", [], $school)->assertNotFound();
    spa('DELETE', "/api/v1/calendar/events/{$party}", [], $school)->assertNoContent();
    spa('GET', '/api/v1/calendar/events?from=2026-01-01&to=2027-12-31', [], $school)->assertUnprocessable()->assertJsonValidationErrors('to');
});

it('isole le calendrier entre établissements', function (): void {
    $school = makeSchool(['primary']);
    actingAsRole(Role::Director, $school);
    $id = eventId(spa('POST', '/api/v1/calendar/events', ['title' => 'Interne', 'kind' => 'meeting', 'starts_on' => '2026-11-10', 'ends_on' => '2026-11-10'], $school)->assertSuccessful());

    $other = makeSchool(['primary']);
    actingAsRole(Role::Director, $other);
    spa('GET', '/api/v1/calendar/events?from=2026-11-01&to=2026-11-30', [], $other)->assertOk()->assertJsonCount(0, 'data');
    spa('PATCH', "/api/v1/calendar/events/{$id}", ['title' => 'Intrusion', 'kind' => 'meeting', 'starts_on' => '2026-11-10', 'ends_on' => '2026-11-10'], $other)->assertNotFound();
    spa('DELETE', "/api/v1/calendar/events/{$id}", [], $other)->assertNotFound();
    spa('POST', '/api/v1/calendar/events', ['title' => 'Cycle', 'kind' => 'meeting', 'starts_on' => '2026-11-10', 'ends_on' => '2026-11-10', 'cycle_id' => cycleOf($school, 'primary')->id], $other)
        ->assertUnprocessable()->assertJsonValidationErrors('cycle_id');
});
