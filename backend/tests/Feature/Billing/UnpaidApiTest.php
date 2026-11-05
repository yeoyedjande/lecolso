<?php

declare(strict_types=1);

use App\Domains\Billing\Enums\ReminderStatus;
use App\Domains\Billing\Models\PaymentReminder;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Contracts\SmsSender;
use App\Domains\Messaging\Sms\FakeSmsSender;
use App\Domains\Messaging\Sms\UnconfiguredSmsSender;
use Illuminate\Support\Carbon;

/**
 * SMS envoyés par le faux fournisseur (local et tests).
 *
 * @return list<array{to: string, message: string}>
 */
function sentSms(): array
{
    $sender = app()->get(SmsSender::class);

    return $sender instanceof FakeSmsSender ? $sender->sent() : [];
}

beforeEach(function (): void {
    // Échéances 14/09 (85 000), 05/01 (60 000), 05/04 (60 000) : 145 000 échus au 20/01
    Carbon::setTestNow('2027-01-20 10:00:00');
});

afterEach(function (): void {
    Carbon::setTestNow();
});

it('liste les factures en retard avec la plus ancienne échéance non réglée', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    pay($school, $invoice->id, 100000);

    spa('GET', '/api/v1/billing/unpaid', [], $school)->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.invoice_id', $invoice->id)
        ->assertJsonPath('data.0.student.full_name', 'KONÉ Awa')
        ->assertJsonPath('data.0.classroom_name', 'CE1 A')
        ->assertJsonPath('data.0.cycle.code', 'primary')
        ->assertJsonPath('data.0.payer.name', 'Mariam Koné')
        ->assertJsonPath('data.0.payer.phone', '+2250701020304')
        ->assertJsonPath('data.0.overdue', 45000)
        ->assertJsonPath('data.0.remaining', 105000)
        ->assertJsonPath('data.0.oldest_due_on', '2027-01-05')
        ->assertJsonPath('data.0.days_late', 15)
        ->assertJsonPath('data.0.last_reminder', null)
        ->assertJsonPath('data.0.can_remind', true);

    // Réglé jusqu'à l'échu : plus en retard
    pay($school, $invoice->id, 45000);
    spa('GET', '/api/v1/billing/unpaid', [], $school)->assertOk()->assertJsonCount(0, 'data');
});

it('réserve les impayés au personnel de la facturation, dans ses cycles', function (): void {
    [$school, $invoice] = billedSchool();

    actingAsRole(Role::Secretary, $school);
    spa('GET', '/api/v1/billing/unpaid', [], $school)->assertOk()->assertJsonPath('data.0.can_remind', false);
    spa('POST', '/api/v1/billing/reminders', ['invoice_ids' => [$invoice->id]], $school)->assertForbidden();

    actingAsRole(Role::Accountant, $school, cycleOf($school, 'kindergarten'));
    spa('GET', '/api/v1/billing/unpaid', [], $school)->assertOk()->assertJsonCount(0, 'data');
    spa('POST', '/api/v1/billing/reminders', ['invoice_ids' => [$invoice->id]], $school)->assertUnprocessable();

    actingAsRole(Role::Accountant, $school, cycleOf($school, 'primary'));
    spa('GET', '/api/v1/billing/unpaid?cycle_id='.cycleOf($school, 'primary')->id, [], $school)->assertOk()->assertJsonCount(1, 'data');
    spa('GET', '/api/v1/billing/unpaid?cycle_id='.cycleOf($school, 'kindergarten')->id, [], $school)->assertOk()->assertJsonCount(0, 'data');

    foreach ([Role::Guardian, Role::Teacher] as $role) {
        actingAsRole($role, $school);
        spa('GET', '/api/v1/billing/unpaid', [], $school)->assertForbidden();
        spa('POST', '/api/v1/billing/reminders', ['invoice_ids' => [$invoice->id]], $school)->assertForbidden();
    }
});

it('relance le payeur par SMS au plus une fois tous les 7 jours', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    pay($school, $invoice->id, 100000);

    spa('POST', '/api/v1/billing/reminders', ['invoice_ids' => [$invoice->id]], $school)->assertOk()
        ->assertJsonPath('data.queued', 1)
        ->assertJsonPath('data.recent', 0);
    expect(sentSms())->toHaveCount(1)
        ->and(sentSms()[0]['to'])->toBe('+2250701020304')
        ->and(sentSms()[0]['message'])->toBe($school->name.' : bonjour, la scolarité d’Awa présente un retard de 45 000 FCFA. Merci de régulariser auprès de l’école.');
    $reminder = inSchool($school, static fn (): PaymentReminder => PaymentReminder::query()->sole());
    expect($reminder->status)->toBe(ReminderStatus::Sent)
        ->and($reminder->overdue_amount)->toBe(45000)
        ->and($reminder->sent_at)->not->toBeNull();

    spa('GET', '/api/v1/billing/unpaid', [], $school)->assertOk()
        ->assertJsonPath('data.0.last_reminder.status', 'sent');
    spa('POST', '/api/v1/billing/reminders', ['invoice_ids' => [$invoice->id]], $school)->assertOk()
        ->assertJsonPath('data.queued', 0)
        ->assertJsonPath('data.recent', 1);
    expect(sentSms())->toHaveCount(1);

    Carbon::setTestNow('2027-01-28 10:00:00');
    spa('POST', '/api/v1/billing/reminders', ['invoice_ids' => [$invoice->id]], $school)->assertOk()->assertJsonPath('data.queued', 1);
    expect(sentSms())->toHaveCount(2);
});

it('envoie un seul SMS à un parent pour ses enfants en retard', function (): void {
    [$school, $invoice] = billedSchool();
    $sibling = enrollStudent($school, classroomOf($school, 'CE1', 'B'), ['first_name' => 'Ismaël', 'gender' => 'M']);
    $siblingInvoice = invoiceOf($school, $sibling);
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/billing/reminders', ['invoice_ids' => [$invoice->id, $siblingInvoice->id]], $school)->assertOk()
        ->assertJsonPath('data.queued', 1);
    expect(sentSms())->toHaveCount(1)
        ->and(sentSms()[0]['message'])->toContain('la scolarité d’Awa et Ismaël présente un retard de 290 000 FCFA');
});

it('écarte une facture à jour et note un échec quand aucun fournisseur SMS n’est configuré', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    pay($school, $invoice->id, 145000);
    spa('POST', '/api/v1/billing/reminders', ['invoice_ids' => [$invoice->id]], $school)->assertOk()
        ->assertJsonPath('data.queued', 0)
        ->assertJsonPath('data.not_overdue', 1);

    [$other, $late] = billedSchool();
    app()->instance(SmsSender::class, new UnconfiguredSmsSender);
    actingAsRole(Role::Accountant, $other);
    spa('POST', '/api/v1/billing/reminders', ['invoice_ids' => [$late->id]], $other)->assertOk()->assertJsonPath('data.queued', 1);
    $reminder = inSchool($other, static fn (): PaymentReminder => PaymentReminder::query()->sole());
    expect($reminder->status)->toBe(ReminderStatus::Failed)
        ->and($reminder->failure)->toBe('Aucun fournisseur SMS n’est configuré.');

    // Un échec n'empêche pas de relancer
    spa('POST', '/api/v1/billing/reminders', ['invoice_ids' => [$late->id]], $other)->assertOk()->assertJsonPath('data.queued', 1);
});

it('isole impayés et relances entre deux écoles', function (): void {
    [$school, $invoice] = billedSchool();
    [$other] = billedSchool();
    actingAsRole(Role::Director, $other);

    spa('GET', '/api/v1/billing/unpaid', [], $other)->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.invoice_id', static fn (mixed $id): bool => $id !== $invoice->id);
    spa('POST', '/api/v1/billing/reminders', ['invoice_ids' => [$invoice->id]], $other)->assertUnprocessable()->assertJsonValidationErrors('invoice_ids');
    spa('POST', '/api/v1/billing/reminders', ['invoice_ids' => []], $other)->assertUnprocessable();
    expect(sentSms())->toBe([]);
});

it('calcule le tableau de bord de l’année en cours dans les cycles de l’utilisateur', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    pay($school, $invoice->id, 100000);

    actingAsRole(Role::Director, $school);
    spa('GET', '/api/v1/billing/dashboard', [], $school)->assertOk()
        ->assertJsonPath('data.today', '2027-01-20')
        ->assertJsonPath('data.students', 1)
        ->assertJsonPath('data.by_cycle.0.code', 'kindergarten')
        ->assertJsonPath('data.by_cycle.0.students', 0)
        ->assertJsonPath('data.by_cycle.1.code', 'primary')
        ->assertJsonPath('data.by_cycle.1.students', 1)
        ->assertJsonPath('data.by_cycle.1.classrooms', 1)
        ->assertJsonPath('data.finance.collected_month', 100000)
        ->assertJsonPath('data.finance.payments_month', 1)
        ->assertJsonPath('data.finance.expected_month', 60000)
        ->assertJsonPath('data.finance.overdue', 45000)
        ->assertJsonPath('data.finance.collection_rate', 69)
        ->assertJsonPath('data.finance.monthly', static fn (mixed $rows): bool => is_array($rows) && array_column($rows, 'month') === ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01'])
        ->assertJsonPath('data.finance.monthly.4.collected', 100000)
        ->assertJsonPath('data.finance.recent_payments.0.amount', 100000);

    // Directrice de la maternelle : ni l'élève ni l'argent du primaire
    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));
    spa('GET', '/api/v1/billing/dashboard', [], $school)->assertOk()
        ->assertJsonPath('data.students', 0)
        ->assertJsonCount(1, 'data.by_cycle')
        ->assertJsonPath('data.finance.collected_month', 0)
        ->assertJsonPath('data.finance.overdue', 0);

    // Rôle sans billing.view : effectifs seulement
    $role = customRole($school, ['students.view']);
    $user = User::factory()->createOne();
    assignRole($user, $school, $role->id);
    login($user);
    spa('GET', '/api/v1/billing/dashboard', [], $school)->assertOk()
        ->assertJsonPath('data.students', 1)
        ->assertJsonPath('data.finance', null);

    actingAsRole(Role::Teacher, $school);
    spa('GET', '/api/v1/billing/dashboard', [], $school)->assertForbidden();

    // Autre école : rien de la première
    $other = makeSchool(['primary']);
    currentYearOf($other);
    actingAsRole(Role::Director, $other);
    spa('GET', '/api/v1/billing/dashboard', [], $other)->assertOk()
        ->assertJsonPath('data.students', 0)
        ->assertJsonPath('data.finance.collected_month', 0)
        ->assertJsonPath('data.finance.overdue', 0)
        ->assertJsonPath('data.finance.recent_payments', []);
});
