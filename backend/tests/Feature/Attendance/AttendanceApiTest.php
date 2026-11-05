<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Events\StudentMarkedAbsent;
use App\Domains\Attendance\Models\DaycareLog;
use App\Domains\Attendance\Models\RollCall;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\SpaClient;

/**
 * École maternelle et primaire, CE1 A tenue par une enseignante titulaire, deux élèves (Awa, Yao).
 *
 * @return array{0: School, 1: Classroom, 2: User, 3: Student, 4: Student}
 */
function attendanceSchool(): array
{
    $school = makeSchool(['daycare', 'kindergarten', 'primary']);
    $teacher = makeUser();
    assignRole($teacher, $school, Role::Teacher, cycleOf($school, 'primary'));
    $classroom = classroomOf($school, 'CE1', 'A', ['homeroom_teacher_id' => $teacher->id]);
    $awa = enrollStudent($school, $classroom);
    $yao = enrollStudent($school, $classroom, ['first_name' => 'Yao', 'last_name' => 'Kouassi', 'gender' => 'M', 'guardian_phone' => '+2250505050505', 'guardian_name' => 'Paul Kouassi']);

    return [$school, $classroom, $teacher, $awa, $yao];
}

/** @return array<string, mixed> */
function marks(Student $absent, Student $late): array
{
    return ['marks' => [
        ['student_id' => $absent->id, 'status' => 'absent'],
        ['student_id' => $late->id, 'status' => 'late', 'late_minutes' => 15],
    ]];
}

beforeEach(function (): void {
    // Lundi 5 octobre 2026, 8 h à Abidjan
    Carbon::setTestNow('2026-10-05 08:00:00');
});

afterEach(function (): void {
    Carbon::setTestNow();
});

it('laisse la titulaire faire l’appel du jour et liste les absences', function (): void {
    Event::fake([StudentMarkedAbsent::class]);
    [$school, $classroom, $teacher, $awa, $yao] = attendanceSchool();
    login($teacher);
    $uri = '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-05';

    spa('GET', '/api/v1/attendance/classrooms', [], $school)->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.mode', 'roll_call')
        ->assertJsonPath('data.0.can_take', true)
        ->assertJsonPath('data.0.is_homeroom', true);
    spa('GET', $uri, [], $school)->assertOk()
        ->assertJsonPath('data.taken', null)
        ->assertJsonPath('data.can_edit', true)
        ->assertJsonPath('data.needs_reason', false)
        ->assertJsonPath('data.rows.0.status', 'present')
        ->assertJsonCount(2, 'data.rows');

    spa('PUT', $uri, marks($awa, $yao), $school)->assertOk()
        ->assertJsonPath('data.taken.by', $teacher->name)
        ->assertJsonPath('data.rows.0.student.full_name', 'KONÉ Awa')
        ->assertJsonPath('data.rows.0.status', 'absent')
        ->assertJsonPath('data.rows.1.status', 'late')
        ->assertJsonPath('data.rows.1.late_minutes', 15);
    Event::assertDispatchedTimes(StudentMarkedAbsent::class, 1);

    // Nouvel enregistrement le même jour : Awa revient, sa marque disparaît ; aucune nouvelle absence
    spa('PUT', $uri, ['marks' => [['student_id' => $awa->id, 'status' => 'present'], ['student_id' => $yao->id, 'status' => 'absent']]], $school)->assertOk()
        ->assertJsonPath('data.rows.0.status', 'present')
        ->assertJsonPath('data.rows.1.status', 'absent');
    Event::assertDispatchedTimes(StudentMarkedAbsent::class, 2);
    expect(inSchool($school, static fn (): int => RollCall::query()->count()))->toBe(1);

    actingAsRole(Role::Secretary, $school);
    spa('GET', '/api/v1/attendance/absences', [], $school)->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.student.full_name', 'KOUASSI Yao')
        ->assertJsonPath('data.0.classroom.name', 'CE1 A')
        ->assertJsonPath('data.0.can_decide', true);
});

it('limite l’appel au titulaire et au personnel du cycle', function (): void {
    [$school, $classroom, , $awa, $yao] = attendanceSchool();
    $uri = '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-05';

    $other = makeUser();
    assignRole($other, $school, Role::Teacher, cycleOf($school, 'primary'));
    login($other);
    spa('GET', $uri, [], $school)->assertNotFound();
    spa('PUT', $uri, marks($awa, $yao), $school)->assertNotFound();

    foreach ([[Role::Secretary, 'kindergarten'], [Role::Accountant, null], [Role::Guardian, null]] as [$role, $cycle]) {
        actingAsRole($role, $school, $cycle === null ? null : cycleOf($school, $cycle));
        spa('GET', $uri, [], $school)->assertNotFound();
    }

    actingAsRole(Role::Secretary, $school, cycleOf($school, 'primary'));
    spa('PUT', $uri, marks($awa, $yao), $school)->assertOk();

    // Promoteur : consulte sans faire l'appel
    actingAsRole(Role::Promoter, $school);
    spa('GET', $uri, [], $school)->assertOk()->assertJsonPath('data.can_edit', false);
    spa('PUT', $uri, marks($awa, $yao), $school)->assertForbidden();
});

it('réserve la correction d’une journée passée à la direction, avec un motif', function (): void {
    [$school, $classroom, $teacher, $awa, $yao] = attendanceSchool();
    $uri = '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-05';
    login($teacher);
    spa('PUT', $uri, marks($awa, $yao), $school)->assertOk();
    spa('PUT', '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-06', marks($awa, $yao), $school)
        ->assertUnprocessable()->assertJsonValidationErrors('date');

    Carbon::setTestNow('2026-10-06 09:00:00');
    login($teacher);
    spa('GET', $uri, [], $school)->assertOk()->assertJsonPath('data.can_edit', false)->assertJsonPath('data.needs_reason', true);
    spa('PUT', $uri, ['marks' => []], $school)->assertConflict()->assertJsonPath('code', 'day_closed');

    actingAsRole(Role::Director, $school);
    spa('GET', $uri, [], $school)->assertOk()->assertJsonPath('data.can_edit', true);
    spa('PUT', $uri, ['marks' => []], $school)->assertUnprocessable()->assertJsonValidationErrors('reason');
    spa('PUT', $uri, ['marks' => [['student_id' => $yao->id, 'status' => 'late', 'late_minutes' => 5]], 'reason' => 'Awa était au bureau'], $school)->assertOk()
        ->assertJsonPath('data.rows.0.status', 'present')
        ->assertJsonPath('data.rows.1.status', 'late')
        ->assertJsonPath('data.corrections.0.reason', 'Awa était au bureau');
});

it('refuse un élève hors de la classe et l’appel d’une garderie', function (): void {
    [$school, $classroom, , $awa] = attendanceSchool();
    $intruder = enrollStudent($school, classroomOf($school, 'CE1', 'B'), ['first_name' => 'Ismaël', 'gender' => 'M']);
    actingAsRole(Role::Director, $school);

    spa('PUT', '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-05', ['marks' => [['student_id' => $intruder->id, 'status' => 'absent']]], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('marks.0.student_id');
    spa('PUT', '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-05', ['marks' => [['student_id' => $awa->id, 'status' => 'excused']]], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('marks.0.status');

    $creche = classroomOf($school, 'CRECHE');
    spa('PUT', '/api/v1/classrooms/'.$creche->id.'/roll-calls/2026-10-05', ['marks' => []], $school)
        ->assertConflict()->assertJsonPath('code', 'wrong_mode');
});

it('fait proposer la justification par le parent et décider par l’école', function (): void {
    Storage::fake();
    [$school, $classroom, $teacher, $awa, $yao] = attendanceSchool();
    login($teacher);
    spa('PUT', '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-05', marks($awa, $yao), $school)->assertOk();
    $awaMark = spa('GET', '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-05', [], $school)->json('data.rows.0.mark_id');
    $yaoMark = spa('GET', '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-05', [], $school)->json('data.rows.1.mark_id');
    \assert(is_string($awaMark) && is_string($yaoMark));

    // Le parent d'Awa justifie, avec une photo du certificat ; le parent de Yao ne voit pas l'absence d'Awa
    $mother = User::factory()->createOne(['phone' => '+2250701020304']);
    assignRole($mother, $school, Role::Guardian);
    login($mother);
    $response = SpaClient::upload('/api/v1/attendance/marks/'.$awaMark.'/justification', ['proof' => UploadedFile::fake()->image('certificat.jpg', 800, 600)], ['X-School-Id' => $school->id], ['reason' => 'Fièvre, certificat médical']);
    $response->assertOk()
        ->assertJsonPath('data.justification.status', 'pending')
        ->assertJsonPath('data.justification.source', 'guardian')
        ->assertJsonPath('data.justification.proof_url', static fn (mixed $url): bool => is_string($url) && str_contains($url, '/files/absence-proofs/'));

    $father = User::factory()->createOne(['phone' => '+2250505050505']);
    assignRole($father, $school, Role::Guardian);
    login($father);
    spa('POST', '/api/v1/attendance/marks/'.$awaMark.'/justification', ['reason' => 'Malade'], $school)->assertNotFound();

    // Enseignant : voit, ne décide pas
    login($teacher);
    $justification = spa('GET', '/api/v1/attendance/absences?pending=1', [], $school)->assertOk()
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.can_decide', false)->json('data.0.justification.id');
    \assert(is_string($justification));
    spa('POST', '/api/v1/attendance/justifications/'.$justification.'/decision', ['decision' => 'accepted'], $school)->assertForbidden();

    actingAsRole(Role::Secretary, $school);
    spa('POST', '/api/v1/attendance/justifications/'.$justification.'/decision', ['decision' => 'maybe'], $school)->assertUnprocessable();
    spa('POST', '/api/v1/attendance/justifications/'.$justification.'/decision', ['decision' => 'accepted', 'note' => 'Certificat reçu'], $school)->assertOk()
        ->assertJsonPath('data.justification.status', 'accepted')
        ->assertJsonPath('data.justification.decision_note', 'Certificat reçu');
    spa('POST', '/api/v1/attendance/justifications/'.$justification.'/decision', ['decision' => 'refused'], $school)->assertConflict()->assertJsonPath('code', 'already_decided');

    // L'école justifie directement le retard de Yao
    spa('POST', '/api/v1/attendance/marks/'.$yaoMark.'/justification', ['reason' => 'Bus en panne'], $school)->assertOk()
        ->assertJsonPath('data.justification.status', 'accepted')
        ->assertJsonPath('data.justification.source', 'school');

    login($mother);
    spa('POST', '/api/v1/attendance/marks/'.$awaMark.'/justification', ['reason' => 'Encore'], $school)->assertConflict()->assertJsonPath('code', 'already_justified');
});

it('donne l’historique d’une classe jour par jour', function (): void {
    [$school, $classroom, $teacher, $awa, $yao] = attendanceSchool();
    login($teacher);
    spa('PUT', '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-05', marks($awa, $yao), $school)->assertOk();

    spa('GET', '/api/v1/classrooms/'.$classroom->id.'/attendance?from=2026-09-28&to=2026-10-09', [], $school)->assertOk()
        ->assertJsonCount(6, 'data')
        ->assertJsonPath('data.0.taken', false)
        ->assertJsonPath('data.5.date', '2026-10-05')
        ->assertJsonPath('data.5.taken', true)
        ->assertJsonPath('data.5.present', 1)
        ->assertJsonPath('data.5.absent', 1)
        ->assertJsonPath('data.5.late', 1);
    spa('GET', '/api/v1/classrooms/'.$classroom->id.'/attendance?from=2026-09-01&to=2026-12-01', [], $school)->assertUnprocessable();
});

it('note arrivées, départs et journal à la garderie', function (): void {
    [$school, $classroom, , $awa] = attendanceSchool();
    $creche = classroomOf($school, 'CRECHE');
    $baby = enrollStudent($school, $creche, ['first_name' => 'Ange', 'birth_date' => '2025-02-10']);
    actingAsRole(Role::Secretary, $school, cycleOf($school, 'daycare'));

    spa('POST', '/api/v1/daycare/visits', ['student_id' => $baby->id, 'direction' => 'in', 'time' => '07:45', 'person' => 'Maman'], $school)->assertOk()
        ->assertJsonPath('data.classrooms.0.name', 'CRECHE A')
        ->assertJsonPath('data.classrooms.0.can_record', true)
        ->assertJsonPath('data.classrooms.0.children.0.visit.arrived_at', '07:45')
        ->assertJsonPath('data.classrooms.0.children.0.visit.dropped_by', 'Maman');
    spa('POST', '/api/v1/daycare/logs', ['student_id' => $baby->id, 'time' => '11:30', 'kind' => 'meal', 'note' => 'A tout mangé'], $school)->assertOk()
        ->assertJsonPath('data.classrooms.0.children.0.logs.0.kind', 'meal');
    spa('POST', '/api/v1/daycare/visits', ['student_id' => $baby->id, 'direction' => 'out', 'time' => '17:05', 'person' => 'Papa'], $school)->assertOk()
        ->assertJsonPath('data.classrooms.0.children.0.visit.left_at', '17:05')
        ->assertJsonPath('data.classrooms.0.children.0.visit.arrived_at', '07:45');
    spa('POST', '/api/v1/daycare/visits', ['student_id' => $baby->id, 'direction' => 'out', 'time' => '25:00'], $school)->assertUnprocessable();

    // Élève du primaire : son cycle fait l'appel ; hors de son cycle : interdit
    actingAsRole(Role::Director, $school);
    spa('POST', '/api/v1/daycare/visits', ['student_id' => $awa->id, 'direction' => 'in', 'time' => '07:30'], $school)->assertConflict()->assertJsonPath('code', 'wrong_mode');
    actingAsRole(Role::Secretary, $school, cycleOf($school, 'primary'));
    spa('POST', '/api/v1/daycare/logs', ['student_id' => $baby->id, 'time' => '12:00', 'kind' => 'nap', 'note' => 'Sieste'], $school)->assertForbidden();
});

it('applique une seule fois la file hors connexion, à l’heure de la saisie', function (): void {
    [$school, $classroom, $teacher, $awa, $yao] = attendanceSchool();
    $creche = classroomOf($school, 'CRECHE');
    $baby = enrollStudent($school, $creche, ['first_name' => 'Ange', 'birth_date' => '2025-02-10']);
    $operation = [
        'id' => (string) Str::uuid7(),
        'type' => 'attendance.roll_call',
        'payload' => ['classroom_id' => $classroom->id, 'date' => '2026-10-05', 'recorded_at' => '2026-10-05T07:55:00Z', ...marks($awa, $yao)],
    ];

    // Saisi lundi matin hors connexion, envoyé mardi : ce n'est pas une correction
    Carbon::setTestNow('2026-10-06 10:00:00');
    login($teacher);
    spa('POST', '/api/v1/sync', ['operations' => [$operation]], $school)->assertOk()
        ->assertJsonPath('data.0.status', 'applied')
        ->assertJsonPath('data.0.replayed', false);
    spa('POST', '/api/v1/sync', ['operations' => [$operation]], $school)->assertOk()
        ->assertJsonPath('data.0.status', 'applied')
        ->assertJsonPath('data.0.replayed', true);
    expect(inSchool($school, static fn (): int => RollCall::query()->count()))->toBe(1);

    // Hors délai (plus de 72 h) : une correction, refusée à l'enseignante
    $late = [...$operation, 'id' => (string) Str::uuid7(), 'payload' => [...$operation['payload'], 'date' => '2026-10-01', 'recorded_at' => '2026-10-01T08:00:00Z']];
    spa('POST', '/api/v1/sync', ['operations' => [$late]], $school)->assertOk()
        ->assertJsonPath('data.0.status', 'rejected')
        ->assertJsonPath('data.0.code', 'day_closed');

    // Journal de garderie rejoué : une seule entrée ; classe d'une autre école : introuvable
    actingAsRole(Role::Director, $school);
    $log = ['id' => (string) Str::uuid7(), 'type' => 'daycare.log', 'payload' => ['log_id' => (string) Str::uuid7(), 'student_id' => $baby->id, 'date' => '2026-10-06', 'time' => '10:00', 'kind' => 'mood', 'note' => 'Joyeux', 'recorded_at' => '2026-10-06T09:59:00Z']];
    $other = makeSchool(['primary']);
    $foreign = classroomOf($other, 'CE1');
    $intrusion = ['id' => (string) Str::uuid7(), 'type' => 'attendance.roll_call', 'payload' => ['classroom_id' => $foreign->id, 'date' => '2026-10-06', 'recorded_at' => '2026-10-06T09:00:00Z', 'marks' => []]];
    spa('POST', '/api/v1/sync', ['operations' => [$log, $intrusion]], $school)->assertOk()
        ->assertJsonPath('data.0.status', 'applied')
        ->assertJsonPath('data.1.status', 'rejected')
        ->assertJsonPath('data.1.code', 'not_found');
    spa('POST', '/api/v1/sync', ['operations' => [$log]], $school)->assertOk()->assertJsonPath('data.0.replayed', true);
    expect(inSchool($school, static fn (): int => DaycareLog::query()->count()))->toBe(1);
    spa('POST', '/api/v1/sync', ['operations' => [['id' => 'pas-un-uuid', 'type' => 'attendance.roll_call', 'payload' => []]]], $school)->assertUnprocessable();
});

it('isole présences et garderie entre deux écoles', function (): void {
    [$school, $classroom, $teacher, $awa, $yao] = attendanceSchool();
    login($teacher);
    spa('PUT', '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-05', marks($awa, $yao), $school)->assertOk();
    $mark = spa('GET', '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-05', [], $school)->json('data.rows.0.mark_id');
    \assert(is_string($mark));

    $other = makeSchool(['primary']);
    actingAsRole(Role::Director, $other);
    spa('GET', '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-05', [], $other)->assertNotFound();
    spa('PUT', '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-05', ['marks' => []], $other)->assertNotFound();
    spa('POST', '/api/v1/attendance/marks/'.$mark.'/justification', ['reason' => 'Malade'], $other)->assertNotFound();
    spa('POST', '/api/v1/daycare/visits', ['student_id' => $awa->id, 'direction' => 'in', 'time' => '07:30'], $other)->assertNotFound();
});

it('compte les absents du jour et les appels manquants au tableau de bord', function (): void {
    [$school, $classroom, $teacher, $awa, $yao] = attendanceSchool();
    classroomOf($school, 'CE2');
    login($teacher);
    spa('PUT', '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-05', marks($awa, $yao), $school)->assertOk();

    actingAsRole(Role::Director, $school);
    spa('GET', '/api/v1/billing/dashboard', [], $school)->assertOk()
        ->assertJsonPath('data.attendance.absent_today', 1)
        ->assertJsonPath('data.attendance.late_today', 1)
        ->assertJsonPath('data.attendance.roll_calls_missing', 1)
        ->assertJsonPath('data.attendance.rates.0.date', '2026-10-05')
        ->assertJsonPath('data.attendance.rates.0.rate', 50);

    actingAsRole(Role::Accountant, $school);
    spa('GET', '/api/v1/billing/dashboard', [], $school)->assertOk()->assertJsonPath('data.attendance', null);
});
