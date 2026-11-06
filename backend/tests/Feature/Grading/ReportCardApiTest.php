<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Models\ReportCard;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;
use App\Support\Pdf\FakePdfRenderer;
use App\Support\Pdf\PdfRenderer;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;

use function Pest\Laravel\get;

/**
 * CE1 A (titulaire), Awa et Yao ; une dictée sur 20 au 1er trimestre : Awa 17, Yao 9.
 *
 * @return array{0: School, 1: Classroom, 2: User, 3: Student, 4: Student, 5: string, 6: string, 7: string}
 */
function bulletinSchool(): array
{
    $school = makeSchool(['daycare', 'kindergarten', 'primary']);
    $teacher = makeUser();
    assignRole($teacher, $school, Role::Teacher, cycleOf($school, 'primary'));
    $classroom = classroomOf($school, 'CE1', 'A', ['homeroom_teacher_id' => $teacher->id]);
    $awa = enrollStudent($school, $classroom);
    $yao = enrollStudent($school, $classroom, ['first_name' => 'Yao', 'last_name' => 'Kouassi', 'gender' => 'M', 'guardian_phone' => '+2250505050505', 'guardian_name' => 'Paul Kouassi']);

    login($teacher);
    $grid = spa('GET', '/api/v1/classrooms/'.$classroom->id.'/grade-grid', [], $school)->assertOk();
    $termId = text($grid, 'data.term.id');
    $french = text($grid, 'data.subjects.0.id');
    $dictation = text(spa('POST', '/api/v1/classrooms/'.$classroom->id.'/assessments', [
        'subject_id' => $french, 'term_id' => $termId, 'title' => 'Dictée', 'date' => '2026-10-02', 'out_of' => 20,
    ], $school)->assertCreated(), 'data.id');
    spa('PUT', '/api/v1/assessments/'.$dictation.'/grades', ['grades' => [
        ['student_id' => $awa->id, 'value' => 17, 'absent' => false],
        ['student_id' => $yao->id, 'value' => 9, 'absent' => false],
    ]], $school)->assertOk();

    return [$school, $classroom, $teacher, $awa, $yao, $termId, $french, $dictation];
}

/**
 * @param  TestResponse<Response>  $response
 */
function text(TestResponse $response, string $path): string
{
    $value = $response->json($path);

    return is_string($value) ? $value : throw new LogicException("Texte attendu en {$path}.");
}

function pdfRenderer(): FakePdfRenderer
{
    // GOTENBERG_URL vide en test (phpunit.xml) : rendu factice
    return app(PdfRenderer::class);
}

beforeEach(function (): void {
    Carbon::setTestNow('2026-10-05 08:00:00');
    Storage::fake();
});

afterEach(function (): void {
    Carbon::setTestNow();
});

it('fait rédiger les appréciations, valide la classe, rend les bulletins PDF et fige les notes', function (): void {
    [$school, $classroom, $teacher, $awa, $yao, $termId, $french, $dictation] = bulletinSchool();
    $uri = '/api/v1/classrooms/'.$classroom->id;

    // Titulaire : appréciation générale et par matière, pas de mention
    login($teacher);
    spa('PUT', $uri.'/appreciations', ['term_id' => $termId, 'student_id' => $awa->id, 'teacher_comment' => 'Très bon trimestre.', 'subjects' => [['subject_id' => $french, 'comment' => 'Belle écriture']]], $school)->assertOk()
        ->assertJsonPath('data.document', 'report_card')
        ->assertJsonPath('data.can_comment', true)
        ->assertJsonPath('data.can_validate', false)
        ->assertJsonPath('data.rows.0.teacher_comment', 'Très bon trimestre.')
        ->assertJsonPath('data.rows.0.subjects.0.comment', 'Belle écriture')
        ->assertJsonPath('data.rows.0.subjects.0.average', 8.5)
        // 8,5 sur 10 : félicitations proposées ; 4,5 : rien
        ->assertJsonPath('data.rows.0.mention', 'congratulations')
        ->assertJsonPath('data.rows.1.mention', null);
    spa('PUT', $uri.'/appreciations', ['term_id' => $termId, 'student_id' => $yao->id, 'mention' => 'encouragement'], $school)->assertForbidden();
    spa('POST', $uri.'/report-cards/close', ['term_id' => $termId], $school)->assertForbidden();

    // Direction : observation et mention choisie, puis validation
    $director = actingAsRole(Role::Director, $school, cycleOf($school, 'primary'));
    spa('PUT', $uri.'/appreciations', ['term_id' => $termId, 'student_id' => $yao->id, 'director_comment' => 'Des efforts à poursuivre.', 'mention' => 'encouragement'], $school)->assertOk()
        ->assertJsonPath('data.rows.1.mention', 'encouragement')
        ->assertJsonPath('data.rows.1.mention_chosen', true)
        ->assertJsonPath('data.rows.1.mention_proposed', null);
    $closed = spa('POST', $uri.'/report-cards/close', ['term_id' => $termId], $school)->assertOk()
        ->assertJsonPath('data.closure.closed_by', $director->name)
        ->assertJsonPath('data.can_comment', false)
        ->assertJsonPath('data.ready_count', 2)
        ->assertJsonPath('data.rows.0.report_card.status', 'ready')
        ->assertJsonPath('data.rows.0.mention', 'congratulations');
    spa('POST', $uri.'/report-cards/close', ['term_id' => $termId], $school)->assertConflict()->assertJsonPath('code', 'already_closed');

    $html = pdfRenderer()->rendered;
    expect($html)->toHaveCount(2)
        ->and($html[0])->toContain('Bulletin de notes', 'KONÉ Awa', 'Très bon trimestre.', 'Belle écriture', 'Mention : Félicitations', '8,50', '1er')
        ->and($html[1])->toContain('KOUASSI Yao', 'Des efforts à poursuivre.', 'Mention : Encouragements');

    // PDF : URL signée de 10 minutes, fichier privé à nom aléatoire
    $url = text($closed, 'data.rows.0.report_card.pdf_url');
    $parts = parse_url($url);
    $path = is_array($parts) ? ($parts['path'] ?? '') : '';
    $file = get($path.'?'.(is_array($parts) ? ($parts['query'] ?? '') : ''))->assertOk()->assertHeader('Content-Type', 'application/pdf');
    expect($file->getContent())->toStartWith('%PDF');
    get($path)->assertForbidden();

    // Période validée : plus aucune saisie, en ligne comme hors connexion
    login($teacher);
    spa('GET', $uri.'/grade-grid?term_id='.$termId, [], $school)->assertOk()->assertJsonPath('data.closed', true)->assertJsonPath('data.can_manage', false);
    spa('PUT', '/api/v1/assessments/'.$dictation.'/grades', ['grades' => [['student_id' => $yao->id, 'value' => 12, 'absent' => false]]], $school)
        ->assertConflict()->assertJsonPath('code', 'term_closed');
    spa('DELETE', '/api/v1/assessments/'.$dictation, [], $school)->assertConflict()->assertJsonPath('code', 'term_closed');
    spa('PUT', $uri.'/appreciations', ['term_id' => $termId, 'student_id' => $awa->id, 'teacher_comment' => 'Autre'], $school)
        ->assertConflict()->assertJsonPath('code', 'term_closed');
    spa('POST', '/api/v1/sync', ['operations' => [['id' => (string) Str::uuid(), 'type' => 'grades.save', 'payload' => [
        'assessment_id' => $dictation, 'recorded_at' => '2026-10-05T07:00:00Z', 'grades' => [['student_id' => $yao->id, 'value' => 12, 'absent' => false]],
    ]]]], $school)->assertOk()->assertJsonPath('data.0.status', 'rejected')->assertJsonPath('data.0.code', 'term_closed');

    // Déverrouillage : direction seulement, motif obligatoire, gardé dans l'historique
    spa('POST', $uri.'/report-cards/reopen', ['term_id' => $termId, 'reason' => 'Erreur'], $school)->assertForbidden();
    actingAsRole(Role::Director, $school, cycleOf($school, 'primary'));
    spa('POST', $uri.'/report-cards/reopen', ['term_id' => $termId], $school)->assertUnprocessable()->assertJsonValidationErrors('reason');
    spa('POST', $uri.'/report-cards/reopen', ['term_id' => $termId, 'reason' => 'Note de Yao mal reportée'], $school)->assertOk()
        ->assertJsonPath('data.closure', null)
        ->assertJsonPath('data.history.0.reopen_reason', 'Note de Yao mal reportée')
        ->assertJsonPath('data.rows.0.report_card', null)
        ->assertJsonPath('data.rows.1.mention', 'encouragement');
    spa('POST', $uri.'/report-cards/reopen', ['term_id' => $termId, 'reason' => 'Encore'], $school)->assertConflict()->assertJsonPath('code', 'not_closed');
    login($teacher);
    spa('PUT', '/api/v1/assessments/'.$dictation.'/grades', ['grades' => [['student_id' => $yao->id, 'value' => 12, 'absent' => false]]], $school)->assertOk();
});

it('rend le livret de compétences de la maternelle et refuse la garderie, sans document', function (): void {
    $school = makeSchool(['daycare', 'kindergarten']);
    $classroom = classroomOf($school, 'MS');
    $awa = enrollStudent($school, $classroom, ['birth_date' => '2022-03-14']);
    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));
    $grid = spa('GET', '/api/v1/classrooms/'.$classroom->id.'/skills', [], $school)->assertOk();
    $termId = text($grid, 'data.term.id');
    spa('PUT', '/api/v1/classrooms/'.$classroom->id.'/skills', ['term_id' => $termId, 'evaluations' => [
        ['student_id' => $awa->id, 'skill_id' => text($grid, 'data.skills.0.id'), 'level' => 'A'],
    ]], $school)->assertOk();

    spa('POST', '/api/v1/classrooms/'.$classroom->id.'/report-cards/close', ['term_id' => $termId], $school)->assertOk()
        ->assertJsonPath('data.document', 'skills_booklet')
        ->assertJsonPath('data.rows.0.skills.A', 1)
        ->assertJsonPath('data.rows.0.mention', null)
        ->assertJsonPath('data.ready_count', 1);
    expect(pdfRenderer()->rendered[0])->toContain('Livret de compétences', 'S’exprime par une phrase complète', 'Acquis', 'Non évaluée');
    spa('PUT', '/api/v1/classrooms/'.$classroom->id.'/skills', ['term_id' => $termId, 'evaluations' => [
        ['student_id' => $awa->id, 'skill_id' => text($grid, 'data.skills.1.id'), 'level' => 'EA'],
    ]], $school)->assertConflict()->assertJsonPath('code', 'term_closed');

    actingAsRole(Role::Director, $school);
    $creche = classroomOf($school, 'CRECHE');
    spa('GET', '/api/v1/classrooms/'.$creche->id.'/report-cards', [], $school)->assertConflict()->assertJsonPath('code', 'no_report');
});

it('note un rendu PDF en échec et laisse la direction le relancer', function (): void {
    [$school, $classroom, , , , $termId] = bulletinSchool();
    pdfRenderer()->failing = true;
    actingAsRole(Role::Director, $school);
    $uri = '/api/v1/classrooms/'.$classroom->id.'/report-cards';
    spa('POST', $uri.'/close', ['term_id' => $termId], $school)->assertOk()
        ->assertJsonPath('data.failed_count', 2)
        ->assertJsonPath('data.rows.0.report_card.status', 'failed')
        ->assertJsonPath('data.rows.0.report_card.pdf_url', null);

    pdfRenderer()->failing = false;
    spa('POST', $uri.'/retry', ['term_id' => $termId], $school)->assertOk()
        ->assertJsonPath('data.failed_count', 0)
        ->assertJsonPath('data.ready_count', 2);
    expect(inSchool($school, static fn (): int => ReportCard::query()->whereNotNull('path')->count()))->toBe(2);
});

it('laisse la direction régler les seuils des mentions du cycle', function (): void {
    [$school, $classroom, $teacher, , , $termId] = bulletinSchool();
    $primary = cycleOf($school, 'primary');
    $uri = '/api/v1/grading/cycles/'.$primary->id.'/mentions';

    actingAsRole(Role::Director, $school, $primary);
    spa('GET', '/api/v1/grading/settings?cycle_id='.$primary->id, [], $school)->assertOk()
        ->assertJsonPath('data.mentions.congratulations', 8)
        ->assertJsonPath('data.mentions.warning_below', 4);
    spa('PUT', $uri, ['congratulations' => 7, 'honor_roll' => 8, 'encouragement' => 6, 'warning_below' => 4], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('honor_roll');
    spa('PUT', $uri, ['congratulations' => 9, 'honor_roll' => 8, 'encouragement' => 6, 'warning_below' => 5], $school)->assertOk()
        ->assertJsonPath('data.mentions.congratulations', 9);
    // Awa 8,5 : tableau d'honneur ; Yao 4,5 : avertissement
    spa('GET', '/api/v1/classrooms/'.$classroom->id.'/report-cards?term_id='.$termId, [], $school)->assertOk()
        ->assertJsonPath('data.rows.0.mention', 'honor_roll')
        ->assertJsonPath('data.rows.1.mention', 'warning');

    login($teacher);
    spa('PUT', $uri, ['congratulations' => 9, 'honor_roll' => 8, 'encouragement' => 6, 'warning_below' => 5], $school)->assertForbidden();
});

it('isole les bulletins entre établissements', function (): void {
    [$school, $classroom, , $awa, , $termId] = bulletinSchool();
    $other = makeSchool(['kindergarten', 'primary']);
    actingAsRole(Role::Director, $other);
    $uri = '/api/v1/classrooms/'.$classroom->id;

    spa('GET', $uri.'/report-cards', [], $other)->assertNotFound();
    spa('PUT', $uri.'/appreciations', ['term_id' => $termId, 'student_id' => $awa->id, 'director_comment' => 'X'], $other)->assertNotFound();
    spa('POST', $uri.'/report-cards/close', ['term_id' => $termId], $other)->assertNotFound();
    spa('POST', $uri.'/report-cards/reopen', ['term_id' => $termId, 'reason' => 'Erreur'], $other)->assertNotFound();
    spa('PUT', '/api/v1/grading/cycles/'.cycleOf($school, 'primary')->id.'/mentions', ['congratulations' => 9, 'honor_roll' => 8, 'encouragement' => 6, 'warning_below' => 5], $other)->assertNotFound();

    // Direction de la maternelle de la même école : la classe du primaire n'existe pas pour elle
    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));
    spa('GET', $uri.'/report-cards', [], $school)->assertNotFound();
    spa('POST', $uri.'/report-cards/close', ['term_id' => $termId], $school)->assertNotFound();
});
