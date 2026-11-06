<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Classroom;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * CE1 A tenue par une titulaire ; Awa (mère : +2250701020304, compte Parent) et Yao (autre famille).
 *
 * @return array{0: School, 1: Classroom, 2: User, 3: Student, 4: Student, 5: User}
 */
function plannedSchool(): array
{
    $school = makeSchool(['kindergarten', 'primary']);
    $teacher = makeUser();
    assignRole($teacher, $school, Role::Teacher, cycleOf($school, 'primary'));
    $classroom = classroomOf($school, 'CE1', 'A', ['homeroom_teacher_id' => $teacher->id]);
    $awa = enrollStudent($school, $classroom);
    $yao = enrollStudent($school, $classroom, ['first_name' => 'Yao', 'last_name' => 'Kouassi', 'gender' => 'M', 'guardian_phone' => '+2250505050505']);
    $mother = User::factory()->createOne(['phone' => '+2250701020304', 'name' => 'Mariam Koné']);
    assignRole($mother, $school, Role::Guardian);

    return [$school, $classroom, $teacher, $awa, $yao, $mother];
}

/** @param TestResponse<Response> $response */
function plannedId(TestResponse $response): string
{
    $id = $response->json('data.id');

    return is_string($id) ? $id : throw new LogicException('Identifiant attendu.');
}

/**
 * @param  TestResponse<Response>  $response
 * @return list<array<mixed>>
 */
function rollRows(TestResponse $response): array
{
    $rows = $response->json('data.rows');

    return is_array($rows) ? array_values(array_filter($rows, is_array(...))) : throw new LogicException('Lignes attendues.');
}

/**
 * @param  TestResponse<Response>  $response
 * @return array<mixed>
 */
function rowOf(TestResponse $response, Student $student): array
{
    foreach (rollRows($response) as $row) {
        $who = $row['student'] ?? null;
        if (is_array($who) && ($who['id'] ?? null) === $student->id) {
            return $row;
        }
    }

    throw new LogicException('Élève absent de l’appel.');
}

beforeEach(function (): void {
    Carbon::setTestNow('2026-10-05 07:00:00'); // lundi
});

afterEach(function (): void {
    Carbon::setTestNow();
});

it('laisse le parent prévenir d’une absence : message à l’administration, enfant proposé absent, justification en attente', function (): void {
    [$school, $classroom, $teacher, $awa, $yao, $mother] = plannedSchool();

    login($mother);
    $planned = plannedId(spa('POST', "/api/v1/guardian/children/{$awa->id}/planned-absences", ['starts_on' => '2026-10-05', 'ends_on' => '2026-10-06', 'reason' => 'Rendez-vous chez le pédiatre'], $school)
        ->assertSuccessful()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.starts_on', '2026-10-05'));
    spa('GET', '/api/v1/conversations', [], $school)->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.channel', 'office')
        ->assertJsonPath('data.0.subject', 'Absences de Awa');
    spa('GET', "/api/v1/guardian/children/{$awa->id}", [], $school)->assertOk()
        ->assertJsonPath('data.planned_absences.0.id', $planned)
        ->assertJsonPath('data.planned_absences.0.status', 'pending');

    // Chevauchement, jour passé, enfant d'une autre famille
    spa('POST', "/api/v1/guardian/children/{$awa->id}/planned-absences", ['starts_on' => '2026-10-06', 'ends_on' => '2026-10-07', 'reason' => 'Voyage'], $school)
        ->assertStatus(409)->assertJsonPath('code', 'overlap');
    spa('POST', "/api/v1/guardian/children/{$awa->id}/planned-absences", ['starts_on' => '2026-10-02', 'ends_on' => '2026-10-02', 'reason' => 'Malade'], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('starts_on');
    spa('POST', "/api/v1/guardian/children/{$awa->id}/planned-absences", ['starts_on' => '2026-10-20', 'ends_on' => '2026-11-30', 'reason' => 'Voyage'], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('ends_on');
    spa('POST', "/api/v1/guardian/children/{$yao->id}/planned-absences", ['starts_on' => '2026-10-08', 'ends_on' => '2026-10-08', 'reason' => 'Malade'], $school)
        ->assertNotFound();

    // L'appel du jour propose Awa absente ; enregistré, l'absence porte la justification du parent
    login($teacher);
    $call = spa('GET', "/api/v1/classrooms/{$classroom->id}/roll-calls/2026-10-05", [], $school)->assertOk();
    expect(rowOf($call, $awa)['status'])->toBe('absent')
        ->and(rowOf($call, $awa)['planned'])->toBe(['id' => $planned, 'status' => 'pending'])
        ->and(rowOf($call, $yao)['status'])->toBe('present');
    $saved = spa('PUT', "/api/v1/classrooms/{$classroom->id}/roll-calls/2026-10-05", ['marks' => [['student_id' => $awa->id, 'status' => 'absent']]], $school)->assertOk();
    expect(rowOf($saved, $awa)['justification'])->toBe(['status' => 'pending', 'source' => 'guardian']);

    // La titulaire voit l'annonce sans pouvoir décider ; la direction du primaire décide
    spa('GET', '/api/v1/attendance/planned-absences?pending=true', [], $school)->assertOk()
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.can_decide', false);
    spa('POST', "/api/v1/attendance/planned-absences/{$planned}/decision", ['decision' => 'accepted'], $school)->assertForbidden();

    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));
    spa('POST', "/api/v1/attendance/planned-absences/{$planned}/decision", ['decision' => 'accepted'], $school)->assertNotFound();

    actingAsRole(Role::Director, $school, cycleOf($school, 'primary'));
    spa('GET', '/api/v1/attendance/planned-absences?pending=1', [], $school)->assertOk()
        ->assertJsonPath('data.0.reason', 'Rendez-vous chez le pédiatre')
        ->assertJsonPath('data.0.can_decide', true);
    spa('POST', "/api/v1/attendance/planned-absences/{$planned}/decision", ['decision' => 'accepted', 'note' => 'Bon rétablissement'], $school)->assertOk()
        ->assertJsonPath('data.status', 'accepted');
    spa('POST', "/api/v1/attendance/planned-absences/{$planned}/decision", ['decision' => 'refused'], $school)
        ->assertStatus(409)->assertJsonPath('code', 'already_decided');
    spa('GET', '/api/v1/attendance/absences?date=2026-10-05', [], $school)->assertOk()
        ->assertJsonPath('data.0.justification.status', 'accepted');

    // Le lendemain, l'absence relevée est aussitôt justifiée (acceptée)
    Carbon::setTestNow('2026-10-06 07:00:00');
    login($teacher);
    $next = spa('PUT', "/api/v1/classrooms/{$classroom->id}/roll-calls/2026-10-06", ['marks' => [['student_id' => $awa->id, 'status' => 'absent']]], $school)->assertOk();
    expect(rowOf($next, $awa)['justification'])->toBe(['status' => 'accepted', 'source' => 'guardian']);

    login($mother);
    spa('GET', "/api/v1/guardian/children/{$awa->id}", [], $school)->assertOk()
        ->assertJsonPath('data.planned_absences.0.status', 'accepted')
        ->assertJsonPath('data.planned_absences.0.note', 'Bon rétablissement')
        ->assertJsonPath('data.absences.0.justification.status', 'accepted')
        ->assertJsonPath('data.absences.0.can_justify', false);
});

it('justifie une absence déjà relevée le jour même, et laisse l’enseignant marquer l’enfant présent', function (): void {
    [$school, $classroom, $teacher, $awa, $yao, $mother] = plannedSchool();

    login($teacher);
    spa('PUT', "/api/v1/classrooms/{$classroom->id}/roll-calls/2026-10-05", ['marks' => [['student_id' => $awa->id, 'status' => 'absent']]], $school)->assertOk();

    login($mother);
    spa('POST', "/api/v1/guardian/children/{$awa->id}/planned-absences", ['starts_on' => '2026-10-05', 'ends_on' => '2026-10-05', 'reason' => 'Fièvre'], $school)->assertSuccessful();

    login($teacher);
    $call = spa('GET', "/api/v1/classrooms/{$classroom->id}/roll-calls/2026-10-05", [], $school)->assertOk();
    expect(rowOf($call, $awa)['justification'])->toBe(['status' => 'pending', 'source' => 'guardian']);

    // Annoncée pour demain, mais l'enfant est venu : l'appel la marque présente
    login($mother);
    spa('POST', "/api/v1/guardian/children/{$awa->id}/planned-absences", ['starts_on' => '2026-10-06', 'ends_on' => '2026-10-06', 'reason' => 'Fièvre'], $school)->assertSuccessful();
    Carbon::setTestNow('2026-10-06 07:00:00');
    login($teacher);
    $present = spa('PUT', "/api/v1/classrooms/{$classroom->id}/roll-calls/2026-10-06", ['marks' => []], $school)->assertOk();
    expect(rowOf($present, $awa)['status'])->toBe('present')
        ->and(rowOf($present, $awa)['justification'])->toBeNull()
        ->and(rowOf($present, $yao)['planned'])->toBeNull();
});

it('isole les absences annoncées entre établissements', function (): void {
    [$school, , , $awa, , $mother] = plannedSchool();
    login($mother);
    $planned = plannedId(spa('POST', "/api/v1/guardian/children/{$awa->id}/planned-absences", ['starts_on' => '2026-10-07', 'ends_on' => '2026-10-07', 'reason' => 'Fièvre'], $school)->assertSuccessful());

    $other = makeSchool(['primary']);
    actingAsRole(Role::Director, $other);
    spa('GET', '/api/v1/attendance/planned-absences', [], $other)->assertForbidden();
    spa('POST', "/api/v1/attendance/planned-absences/{$planned}/decision", ['decision' => 'accepted'], $other)->assertNotFound();
    spa('POST', "/api/v1/guardian/children/{$awa->id}/planned-absences", ['starts_on' => '2026-10-08', 'ends_on' => '2026-10-08', 'reason' => 'Fièvre'], $other)->assertNotFound();
});
