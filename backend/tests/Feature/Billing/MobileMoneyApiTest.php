<?php

declare(strict_types=1);

use App\Domains\Billing\Contracts\PaymentGateway;
use App\Domains\Billing\Data\GatewayRequest;
use App\Domains\Billing\Data\GatewayResult;
use App\Domains\Billing\Enums\PaymentIntentStatus;
use App\Domains\Billing\Gateways\FakePaymentGateway;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\Payment;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;

use function Pest\Laravel\call;

/**
 * CE1 : 205 000 FCFA (inscription et scolarité) ; Awa (mère : compte Parent).
 *
 * @return array{0: School, 1: Student, 2: Invoice, 3: User}
 */
function mobileMoneySchool(): array
{
    $school = makeSchool(['kindergarten', 'primary']);
    setFees($school, 'CE1', ['registration' => 25000, 'tuition' => 180000]);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    $invoice = inSchool($school, static fn (): ?Invoice => Invoice::query()->where('student_id', $student->id)->first()) ?? invoiceOf($school, $student);
    $mother = User::factory()->createOne(['phone' => '+2250701020304', 'name' => 'Mariam Koné']);
    assignRole($mother, $school, Role::Guardian);

    return [$school, $student, $invoice, $mother];
}

/** @param TestResponse<Response> $response */
function intentId(TestResponse $response): string
{
    $id = $response->json('data.id');

    return is_string($id) ? $id : throw new LogicException('Identifiant attendu.');
}

/**
 * Notification signée du prestataire factice.
 *
 * @return TestResponse<Response>
 */
function fakeWebhook(string $reference, string $status, ?string $signature = null, string $provider = 'fake'): TestResponse
{
    $payload = (string) json_encode(['reference' => $reference, 'status' => $status, 'operator_reference' => 'OM-'.substr(md5($reference), 0, 8)]);
    $secret = config('services.payments.fake_secret');
    $signature ??= (new FakePaymentGateway(is_string($secret) ? $secret : ''))->sign($payload);

    return call('POST', '/api/v1/webhooks/payments/'.$provider, [], [], [], ['HTTP_X_FAKE_SIGNATURE' => $signature, 'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], $payload);
}

function remainingOf(School $school, Student $student): mixed
{
    return spa('GET', '/api/v1/guardian/children/'.$student->id, [], $school)->json('data.balance.remaining');
}

beforeEach(function (): void {
    Carbon::setTestNow('2026-10-05 08:00:00');
});

afterEach(function (): void {
    Carbon::setTestNow();
});

it('laisse le parent payer par Mobile Money : demande, validation, reçu, reste à payer', function (): void {
    [$school, $student, , $mother] = mobileMoneySchool();

    login($mother);
    spa('GET', '/api/v1/guardian/children/'.$student->id, [], $school)->assertOk()
        ->assertJsonPath('data.mobile_money.available', true)
        ->assertJsonPath('data.mobile_money.fee_payer', 'school');
    $id = intentId(spa('POST', '/api/v1/guardian/children/'.$student->id.'/payments', ['amount' => 50000, 'method' => 'orange_money', 'phone' => '07 01 02 03 04'], $school)
        ->assertSuccessful()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.charged', 50000)
        ->assertJsonPath('data.fee', 0)
        ->assertJsonPath('data.phone', '+225********04'));

    // Le parent suit l'état : le prestataire confirme, le paiement est enregistré
    $paid = spa('GET', "/api/v1/guardian/payment-intents/{$id}", [], $school)->assertOk()
        ->assertJsonPath('data.status', 'succeeded');
    expect($paid->json('data.receipt_number'))->toStartWith('REC-2026-');
    expect(remainingOf($school, $student))->toBe(155000);
    $paymentId = $paid->json('data.payment_id');
    spa('GET', '/api/v1/payments/'.(is_string($paymentId) ? $paymentId : ''), [], $school)->assertOk()
        ->assertJsonPath('data.payment.method', 'orange_money')
        ->assertJsonPath('data.payment.amount', 50000);
    $payment = inSchool($school, static fn (): ?Payment => Payment::query()->first());
    expect($payment?->cash_session_id)->toBeNull();

    // Paiement en ligne annulé par la direction : l'annulation est comptée dans sa caisse
    actingAsRole(Role::Director, $school);
    spa('POST', '/api/v1/payments/'.(is_string($paymentId) ? $paymentId : '').'/cancel', ['reason' => 'Paiement en double'], $school)->assertOk();
    login($mother);
    expect(remainingOf($school, $student))->toBe(205000);

    // Plafond : jamais plus que le reste dû
    spa('POST', '/api/v1/guardian/children/'.$student->id.'/payments', ['amount' => 205001, 'method' => 'mtn_momo', 'phone' => '0501020304'], $school)
        ->assertStatus(409)->assertJsonPath('code', 'amount_exceeds');
    // Validation
    spa('POST', '/api/v1/guardian/children/'.$student->id.'/payments', ['amount' => 1000, 'method' => 'cash', 'phone' => '0701020304'], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('method');
    spa('POST', '/api/v1/guardian/children/'.$student->id.'/payments', ['amount' => 1000, 'method' => 'wave', 'phone' => '1234'], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('phone');
});

it('note un paiement refusé par l’opérateur, sans rien encaisser', function (): void {
    [$school, $student, , $mother] = mobileMoneySchool();

    login($mother);
    $id = intentId(spa('POST', '/api/v1/guardian/children/'.$student->id.'/payments', ['amount' => 20000, 'method' => 'wave', 'phone' => '0701020399'], $school)->assertSuccessful());
    spa('GET', "/api/v1/guardian/payment-intents/{$id}", [], $school)->assertOk()
        ->assertJsonPath('data.status', 'failed')
        ->assertJsonPath('data.failure_reason', 'Solde insuffisant.')
        ->assertJsonPath('data.receipt_number', null);
    expect(remainingOf($school, $student))->toBe(205000);
    expect(inSchool($school, static fn (): int => Payment::query()->count()))->toBe(0);
});

it('ajoute les frais au montant débité quand l’école les fait payer aux parents', function (): void {
    [$school, $student, , $mother] = mobileMoneySchool();

    actingAsRole(Role::Director, $school);
    spa('PUT', '/api/v1/billing/policy', ['mobile_money' => ['fee_payer' => 'guardian', 'fee_rate_bps' => 150]], $school)->assertOk()
        ->assertJsonPath('data.mobile_money.fee_payer', 'guardian')
        ->assertJsonPath('data.mobile_money.fee_rate_bps', 150)
        ->assertJsonPath('data.departure', 'cancel_unstarted');
    spa('PUT', '/api/v1/billing/policy', ['mobile_money' => ['fee_payer' => 'guardian', 'fee_rate_bps' => 5000]], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('mobile_money.fee_rate_bps');
    actingAsRole(Role::Accountant, $school);
    spa('PUT', '/api/v1/billing/policy', ['mobile_money' => ['fee_payer' => 'school', 'fee_rate_bps' => 0]], $school)->assertForbidden();

    login($mother);
    $id = intentId(spa('POST', '/api/v1/guardian/children/'.$student->id.'/payments', ['amount' => 10001, 'method' => 'moov_money', 'phone' => '0101020304'], $school)
        ->assertSuccessful()
        ->assertJsonPath('data.fee', 151)
        ->assertJsonPath('data.charged', 10152)
        ->assertJsonPath('data.fee_payer', 'guardian'));
    spa('GET', "/api/v1/guardian/payment-intents/{$id}", [], $school)->assertOk()->assertJsonPath('data.status', 'succeeded');
    expect(remainingOf($school, $student))->toBe(205000 - 10001);
});

it('traite le webhook signé une seule fois et rejette les autres', function (): void {
    [$school, $student, , $mother] = mobileMoneySchool();

    login($mother);
    $id = intentId(spa('POST', '/api/v1/guardian/children/'.$student->id.'/payments', ['amount' => 30000, 'method' => 'orange_money', 'phone' => '0701020304'], $school)->assertSuccessful());
    $reference = 'fake_ok_'.$id;

    fakeWebhook($reference, 'succeeded', 'mauvaise-signature')->assertUnauthorized();
    fakeWebhook('fake_ok_inconnue', 'succeeded')->assertNotFound();
    fakeWebhook($reference, 'succeeded', null, 'autre')->assertNotFound();
    expect(inSchool($school, static fn (): int => Payment::query()->count()))->toBe(0);

    fakeWebhook($reference, 'succeeded')->assertOk();
    fakeWebhook($reference, 'succeeded')->assertOk();
    fakeWebhook($reference, 'failed')->assertOk();
    expect(inSchool($school, static fn (): int => Payment::query()->count()))->toBe(1);

    login($mother);
    spa('GET', "/api/v1/guardian/payment-intents/{$id}", [], $school)->assertOk()->assertJsonPath('data.status', 'succeeded');
    expect(remainingOf($school, $student))->toBe(175000);
});

it('fait expirer une demande restée sans réponse et en permet une nouvelle', function (): void {
    [$school, $student, , $mother] = mobileMoneySchool();
    // Prestataire qui ne répond jamais
    app()->instance(PaymentGateway::class, new class implements PaymentGateway
    {
        public function name(): string
        {
            return 'fake';
        }

        public function initiate(GatewayRequest $request): GatewayResult
        {
            return new GatewayResult('silent_'.$request->intentId, PaymentIntentStatus::Pending);
        }

        public function parseWebhook(string $payload, array $headers): GatewayResult
        {
            // Confirmation tardive du prestataire (signature supposée vérifiée)
            $data = json_decode($payload, true);
            $reference = is_array($data) && is_string($data['reference'] ?? null) ? $data['reference'] : '';

            return new GatewayResult($reference, PaymentIntentStatus::Succeeded, 'LATE-'.substr($reference, -6));
        }

        public function status(string $reference): GatewayResult
        {
            return new GatewayResult($reference, PaymentIntentStatus::Pending);
        }
    });

    login($mother);
    $id = intentId(spa('POST', '/api/v1/guardian/children/'.$student->id.'/payments', ['amount' => 5000, 'method' => 'wave', 'phone' => '0701020304'], $school)->assertSuccessful());
    spa('GET', "/api/v1/guardian/payment-intents/{$id}", [], $school)->assertOk()->assertJsonPath('data.status', 'pending');
    // Une seule demande en attente par facture
    spa('POST', '/api/v1/guardian/children/'.$student->id.'/payments', ['amount' => 1000, 'method' => 'wave', 'phone' => '0701020304'], $school)
        ->assertStatus(409)->assertJsonPath('code', 'payment_pending');

    Carbon::setTestNow('2026-10-05 08:31:00');
    spa('POST', '/api/v1/guardian/children/'.$student->id.'/payments', ['amount' => 5000, 'method' => 'wave', 'phone' => '0701020304'], $school)
        ->assertSuccessful()->assertJsonPath('data.status', 'pending');
    spa('GET', "/api/v1/guardian/payment-intents/{$id}", [], $school)->assertOk()
        ->assertJsonPath('data.status', 'expired')
        ->assertJsonPath('data.failure_reason', 'Paiement non validé à temps.');

    // Le prestataire confirme finalement : l'argent est débité, le paiement est enregistré malgré l'expiration locale
    fakeWebhook('silent_'.$id, 'succeeded')->assertOk();
    fakeWebhook('silent_'.$id, 'succeeded')->assertOk();
    spa('GET', "/api/v1/guardian/payment-intents/{$id}", [], $school)->assertOk()
        ->assertJsonPath('data.status', 'succeeded')
        ->assertJsonPath('data.failure_reason', null);
    expect(inSchool($school, static fn (): int => Payment::query()->count()))->toBe(1);
});

it('isole les paiements Mobile Money entre familles et entre établissements', function (): void {
    [$school, $student, , $mother] = mobileMoneySchool();
    $other = User::factory()->createOne(['phone' => '+2250505050505']);
    assignRole($other, $school, Role::Guardian);

    login($mother);
    $id = intentId(spa('POST', '/api/v1/guardian/children/'.$student->id.'/payments', ['amount' => 5000, 'method' => 'wave', 'phone' => '0701020304'], $school)->assertSuccessful());

    login($other);
    spa('GET', "/api/v1/guardian/payment-intents/{$id}", [], $school)->assertNotFound();
    spa('POST', '/api/v1/guardian/children/'.$student->id.'/payments', ['amount' => 5000, 'method' => 'wave', 'phone' => '0505050505'], $school)->assertNotFound();

    $elsewhere = makeSchool(['primary']);
    actingAsRole(Role::Director, $elsewhere);
    spa('GET', "/api/v1/guardian/payment-intents/{$id}", [], $elsewhere)->assertNotFound();
    spa('POST', '/api/v1/guardian/children/'.$student->id.'/payments', ['amount' => 5000, 'method' => 'wave', 'phone' => '0701020304'], $elsewhere)->assertNotFound();
});
