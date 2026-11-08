<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Classroom;
use App\Domains\Identity\Enums\Role;
use App\Domains\Messaging\Contracts\SmsSender;
use App\Domains\Messaging\Sms\UnconfiguredSmsSender;
use App\Domains\Students\Models\PreRegistration;
use App\Domains\Tenancy\Models\School;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function preRegistrationPayload(array $overrides = []): array
{
    return [
        'cycle_code' => 'primary',
        'level_code' => 'CE1',
        'child_last_name' => 'Koné',
        'child_first_name' => 'Awa',
        'child_gender' => 'F',
        'child_birth_date' => '2019-03-14',
        'guardian_name' => 'Mariam Koné',
        'guardian_phone' => '07 01 02 03 04',
        'guardian_email' => 'Mariam@Example.ci',
        'message' => 'Elle arrive de Bouaké.',
        'consent' => true,
        ...$overrides,
    ];
}

/**
 * @param  array<string, mixed>  $overrides
 * @return TestResponse<Response>
 */
function preRegister(School $school, array $overrides = []): TestResponse
{
    return postJson('/api/v1/public/schools/'.$school->slug.'/pre-registrations', preRegistrationPayload($overrides));
}

function preRegistrationIdOf(School $school, string $reference): string
{
    return inSchool($school, static fn (): string => PreRegistration::query()->where('reference', $reference)->sole()->id);
}

/**
 * @return array<string, mixed>
 */
function enrollFromPreRegistration(Classroom $classroom, string $preRegistrationId): array
{
    return [
        'classroom_id' => $classroom->id,
        'pre_registration_id' => $preRegistrationId,
        'student' => ['first_name' => 'Awa', 'last_name' => 'Koné', 'gender' => 'F', 'birth_date' => '2019-03-14'],
        'guardians' => [['name' => 'Mariam Koné', 'phone' => '+2250701020304', 'relation' => 'mother']],
    ];
}

beforeEach(function (): void {
    Carbon::setTestNow('2026-11-07 10:00:00');
});

afterEach(function (): void {
    Carbon::setTestNow();
});

it('reçoit une pré-inscription publique et ne rend que son numéro, sans doublon si elle est renvoyée', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);

    preRegister($school)->assertCreated()->assertExactJson(['data' => ['reference' => 'PRE-2026-000001']]);
    // Même demande renvoyée (double clic, nouvel essai) : même numéro
    preRegister($school, ['child_first_name' => 'awa'])->assertCreated()->assertJsonPath('data.reference', 'PRE-2026-000001');
    preRegister($school, ['child_first_name' => 'Ismaël', 'child_gender' => 'M', 'child_birth_date' => '2021-06-01', 'level_code' => 'MS', 'cycle_code' => 'kindergarten'])
        ->assertCreated()->assertJsonPath('data.reference', 'PRE-2026-000002');

    $stored = inSchool($school, static fn (): PreRegistration => PreRegistration::query()->where('reference', 'PRE-2026-000001')->sole());
    expect($stored->guardian_phone)->toBe('+2250701020304')
        ->and($stored->guardian_email)->toBe('mariam@example.ci')
        ->and($stored->status->value)->toBe('pending');
});

it('valide le formulaire public : niveau de l’école, champ piège, accord, école inconnue', function (): void {
    $school = makeSchool(['primary']);

    preRegister($school, ['level_code' => 'PS', 'cycle_code' => 'kindergarten'])->assertUnprocessable()->assertJsonValidationErrors('level_code');
    preRegister($school, ['website' => 'https://spam.example'])->assertUnprocessable()->assertJsonValidationErrors('website');
    preRegister($school, ['consent' => false, 'guardian_phone' => '1234', 'child_birth_date' => '2027-01-01'])
        ->assertUnprocessable()->assertJsonValidationErrors(['consent', 'guardian_phone', 'child_birth_date']);
    postJson('/api/v1/public/schools/inconnue/pre-registrations', preRegistrationPayload())->assertNotFound();
    expect(inSchool($school, static fn (): int => PreRegistration::query()->count()))->toBe(0);
});

it('limite les envois par téléphone et par adresse', function (): void {
    $school = makeSchool(['primary']);
    foreach (['Awa', 'Aya', 'Adja'] as $index => $name) {
        preRegister($school, ['child_first_name' => $name, 'child_birth_date' => '2019-03-1'.$index])->assertCreated();
    }
    preRegister($school, ['child_first_name' => 'Ange'])->assertTooManyRequests()->assertJsonPath('code', 'too_many_attempts');

    preRegister($school, ['guardian_phone' => '0505050505', 'child_first_name' => 'Yao'])->assertCreated();
    preRegister($school, ['guardian_phone' => '0505050506', 'child_first_name' => 'Koffi'])->assertCreated();
    preRegister($school, ['guardian_phone' => '0505050507', 'child_first_name' => 'Kouamé'])->assertTooManyRequests();
});

it('montre les pré-inscriptions au secrétariat de son cycle seulement', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    preRegister($school)->assertCreated();
    preRegister($school, ['child_first_name' => 'Ismaël', 'child_gender' => 'M', 'child_birth_date' => '2021-06-01', 'level_code' => 'MS', 'cycle_code' => 'kindergarten'])->assertCreated();
    $primaryId = preRegistrationIdOf($school, 'PRE-2026-000001');

    actingAsRole(Role::Secretary, $school);
    spa('GET', '/api/v1/pre-registrations', [], $school)->assertOk()->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.reference', 'PRE-2026-000002')
        ->assertJsonPath('data.1.child.first_name', 'Awa')
        ->assertJsonPath('data.1.level.name', 'CE1')
        ->assertJsonPath('data.1.level.cycle_name', 'Primaire')
        ->assertJsonPath('data.1.guardian.phone', '+2250701020304')
        ->assertJsonPath('data.1.message', 'Elle arrive de Bouaké.');
    spa('GET', '/api/v1/pre-registrations?status=refused', [], $school)->assertOk()->assertJsonCount(0, 'data');

    actingAsRole(Role::Secretary, $school, cycleOf($school, 'kindergarten'));
    spa('GET', '/api/v1/pre-registrations', [], $school)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.reference', 'PRE-2026-000002');
    spa('GET', '/api/v1/pre-registrations/'.$primaryId, [], $school)->assertNotFound();
    spa('POST', '/api/v1/pre-registrations/'.$primaryId.'/refuse', ['reason' => 'Complet'], $school)->assertNotFound();

    // Sans students.manage (comptabilité, enseignant, parent) : rien
    actingAsRole(Role::Accountant, $school);
    spa('GET', '/api/v1/pre-registrations', [], $school)->assertForbidden();
    actingAsRole(Role::Teacher, $school);
    spa('GET', '/api/v1/pre-registrations', [], $school)->assertForbidden();
});

it('refuse une pré-inscription avec un motif envoyé au parent par SMS', function (): void {
    $school = makeSchool(['primary']);
    preRegister($school)->assertCreated();
    $id = preRegistrationIdOf($school, 'PRE-2026-000001');

    $secretary = actingAsRole(Role::Secretary, $school);
    spa('POST', '/api/v1/pre-registrations/'.$id.'/refuse', ['reason' => ''], $school)->assertUnprocessable()->assertJsonValidationErrors('reason');
    spa('POST', '/api/v1/pre-registrations/'.$id.'/refuse', ['reason' => 'Plus de place en CE1 cette année'], $school)->assertOk()
        ->assertJsonPath('data.status', 'refused')
        ->assertJsonPath('data.decided_by_name', $secretary->name)
        ->assertJsonPath('data.decision_note', 'Plus de place en CE1 cette année')
        ->assertJsonPath('data.notification_status', 'sent');
    expect(sentSms())->toHaveCount(1)
        ->and(sentSms()[0]['to'])->toBe('+2250701020304')
        ->and(sentSms()[0]['message'])->toBe($school->name.' : votre pré-inscription PRE-2026-000001 n’a pas pu être retenue. Motif : Plus de place en CE1 cette année. Contactez l’école pour en savoir plus.')
        ->and(sentSms()[0]['message'])->not->toContain('Awa');

    spa('POST', '/api/v1/pre-registrations/'.$id.'/refuse', ['reason' => 'Encore'], $school)->assertConflict()->assertJsonPath('code', 'already_decided');
});

it('inscrit l’enfant depuis la pré-inscription et prévient le parent', function (): void {
    $school = makeSchool(['primary'], ['code' => 'LAU']);
    preRegister($school)->assertCreated();
    $id = preRegistrationIdOf($school, 'PRE-2026-000001');
    $classroom = classroomOf($school, 'CE1');

    actingAsRole(Role::Secretary, $school);
    spa('GET', '/api/v1/pre-registrations/'.$id, [], $school)->assertOk()->assertJsonPath('data.child.birth_date', '2019-03-14');
    $student = spa('POST', '/api/v1/enrollments', enrollFromPreRegistration($classroom, $id), $school)->assertCreated()
        ->assertJsonPath('data.matricule', 'LAU-000001')
        ->json('data.id');

    spa('GET', '/api/v1/pre-registrations/'.$id, [], $school)->assertOk()
        ->assertJsonPath('data.status', 'enrolled')
        ->assertJsonPath('data.student_id', $student)
        ->assertJsonPath('data.notification_status', 'sent');
    expect(sentSms())->toHaveCount(1)
        ->and(sentSms()[0]['message'])->toBe($school->name.' : votre pré-inscription PRE-2026-000001 est acceptée et l’inscription est faite. Bienvenue !');

    // Déjà menée à son terme : refusée, sans créer de second élève
    spa('POST', '/api/v1/enrollments', enrollFromPreRegistration($classroom, $id), $school)
        ->assertUnprocessable()->assertJsonValidationErrors('pre_registration_id');
});

it('laisse la pré-inscription en attente si l’inscription échoue, et ne tente aucun SMS sans fournisseur', function (): void {
    app()->instance(SmsSender::class, new UnconfiguredSmsSender);
    $school = makeSchool(['primary']);
    preRegister($school)->assertCreated();
    $id = preRegistrationIdOf($school, 'PRE-2026-000001');
    $classroom = classroomOf($school, 'CE1');
    inSchool($school, static fn (): bool => $classroom->fill(['capacity' => 0])->save());

    actingAsRole(Role::Secretary, $school);
    spa('POST', '/api/v1/enrollments', enrollFromPreRegistration($classroom, $id), $school)->assertConflict()->assertJsonPath('code', 'classroom_full');
    spa('GET', '/api/v1/pre-registrations/'.$id, [], $school)->assertOk()->assertJsonPath('data.status', 'pending');

    // Sans fournisseur SMS : aucun envoi tenté ni annoncé (l'école prévient la famille elle-même)
    spa('POST', '/api/v1/pre-registrations/'.$id.'/refuse', ['reason' => 'Classe complète'], $school)->assertOk()
        ->assertJsonPath('data.status', 'refused')
        ->assertJsonPath('data.notification_status', null);
    expect(postJson('/api/v1/public/schools/'.$school->slug.'/pre-registrations', [])->status())->toBe(422);
    getJson('/api/v1/public/schools/'.$school->slug)->assertOk()->assertJsonPath('data.sms_available', false);
});

it('isole les pré-inscriptions entre deux écoles', function (): void {
    $school = makeSchool(['primary']);
    $other = makeSchool(['primary']);
    preRegister($school)->assertCreated();
    $id = preRegistrationIdOf($school, 'PRE-2026-000001');
    // Numérotation propre à chaque école
    preRegister($other, ['guardian_phone' => '0101010101'])->assertCreated()->assertJsonPath('data.reference', 'PRE-2026-000001');

    actingAsRole(Role::Director, $other);
    spa('GET', '/api/v1/pre-registrations', [], $other)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.guardian.phone', '+2250101010101');
    spa('GET', '/api/v1/pre-registrations/'.$id, [], $other)->assertNotFound();
    spa('POST', '/api/v1/pre-registrations/'.$id.'/refuse', ['reason' => 'Complet'], $other)->assertNotFound();
    spa('POST', '/api/v1/enrollments', enrollFromPreRegistration(classroomOf($other, 'CE1'), $id), $other)
        ->assertUnprocessable()->assertJsonValidationErrors('pre_registration_id');
});
