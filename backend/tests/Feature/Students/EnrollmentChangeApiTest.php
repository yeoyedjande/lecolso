<?php

declare(strict_types=1);

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Identity\Enums\Role;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;

function enrollmentOf(School $school, Student $student): Enrollment
{
    return inSchool($school, static fn (): Enrollment => Enrollment::query()->where('student_id', $student->id)->firstOrFail());
}

it('change un élève de classe dans la même année', function (): void {
    $school = makeSchool(['primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    $b = classroomOf($school, 'CE1', 'B');
    actingAsRole(Role::Secretary, $school);

    spa('PATCH', '/api/v1/enrollments/'.enrollmentOf($school, $student)->id, ['classroom_id' => $b->id], $school)
        ->assertOk()->assertJsonPath('data.enrollments.0.classroom.name', 'CE1 B');
});

it('refuse une classe complète ou d’une autre année', function (): void {
    $school = makeSchool(['primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    $full = classroomOf($school, 'CE1', 'B', ['capacity' => 1]);
    enrollStudent($school, $full, ['guardian_phone' => '+2250102030405']);
    $nextYear = inSchool($school, static fn (): AcademicYear => AcademicYear::factory()->createOne(['label' => '2027-2028', 'starts_on' => '2027-09-06', 'ends_on' => '2028-07-14', 'is_current' => false]));
    $later = inSchool($school, static fn (): Classroom => Classroom::factory()->createOne(['academic_year_id' => $nextYear->id, 'level_id' => levelOf($school, 'CE2')->id]));
    $enrollment = enrollmentOf($school, $student);
    actingAsRole(Role::Director, $school);

    spa('PATCH', '/api/v1/enrollments/'.$enrollment->id, ['classroom_id' => $full->id], $school)
        ->assertStatus(409)->assertJsonPath('code', 'classroom_full');
    spa('PATCH', '/api/v1/enrollments/'.$enrollment->id, ['classroom_id' => $later->id], $school)
        ->assertStatus(409)->assertJsonPath('code', 'other_year');
});

it('note le départ d’un élève puis son retour', function (): void {
    $school = makeSchool(['primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    $enrollment = enrollmentOf($school, $student);
    actingAsRole(Role::Director, $school);

    spa('PATCH', '/api/v1/enrollments/'.$enrollment->id, ['status' => 'left'], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('left_on');
    spa('PATCH', '/api/v1/enrollments/'.$enrollment->id, ['status' => 'left', 'left_on' => '2026-12-18', 'leave_reason' => 'Déménagement à Yamoussoukro'], $school)
        ->assertOk()
        ->assertJsonPath('data.enrollments.0.status', 'left')
        ->assertJsonPath('data.enrollments.0.left_on', '2026-12-18')
        ->assertJsonPath('data.enrollments.0.leave_reason', 'Déménagement à Yamoussoukro');

    spa('GET', '/api/v1/students', [], $school)->assertJsonCount(0, 'data');
    spa('GET', '/api/v1/students?status=left', [], $school)->assertJsonCount(1, 'data');

    spa('PATCH', '/api/v1/enrollments/'.$enrollment->id, ['status' => 'active'], $school)
        ->assertOk()->assertJsonPath('data.enrollments.0.status', 'active')->assertJsonPath('data.enrollments.0.left_on', null);
});

it('fige l’inscription d’une année clôturée', function (): void {
    $school = makeSchool(['primary']);
    $classroom = classroomOf($school, 'CE1');
    $student = enrollStudent($school, $classroom);
    inSchool($school, static fn () => $classroom->academicYear->forceFill(['status' => AcademicYearStatus::Closed, 'is_current' => false])->save());
    actingAsRole(Role::Director, $school);

    spa('PATCH', '/api/v1/enrollments/'.enrollmentOf($school, $student)->id, ['status' => 'left', 'left_on' => '2027-01-10'], $school)
        ->assertStatus(409)->assertJsonPath('code', 'year_closed');
});

it('exige le droit sur la classe d’arrivée et isole les écoles', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    $student = enrollStudent($school, classroomOf($school, 'GS'));
    $cp1 = classroomOf($school, 'CP1');
    $enrollment = enrollmentOf($school, $student);

    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));
    spa('PATCH', '/api/v1/enrollments/'.$enrollment->id, ['classroom_id' => $cp1->id], $school)->assertForbidden();

    $other = makeSchool(['primary']);
    actingAsRole(Role::Director, $other);
    spa('PATCH', '/api/v1/enrollments/'.$enrollment->id, ['status' => 'left', 'left_on' => '2026-12-18'], $other)->assertNotFound();
});

it('ne supprime pas une classe qui a des élèves et compte ses inscrits', function (): void {
    $school = makeSchool(['primary']);
    $classroom = classroomOf($school, 'CE1', 'A', ['capacity' => 30]);
    enrollStudent($school, $classroom);
    actingAsRole(Role::Director, $school);

    spa('GET', '/api/v1/classrooms', [], $school)->assertJsonPath('data.0.enrolled_count', 1);
    spa('DELETE', '/api/v1/classrooms/'.$classroom->id, [], $school)
        ->assertStatus(409)->assertJsonPath('code', 'classroom_not_empty');
});
