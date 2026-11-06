<?php

declare(strict_types=1);

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Models\Grade;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * École maternelle et primaire, CE1 A tenue par une enseignante titulaire, deux élèves (Awa, Yao).
 *
 * @return array{0: School, 1: Classroom, 2: User, 3: Student, 4: Student}
 */
function gradingSchool(): array
{
    $school = makeSchool(['kindergarten', 'primary']);
    $teacher = makeUser();
    assignRole($teacher, $school, Role::Teacher, cycleOf($school, 'primary'));
    $classroom = classroomOf($school, 'CE1', 'A', ['homeroom_teacher_id' => $teacher->id]);
    $awa = enrollStudent($school, $classroom);
    $yao = enrollStudent($school, $classroom, ['first_name' => 'Yao', 'last_name' => 'Kouassi', 'gender' => 'M', 'guardian_phone' => '+2250505050505', 'guardian_name' => 'Paul Kouassi']);

    return [$school, $classroom, $teacher, $awa, $yao];
}

/**
 * Grille de la classe (période du jour, première matière) : identifiants de la période et des matières.
 *
 * @return array{term_id: string, subjects: list<string>}
 */
function gradeGrid(School $school, Classroom $classroom): array
{
    $grid = spa('GET', '/api/v1/classrooms/'.$classroom->id.'/grade-grid', [], $school)->assertOk();
    $subjects = $grid->json('data.subjects');

    return [
        'term_id' => jsonText($grid, 'data.term.id'),
        'subjects' => array_values(array_map(static fn (mixed $subject): string => is_array($subject) && is_string($subject['id'] ?? null) ? $subject['id'] : '', is_array($subjects) ? $subjects : [])),
    ];
}

/**
 * Texte de la réponse JSON au chemin donné (échec du test sinon).
 *
 * @param  TestResponse<Response>  $response
 */
function jsonText(TestResponse $response, string $path): string
{
    $value = $response->json($path);

    return is_string($value) ? $value : throw new LogicException("Texte attendu en {$path}.");
}

/**
 * @param  array<string, mixed>  $overrides
 * @return TestResponse<Response>
 */
function createAssessment(School $school, Classroom $classroom, string $termId, string $subjectId, array $overrides = []): TestResponse
{
    return spa('POST', '/api/v1/classrooms/'.$classroom->id.'/assessments', [
        'subject_id' => $subjectId,
        'term_id' => $termId,
        'title' => 'Dictée n° 1',
        'date' => '2026-10-02',
        'out_of' => 20,
        ...$overrides,
    ], $school);
}

beforeEach(function (): void {
    // Lundi 5 octobre 2026, 8 h à Abidjan : 1er trimestre
    Carbon::setTestNow('2026-10-05 08:00:00');
});

afterEach(function (): void {
    Carbon::setTestNow();
});

it('laisse la titulaire créer une évaluation, saisir les notes et voir les moyennes et rangs', function (): void {
    [$school, $classroom, $teacher, $awa, $yao] = gradingSchool();
    login($teacher);

    spa('GET', '/api/v1/grading/classrooms', [], $school)->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.mode', 'weighted_average')
        ->assertJsonPath('data.0.grade_scale', 10)
        ->assertJsonPath('data.0.can_manage', true);

    spa('GET', '/api/v1/classrooms/'.$classroom->id.'/grade-grid', [], $school)->assertOk()
        ->assertJsonPath('data.term.label', '1er trimestre')
        ->assertJsonCount(3, 'data.terms')
        ->assertJsonCount(6, 'data.subjects')
        ->assertJsonPath('data.subject.name', 'Français')
        ->assertJsonPath('data.subject.coefficient', 3)
        ->assertJsonCount(2, 'data.rows')
        ->assertJsonPath('data.rows.0.student.full_name', 'KONÉ Awa')
        ->assertJsonPath('data.can_manage', true);
    ['term_id' => $termId, 'subjects' => [$french, $maths]] = gradeGrid($school, $classroom);

    $dictation = jsonText(createAssessment($school, $classroom, $termId, $french)->assertCreated()->assertJsonPath('data.out_of', 20), 'data.id');
    spa('PUT', '/api/v1/assessments/'.$dictation.'/grades', ['grades' => [
        ['student_id' => $awa->id, 'value' => 14, 'absent' => false],
        ['student_id' => $yao->id, 'value' => null, 'absent' => true],
    ]], $school)->assertOk()
        ->assertJsonPath('data.assessments.0.title', 'Dictée n° 1')
        ->assertJsonPath('data.rows.0.grades.0.value', 14)
        ->assertJsonPath('data.rows.0.average', 7)
        ->assertJsonPath('data.rows.1.grades.0.absent', true)
        ->assertJsonPath('data.rows.1.average', null);

    $sums = jsonText(createAssessment($school, $classroom, $termId, $maths, ['title' => 'Calcul', 'out_of' => 10])->assertCreated(), 'data.id');
    spa('PUT', '/api/v1/assessments/'.$sums.'/grades', ['grades' => [
        ['student_id' => $awa->id, 'value' => 6, 'absent' => false],
        ['student_id' => $yao->id, 'value' => 9.5, 'absent' => false],
    ]], $school)->assertOk();

    // Awa : français 7 (×3), maths 6 (×3) → 6,5 ; Yao : maths 9,5 seulement → 9,5
    spa('GET', '/api/v1/classrooms/'.$classroom->id.'/results', [], $school)->assertOk()
        ->assertJsonPath('data.mode', 'weighted_average')
        ->assertJsonPath('data.rows.0.average', 6.5)
        ->assertJsonPath('data.rows.0.rank', 2)
        ->assertJsonPath('data.rows.0.subjects.0.average', 7)
        ->assertJsonPath('data.rows.1.average', 9.5)
        ->assertJsonPath('data.rows.1.rank', 1)
        ->assertJsonPath('data.class_average', 8)
        ->assertJsonPath('data.highest', 9.5)
        ->assertJsonPath('data.lowest', 6.5)
        ->assertJsonPath('data.ranked_count', 2);

    // Note effacée (ni valeur ni absence) : non saisie
    spa('PUT', '/api/v1/assessments/'.$sums.'/grades', ['grades' => [['student_id' => $yao->id, 'value' => null, 'absent' => false]]], $school)->assertOk()
        ->assertJsonPath('data.rows.1.grades.0.value', null)
        ->assertJsonPath('data.rows.1.grades.0.absent', false);

    spa('PATCH', '/api/v1/assessments/'.$sums, ['subject_id' => $maths, 'term_id' => $termId, 'title' => 'Calcul mental', 'date' => '2026-10-05', 'out_of' => 10], $school)->assertOk()
        ->assertJsonPath('data.title', 'Calcul mental');
    spa('DELETE', '/api/v1/assessments/'.$sums, [], $school)->assertNoContent();
    expect(inSchool($school, static fn (): int => Grade::query()->count()))->toBe(2);
});

it('valide les évaluations et les notes', function (): void {
    [$school, $classroom, $teacher, $awa] = gradingSchool();
    login($teacher);
    ['term_id' => $termId, 'subjects' => [$french]] = gradeGrid($school, $classroom);
    $other = makeSchool(['primary']);

    createAssessment($school, $classroom, $termId, $french, ['date' => '2027-01-10'])->assertUnprocessable()->assertJsonValidationErrors('date');
    createAssessment($school, $classroom, $termId, (string) Str::uuid())->assertUnprocessable()->assertJsonValidationErrors('subject_id');
    createAssessment($school, $classroom, (string) Str::uuid(), $french)->assertUnprocessable()->assertJsonValidationErrors('term_id');
    createAssessment($school, $classroom, $termId, $french, ['out_of' => 0, 'title' => ''])->assertUnprocessable()->assertJsonValidationErrors(['out_of', 'title']);

    $id = jsonText(createAssessment($school, $classroom, $termId, $french, ['out_of' => 10])->assertCreated(), 'data.id');
    $uri = '/api/v1/assessments/'.$id.'/grades';
    spa('PUT', $uri, ['grades' => [['student_id' => $awa->id, 'value' => 12, 'absent' => false]]], $school)->assertUnprocessable()->assertJsonValidationErrors('grades.0.value');
    spa('PUT', $uri, ['grades' => [['student_id' => $awa->id, 'value' => 7.125, 'absent' => false]]], $school)->assertUnprocessable()->assertJsonValidationErrors('grades.0.value');
    $stranger = enrollStudent($other, classroomOf($other, 'CE1'));
    spa('PUT', $uri, ['grades' => [['student_id' => $stranger->id, 'value' => 5, 'absent' => false]]], $school)->assertUnprocessable()->assertJsonValidationErrors('grades.0.student_id');

    spa('PUT', $uri, ['grades' => [['student_id' => $awa->id, 'value' => 8.25, 'absent' => false]]], $school)->assertOk()->assertJsonPath('data.rows.0.grades.0.value', 8.25);
    spa('PATCH', '/api/v1/assessments/'.$id, ['subject_id' => $french, 'term_id' => $termId, 'title' => 'Dictée', 'date' => '2026-10-02', 'out_of' => 5], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('out_of');
});

it('réserve la saisie à la titulaire et à la direction du cycle', function (): void {
    [$school, $classroom, $teacher, $awa] = gradingSchool();
    login($teacher);
    ['term_id' => $termId, 'subjects' => [$french]] = gradeGrid($school, $classroom);
    $id = jsonText(createAssessment($school, $classroom, $termId, $french)->assertCreated(), 'data.id');
    $grid = '/api/v1/classrooms/'.$classroom->id.'/grade-grid';
    $grades = ['grades' => [['student_id' => $awa->id, 'value' => 10, 'absent' => false]]];

    // Autre enseignante du cycle, parent, direction de la maternelle : la classe n'existe pas pour eux
    $other = makeUser();
    assignRole($other, $school, Role::Teacher, cycleOf($school, 'primary'));
    login($other);
    spa('GET', $grid, [], $school)->assertNotFound();
    spa('PUT', '/api/v1/assessments/'.$id.'/grades', $grades, $school)->assertNotFound();
    foreach ([[Role::Guardian, null], [Role::Director, 'kindergarten']] as [$role, $cycle]) {
        actingAsRole($role, $school, $cycle === null ? null : cycleOf($school, $cycle));
        spa('GET', $grid, [], $school)->assertNotFound();
        spa('PATCH', '/api/v1/assessments/'.$id, ['subject_id' => $french, 'term_id' => $termId, 'title' => 'X', 'date' => '2026-10-02', 'out_of' => 20], $school)->assertNotFound();
    }

    // Secrétariat : consulte sans saisir
    actingAsRole(Role::Secretary, $school);
    spa('GET', $grid, [], $school)->assertOk()->assertJsonPath('data.can_manage', false);
    spa('GET', '/api/v1/classrooms/'.$classroom->id.'/results', [], $school)->assertOk();
    spa('PUT', '/api/v1/assessments/'.$id.'/grades', $grades, $school)->assertForbidden();
    createAssessment($school, $classroom, $termId, $french)->assertForbidden();
    spa('DELETE', '/api/v1/assessments/'.$id, [], $school)->assertForbidden();

    // Direction du primaire : saisit
    actingAsRole(Role::Director, $school, cycleOf($school, 'primary'));
    spa('PUT', '/api/v1/assessments/'.$id.'/grades', $grades, $school)->assertOk();
});

it('isole les notes entre établissements', function (): void {
    [$school, $classroom, $teacher, $awa] = gradingSchool();
    login($teacher);
    ['term_id' => $termId, 'subjects' => [$french]] = gradeGrid($school, $classroom);
    $id = jsonText(createAssessment($school, $classroom, $termId, $french)->assertCreated(), 'data.id');

    $other = makeSchool(['kindergarten', 'primary']);
    actingAsRole(Role::Director, $other);
    spa('GET', '/api/v1/classrooms/'.$classroom->id.'/grade-grid', [], $other)->assertNotFound();
    spa('GET', '/api/v1/classrooms/'.$classroom->id.'/results', [], $other)->assertNotFound();
    spa('GET', '/api/v1/classrooms/'.$classroom->id.'/skills', [], $other)->assertNotFound();
    createAssessment($other, $classroom, $termId, $french)->assertNotFound();
    spa('PATCH', '/api/v1/assessments/'.$id, ['subject_id' => $french, 'term_id' => $termId, 'title' => 'X', 'date' => '2026-10-02', 'out_of' => 20], $other)->assertNotFound();
    spa('PUT', '/api/v1/assessments/'.$id.'/grades', ['grades' => [['student_id' => $awa->id, 'value' => 1, 'absent' => false]]], $other)->assertNotFound();
    spa('DELETE', '/api/v1/assessments/'.$id, [], $other)->assertNotFound();
    spa('GET', '/api/v1/grading/classrooms', [], $other)->assertOk()->assertJsonCount(0, 'data');
    spa('PUT', '/api/v1/grading/levels/'.levelOf($school, 'CE1')->id.'/subjects', ['academic_year_id' => currentYearOf($school)->id, 'subjects' => [['name' => 'Lecture', 'coefficient' => 2]]], $other)->assertNotFound();
    spa('PUT', '/api/v1/grading/cycles/'.cycleOf($school, 'primary')->id.'/terms', ['academic_year_id' => currentYearOf($school)->id, 'terms' => []], $other)->assertNotFound();
    spa('GET', '/api/v1/grading/settings?cycle_id='.cycleOf($school, 'primary')->id, [], $other)->assertUnprocessable();
});

it('laisse la direction régler périodes, matières et coefficients du cycle', function (): void {
    [$school, $classroom, $teacher] = gradingSchool();
    $primary = cycleOf($school, 'primary');
    $year = currentYearOf($school);
    $level = levelOf($school, 'CE1');

    actingAsRole(Role::Director, $school, $primary);
    $settings = spa('GET', '/api/v1/grading/settings?cycle_id='.$primary->id, [], $school)->assertOk()
        ->assertJsonPath('data.cycle.term_type', 'trimester')
        ->assertJsonPath('data.cycle.grade_scale', 10)
        ->assertJsonPath('data.academic_year.label', '2026-2027')
        ->assertJsonCount(3, 'data.terms')
        ->assertJsonPath('data.terms.1.starts_on', '2027-01-05')
        ->assertJsonCount(6, 'data.levels')
        ->assertJsonPath('data.levels.2.name', 'CE1')
        ->assertJsonCount(6, 'data.levels.2.subjects')
        ->assertJsonCount(0, 'data.skills')
        ->assertJsonPath('data.can_manage', true);
    $french = jsonText($settings, 'data.levels.2.subjects.0.id');

    $terms = [
        ['label' => 'Trimestre 1', 'starts_on' => '2026-09-14', 'ends_on' => '2026-12-18'],
        ['label' => 'Trimestre 2', 'starts_on' => '2027-01-04', 'ends_on' => '2027-03-26'],
        ['label' => 'Trimestre 3', 'starts_on' => '2027-04-06', 'ends_on' => '2027-07-02'],
    ];
    $termsUri = '/api/v1/grading/cycles/'.$primary->id.'/terms';
    spa('PUT', $termsUri, ['academic_year_id' => $year->id, 'terms' => [...array_slice($terms, 0, 2), ['label' => 'T3', 'starts_on' => '2027-03-20', 'ends_on' => '2027-07-02']]], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('terms.2.starts_on');
    spa('PUT', $termsUri, ['academic_year_id' => $year->id, 'terms' => array_slice($terms, 0, 2)], $school)->assertUnprocessable()->assertJsonValidationErrors('terms');
    spa('PUT', $termsUri, ['academic_year_id' => $year->id, 'terms' => $terms], $school)->assertOk()
        ->assertJsonPath('data.terms.0.label', 'Trimestre 1')
        ->assertJsonPath('data.terms.0.ends_on', '2026-12-18');

    $subjectsUri = '/api/v1/grading/levels/'.$level->id.'/subjects';
    spa('PUT', $subjectsUri, ['academic_year_id' => $year->id, 'subjects' => [
        ['id' => $french, 'name' => 'Français', 'coefficient' => 4],
        ['name' => 'Mathématiques', 'coefficient' => 3],
        ['name' => 'mathématiques', 'coefficient' => 3],
    ]], $school)->assertUnprocessable()->assertJsonValidationErrors('subjects.2.name');
    spa('PUT', $subjectsUri, ['academic_year_id' => $year->id, 'subjects' => [
        ['id' => $french, 'name' => 'Français', 'coefficient' => 4],
        ['name' => 'Lecture', 'coefficient' => 2],
    ]], $school)->assertOk()
        ->assertJsonCount(2, 'data.levels.2.subjects')
        ->assertJsonPath('data.levels.2.subjects.0.coefficient', 4)
        ->assertJsonPath('data.levels.2.subjects.1.name', 'Lecture');

    // Une matière évaluée ne se retire plus
    login($teacher);
    ['term_id' => $termId] = gradeGrid($school, $classroom);
    createAssessment($school, $classroom, $termId, $french)->assertCreated();
    actingAsRole(Role::Director, $school, $primary);
    spa('PUT', $subjectsUri, ['academic_year_id' => $year->id, 'subjects' => [['name' => 'Lecture', 'coefficient' => 2]]], $school)
        ->assertConflict()->assertJsonPath('code', 'subject_used');
    spa('PUT', '/api/v1/grading/cycles/'.$primary->id.'/skills', ['academic_year_id' => $year->id, 'skills' => [['domain' => 'Oral', 'label' => 'Parle']]], $school)
        ->assertConflict()->assertJsonPath('code', 'wrong_mode');

    // Enseignante, direction de la maternelle : pas de réglages du primaire
    login($teacher);
    spa('GET', '/api/v1/grading/settings?cycle_id='.$primary->id, [], $school)->assertForbidden();
    spa('PUT', $subjectsUri, ['academic_year_id' => $year->id, 'subjects' => [['name' => 'Lecture', 'coefficient' => 2]]], $school)->assertForbidden();
    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));
    spa('PUT', $termsUri, ['academic_year_id' => $year->id, 'terms' => $terms], $school)->assertForbidden();

    // Année clôturée : plus rien ne change
    inSchool($school, static fn (): bool => AcademicYear::query()->whereKey($year->id)->update(['status' => AcademicYearStatus::Closed]) > 0);
    actingAsRole(Role::Director, $school, $primary);
    spa('PUT', $termsUri, ['academic_year_id' => $year->id, 'terms' => $terms], $school)->assertConflict()->assertJsonPath('code', 'year_closed');
    login($teacher);
    createAssessment($school, $classroom, $termId, $french)->assertConflict()->assertJsonPath('code', 'year_closed');
});

it('évalue les compétences en maternelle', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    $teacher = makeUser();
    $kindergarten = cycleOf($school, 'kindergarten');
    assignRole($teacher, $school, Role::Teacher, $kindergarten);
    $classroom = classroomOf($school, 'MS', 'A', ['homeroom_teacher_id' => $teacher->id]);
    $awa = enrollStudent($school, $classroom, ['birth_date' => '2022-03-14']);
    login($teacher);
    $uri = '/api/v1/classrooms/'.$classroom->id.'/skills';

    spa('GET', '/api/v1/classrooms/'.$classroom->id.'/grade-grid', [], $school)->assertConflict()->assertJsonPath('code', 'wrong_mode');
    $grid = spa('GET', $uri, [], $school)->assertOk()
        ->assertJsonPath('data.term.label', 'Année')
        ->assertJsonCount(10, 'data.skills')
        ->assertJsonPath('data.skills.0.domain', 'Langage oral')
        ->assertJsonPath('data.rows.0.levels.0.level', null)
        ->assertJsonPath('data.can_manage', true);
    $termId = jsonText($grid, 'data.term.id');
    $skills = array_values(array_map(static fn (mixed $skill): string => is_array($skill) && is_string($skill['id'] ?? null) ? $skill['id'] : '', (array) $grid->json('data.skills')));

    spa('PUT', $uri, ['term_id' => $termId, 'evaluations' => [['student_id' => $awa->id, 'skill_id' => (string) Str::uuid(), 'level' => 'A']]], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('evaluations.0.skill_id');
    spa('PUT', $uri, ['term_id' => $termId, 'evaluations' => [
        ['student_id' => $awa->id, 'skill_id' => $skills[0], 'level' => 'A'],
        ['student_id' => $awa->id, 'skill_id' => $skills[1], 'level' => 'EA'],
        ['student_id' => $awa->id, 'skill_id' => $skills[2], 'level' => 'NA'],
    ]], $school)->assertOk()
        ->assertJsonPath('data.rows.0.levels.0.level', 'A')
        ->assertJsonPath('data.rows.0.levels.1.level', 'EA');
    spa('PUT', $uri, ['term_id' => $termId, 'evaluations' => [['student_id' => $awa->id, 'skill_id' => $skills[2], 'level' => null]]], $school)->assertOk()
        ->assertJsonPath('data.rows.0.levels.2.level', null);

    spa('GET', '/api/v1/classrooms/'.$classroom->id.'/results', [], $school)->assertOk()
        ->assertJsonPath('data.mode', 'competency')
        ->assertJsonPath('data.rows.0.skills.A', 1)
        ->assertJsonPath('data.rows.0.skills.EA', 1)
        ->assertJsonPath('data.rows.0.average', null);

    // Compétence évaluée : ne se retire plus du référentiel
    actingAsRole(Role::Director, $school, $kindergarten);
    spa('PUT', '/api/v1/grading/cycles/'.$kindergarten->id.'/skills', ['academic_year_id' => currentYearOf($school)->id, 'skills' => [['id' => $skills[1], 'domain' => 'Langage oral', 'label' => 'Récite une comptine']]], $school)
        ->assertConflict()->assertJsonPath('code', 'skill_used');
    spa('PUT', '/api/v1/grading/cycles/'.$kindergarten->id.'/skills', ['academic_year_id' => currentYearOf($school)->id, 'skills' => [
        ['id' => $skills[0], 'domain' => 'Langage oral', 'label' => 'S’exprime par une phrase complète'],
        ['id' => $skills[1], 'domain' => 'Langage oral', 'label' => 'Récite une comptine'],
        ['domain' => 'Graphisme', 'label' => 'Trace des lignes'],
    ]], $school)->assertOk()->assertJsonCount(3, 'data.skills')->assertJsonPath('data.skills.2.domain', 'Graphisme');
});

it('applique les notes saisies hors connexion une seule fois, sans écraser une saisie plus récente', function (): void {
    [$school, $classroom, $teacher, $awa, $yao] = gradingSchool();
    login($teacher);
    ['term_id' => $termId, 'subjects' => [$french]] = gradeGrid($school, $classroom);
    $assessmentId = (string) Str::uuid();
    $operations = ['operations' => [
        ['id' => (string) Str::uuid(), 'type' => 'grades.assessment', 'payload' => [
            'assessment_id' => $assessmentId, 'classroom_id' => $classroom->id, 'subject_id' => $french, 'term_id' => $termId,
            'title' => 'Dictée', 'date' => '2026-10-02', 'out_of' => 10, 'recorded_at' => '2026-10-05T07:00:00Z',
        ]],
        ['id' => (string) Str::uuid(), 'type' => 'grades.save', 'payload' => [
            'assessment_id' => $assessmentId, 'recorded_at' => '2026-10-05T07:00:00Z',
            'grades' => [['student_id' => $awa->id, 'value' => 8, 'absent' => false], ['student_id' => $yao->id, 'value' => 6, 'absent' => false]],
        ]],
    ]];

    spa('POST', '/api/v1/sync', $operations, $school)->assertOk()
        ->assertJsonPath('data.0.status', 'applied')
        ->assertJsonPath('data.1.status', 'applied');
    spa('POST', '/api/v1/sync', $operations, $school)->assertOk()->assertJsonPath('data.1.replayed', true);

    // Correction en ligne à 8 h 30, puis un envoi plus ancien de l'appareil (7 h 15) : la correction reste
    Carbon::setTestNow('2026-10-05 08:30:00');
    login($teacher);
    spa('PUT', '/api/v1/assessments/'.$assessmentId.'/grades', ['grades' => [['student_id' => $awa->id, 'value' => 9, 'absent' => false]]], $school)->assertOk();
    spa('POST', '/api/v1/sync', ['operations' => [['id' => (string) Str::uuid(), 'type' => 'grades.save', 'payload' => [
        'assessment_id' => $assessmentId, 'recorded_at' => '2026-10-05T07:15:00Z',
        'grades' => [['student_id' => $awa->id, 'value' => 5, 'absent' => false], ['student_id' => $yao->id, 'value' => 7, 'absent' => false]],
    ]]]], $school)->assertOk()->assertJsonPath('data.0.status', 'applied');
    spa('GET', '/api/v1/classrooms/'.$classroom->id.'/grade-grid?term_id='.$termId.'&subject_id='.$french, [], $school)->assertOk()
        ->assertJsonPath('data.rows.0.grades.0.value', 9)
        ->assertJsonPath('data.rows.1.grades.0.value', 7);

    // Hors droits : refus enregistré
    actingAsRole(Role::Secretary, $school);
    spa('POST', '/api/v1/sync', ['operations' => [['id' => (string) Str::uuid(), 'type' => 'grades.save', 'payload' => [
        'assessment_id' => $assessmentId, 'recorded_at' => '2026-10-05T07:15:00Z', 'grades' => [],
    ]]]], $school)->assertOk()->assertJsonPath('data.0.status', 'rejected')->assertJsonPath('data.0.code', 'forbidden');
});
