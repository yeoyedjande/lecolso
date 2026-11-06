<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Classroom;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * CE1 A tenue par une titulaire ; Awa (mère : +2250701020304) et Yao (père : +2250505050505) ; grille du CE1 ; le
 * compte de la mère a le rôle Parent.
 *
 * @return array{0: School, 1: Classroom, 2: User, 3: Student, 4: Student, 5: User}
 */
function familySchool(): array
{
    $school = makeSchool(['kindergarten', 'primary']);
    setFees($school, 'CE1', ['registration' => 25000, 'tuition' => 180000]);
    $teacher = makeUser();
    assignRole($teacher, $school, Role::Teacher, cycleOf($school, 'primary'));
    $classroom = classroomOf($school, 'CE1', 'A', ['homeroom_teacher_id' => $teacher->id]);
    $awa = enrollStudent($school, $classroom);
    $yao = enrollStudent($school, $classroom, ['first_name' => 'Yao', 'last_name' => 'Kouassi', 'gender' => 'M', 'guardian_phone' => '+2250505050505', 'guardian_name' => 'Paul Kouassi']);
    $mother = User::factory()->createOne(['phone' => '+2250701020304', 'name' => 'Mariam Koné']);
    assignRole($mother, $school, Role::Guardian);

    return [$school, $classroom, $teacher, $awa, $yao, $mother];
}

function familyInvoice(School $school, Student $student): Invoice
{
    return inSchool($school, static fn (): ?Invoice => Invoice::query()->where('student_id', $student->id)->first()) ?? invoiceOf($school, $student);
}

function familyText(mixed $value): string
{
    return is_string($value) ? $value : throw new LogicException('Texte attendu.');
}

beforeEach(function (): void {
    Carbon::setTestNow('2026-10-05 08:00:00');
    Storage::fake();
});

afterEach(function (): void {
    Carbon::setTestNow();
});

it('montre au parent ses seuls enfants : présence du jour, frais et absences à justifier', function (): void {
    [$school, $classroom, $teacher, $awa, $yao, $mother] = familySchool();
    familyInvoice($school, $awa);

    login($mother);
    spa('GET', '/api/v1/guardian/children', [], $school)->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.student.full_name', 'KONÉ Awa')
        ->assertJsonPath('data.0.student.classroom.name', 'CE1 A')
        ->assertJsonPath('data.0.presence', null)
        ->assertJsonPath('data.0.remaining', 205000)
        ->assertJsonPath('data.0.absences_to_justify', 0);

    // Appel du jour : Awa absente
    login($teacher);
    spa('PUT', '/api/v1/classrooms/'.$classroom->id.'/roll-calls/2026-10-05', ['marks' => [['student_id' => $awa->id, 'status' => 'absent']]], $school)->assertOk();

    login($mother);
    spa('GET', '/api/v1/guardian/children', [], $school)->assertOk()
        ->assertJsonPath('data.0.presence', 'absent')
        ->assertJsonPath('data.0.absences_to_justify', 1);
    spa('GET', '/api/v1/guardian/children/'.$awa->id, [], $school)->assertOk()
        ->assertJsonPath('data.absences.0.date', '2026-10-05')
        ->assertJsonPath('data.absences.0.status', 'absent')
        ->assertJsonPath('data.absences.0.justification', null)
        ->assertJsonPath('data.absences.0.can_justify', true);

    // Parti depuis hier : l'appel du jour ne dit plus rien de sa présence
    inSchool($school, static fn () => Enrollment::query()->where('student_id', $awa->id)->update(['status' => EnrollmentStatus::Left, 'left_on' => '2026-10-04']));
    spa('GET', '/api/v1/guardian/children', [], $school)->assertOk()
        ->assertJsonPath('data.0.presence', null);
    inSchool($school, static fn () => Enrollment::query()->where('student_id', $awa->id)->update(['status' => EnrollmentStatus::Active, 'left_on' => null]));

    // Un autre enfant de la classe, d'une autre famille : introuvable
    spa('GET', '/api/v1/guardian/children/'.$yao->id, [], $school)->assertNotFound();

    // Personnel de l'école : ce n'est pas l'espace parent, aucun enfant
    actingAsRole(Role::Director, $school);
    spa('GET', '/api/v1/guardian/children', [], $school)->assertOk()->assertJsonCount(0, 'data');
    spa('GET', '/api/v1/guardian/children/'.$awa->id, [], $school)->assertNotFound();
});

it('donne les notes au fil de l’eau, jamais la moyenne générale ni le rang avant le bulletin validé', function (): void {
    [$school, $classroom, $teacher, $awa, $yao, $mother] = familySchool();

    login($teacher);
    $grid = spa('GET', '/api/v1/classrooms/'.$classroom->id.'/grade-grid', [], $school)->assertOk();
    $termId = familyText($grid->json('data.term.id'));
    $french = familyText($grid->json('data.subjects.0.id'));
    $assessment = familyText(spa('POST', '/api/v1/classrooms/'.$classroom->id.'/assessments', [
        'subject_id' => $french, 'term_id' => $termId, 'title' => 'Dictée', 'date' => '2026-10-02', 'out_of' => 20,
    ], $school)->assertCreated()->json('data.id'));
    spa('PUT', '/api/v1/assessments/'.$assessment.'/grades', ['grades' => [
        ['student_id' => $awa->id, 'value' => 14, 'absent' => false],
        ['student_id' => $yao->id, 'value' => 18, 'absent' => false],
    ]], $school)->assertOk();

    login($mother);
    $child = spa('GET', '/api/v1/guardian/children/'.$awa->id, [], $school)->assertOk()
        ->assertJsonPath('data.assessment_mode', 'weighted_average')
        ->assertJsonPath('data.grade_scale', 10)
        ->assertJsonPath('data.term.label', '1er trimestre')
        ->assertJsonPath('data.subjects.0.name', 'Français')
        ->assertJsonPath('data.subjects.0.average', 7)
        ->assertJsonPath('data.subjects.0.assessments.0.title', 'Dictée')
        ->assertJsonPath('data.subjects.0.assessments.0.value', 14)
        ->assertJsonPath('data.subjects.0.assessments.0.out_of', 20)
        ->assertJsonCount(0, 'data.report_cards');
    expect($child->json('data'))->not->toHaveKeys(['average', 'rank', 'mention', 'class_average']);
    // Les notes des autres élèves n'apparaissent nulle part
    expect((string) $child->getContent())->not->toContain('KOUASSI');

    // Bulletin validé : disponible en PDF
    actingAsRole(Role::Director, $school);
    spa('POST', '/api/v1/classrooms/'.$classroom->id.'/report-cards/close', ['term_id' => $termId], $school)->assertOk();
    login($mother);
    spa('GET', '/api/v1/guardian/children/'.$awa->id, [], $school)->assertOk()
        ->assertJsonCount(1, 'data.report_cards')
        ->assertJsonPath('data.report_cards.0.term', '1er trimestre')
        ->assertJsonPath('data.report_cards.0.pdf_url', static fn (mixed $url): bool => is_string($url) && str_contains($url, '/files/report-cards/'));
});

it('donne au parent la situation de la facture, les paiements et le reçu de son enfant seulement', function (): void {
    [$school, , , $awa, $yao, $mother] = familySchool();
    $invoice = familyInvoice($school, $awa);
    $other = familyInvoice($school, $yao);
    actingAsRole(Role::Accountant, $school);
    $paid = pay($school, $invoice->id, 50000);
    $foreign = pay($school, $other->id, 25000);

    login($mother);
    spa('GET', '/api/v1/guardian/children/'.$awa->id, [], $school)->assertOk()
        ->assertJsonPath('data.balance.total', 205000)
        ->assertJsonPath('data.balance.settled', 50000)
        ->assertJsonPath('data.balance.remaining', 155000)
        ->assertJsonPath('data.payments.0.id', $paid)
        ->assertJsonPath('data.payments.0.amount', 50000)
        ->assertJsonPath('data.payments.0.cancelled', false)
        ->assertJsonCount(3, 'data.balance.schedule');
    spa('GET', '/api/v1/payments/'.$paid, [], $school)->assertOk();
    spa('GET', '/api/v1/payments/'.$foreign, [], $school)->assertNotFound();
});

it('isole l’espace parent entre établissements', function (): void {
    [$school, , , $awa, , $mother] = familySchool();
    $other = makeSchool(['primary']);
    $stranger = enrollStudent($other, classroomOf($other, 'CE1'), ['guardian_phone' => '+2250701020304']);

    // Même téléphone, autre école sans affectation : 404 par l'en-tête
    login($mother);
    spa('GET', '/api/v1/guardian/children', [], $other)->assertNotFound();
    spa('GET', '/api/v1/guardian/children/'.$stranger->id, [], $school)->assertNotFound();

    // Parent dans l'autre école aussi : chaque école ne montre que ses enfants
    assignRole($mother, $other, Role::Guardian);
    login($mother);
    spa('GET', '/api/v1/guardian/children', [], $other)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.student.id', $stranger->id);
    spa('GET', '/api/v1/guardian/children', [], $school)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.student.id', $awa->id);
    spa('GET', '/api/v1/guardian/children/'.$awa->id, [], $other)->assertNotFound();
});
