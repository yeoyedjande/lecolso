<?php

declare(strict_types=1);

use App\Domains\Billing\Models\Payment;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Enrollment;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function (): void {
    Carbon::setTestNow('2026-10-01 09:30:00');
});

afterEach(function (): void {
    Carbon::setTestNow();
});

it('encaisse un paiement avec un numéro de reçu séquentiel et l’impute aux échéances par date', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);

    $response = spa('POST', '/api/v1/invoices/'.$invoice->id.'/payments', ['amount' => 50000, 'method' => 'cash'], $school)->assertCreated()
        ->assertJsonPath('data.payment.receipt_number', 'REC-2026-000001')
        ->assertJsonPath('data.payment.amount', 50000)
        ->assertJsonPath('data.payment.method', 'cash')
        ->assertJsonPath('data.payment.payer_name', 'Mariam Koné')
        ->assertJsonPath('data.payment.cancellation', null)
        ->assertJsonPath('data.student.full_name', 'KONÉ Awa')
        ->assertJsonPath('data.classroom_name', 'CE1 A')
        ->assertJsonPath('data.remaining', 155000)
        ->assertJsonPath('data.school.name', $school->name)
        ->assertJsonPath('data.can_cancel', false);

    spa('POST', '/api/v1/invoices/'.$invoice->id.'/payments', ['amount' => 40000, 'method' => 'wave', 'reference' => 'WV-778899'], $school)->assertCreated()
        ->assertJsonPath('data.payment.receipt_number', 'REC-2026-000002')
        ->assertJsonPath('data.payment.reference', 'WV-778899');

    $student = $response->json('data.student.id');
    \assert(is_string($student));
    spa('GET', '/api/v1/students/'.$student.'/invoices', [], $school)->assertOk()
        ->assertJsonPath('data.0.balance.settled', 90000)
        ->assertJsonPath('data.0.balance.remaining', 115000)
        ->assertJsonPath('data.0.balance.overdue', 0)
        ->assertJsonPath('data.0.balance.credit', 0)
        ->assertJsonPath('data.0.balance.next.due_on', '2027-01-05')
        ->assertJsonPath('data.0.balance.next.amount', 55000)
        ->assertJsonPath('data.0.schedule.0.amount', 85000)
        ->assertJsonPath('data.0.schedule.0.settled', 85000)
        ->assertJsonPath('data.0.schedule.1.settled', 5000)
        ->assertJsonPath('data.0.schedule.2.settled', 0)
        ->assertJsonPath('data.0.payments.0.receipt_number', 'REC-2026-000002')
        ->assertJsonPath('data.0.can_collect', true)
        ->assertJsonPath('data.0.can_cancel', false);
});

it('refuse un montant au-delà du reste, une référence absente ou déjà enregistrée', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    $uri = '/api/v1/invoices/'.$invoice->id.'/payments';

    spa('POST', $uri, ['amount' => 205001, 'method' => 'cash'], $school)->assertConflict()->assertJsonPath('code', 'amount_exceeds');
    spa('POST', $uri, ['amount' => 1000, 'method' => 'orange_money'], $school)->assertUnprocessable()->assertJsonValidationErrors('reference');
    spa('POST', $uri, ['amount' => 0, 'method' => 'cheque', 'reference' => 'CHQ-1'], $school)->assertUnprocessable()->assertJsonValidationErrors('amount');
    spa('POST', $uri, ['amount' => 1000, 'method' => 'bitcoin'], $school)->assertUnprocessable()->assertJsonValidationErrors('method');
    pay($school, $invoice->id, 1000, 'orange_money', 'OM-123456');
    spa('POST', $uri, ['amount' => 1000, 'method' => 'orange_money', 'reference' => 'OM-123456'], $school)->assertConflict()->assertJsonPath('code', 'reference_used');

    pay($school, $invoice->id, 204000);
    spa('POST', $uri, ['amount' => 1000, 'method' => 'cash'], $school)->assertConflict()->assertJsonPath('code', 'nothing_due');
    // Les refus n'ont consommé aucun numéro
    expect(inSchool($school, static fn (): array => Payment::query()->orderBy('receipt_number')->pluck('receipt_number')->all()))
        ->toBe(['REC-2026-000001', 'REC-2026-000002']);
});

it('réserve l’encaissement à billing.manage sur le cycle et le reçu à qui voit l’élève', function (): void {
    [$school, $invoice] = billedSchool();
    $uri = '/api/v1/invoices/'.$invoice->id.'/payments';

    actingAsRole(Role::Secretary, $school);
    spa('POST', $uri, ['amount' => 1000, 'method' => 'cash'], $school)->assertForbidden();

    actingAsRole(Role::Accountant, $school, cycleOf($school, 'kindergarten'));
    spa('POST', $uri, ['amount' => 1000, 'method' => 'cash'], $school)->assertNotFound();

    actingAsRole(Role::Accountant, $school, cycleOf($school, 'primary'));
    $payment = pay($school, $invoice->id, 1000);

    // Parent de l'élève : il lit le reçu ; un autre parent : introuvable
    $parent = User::factory()->createOne(['phone' => '+2250701020304']);
    assignRole($parent, $school, Role::Guardian);
    login($parent);
    spa('GET', '/api/v1/payments/'.$payment, [], $school)->assertOk()->assertJsonPath('data.payment.receipt_number', 'REC-2026-000001');
    spa('POST', $uri, ['amount' => 1000, 'method' => 'cash'], $school)->assertForbidden();

    actingAsRole(Role::Guardian, $school);
    spa('GET', '/api/v1/payments/'.$payment, [], $school)->assertNotFound();
});

it('isole les paiements et les caisses entre deux écoles', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    $payment = pay($school, $invoice->id, 5000);
    $session = inSchool($school, static fn (): string => Payment::query()->findOrFail($payment)->cash_session_id ?? throw new LogicException('Caisse attendue.'));

    $other = makeSchool(['primary']);
    actingAsRole(Role::Director, $other);
    spa('GET', '/api/v1/payments/'.$payment, [], $other)->assertNotFound();
    spa('POST', '/api/v1/payments/'.$payment.'/cancel', ['reason' => 'Erreur'], $other)->assertNotFound();
    spa('POST', '/api/v1/invoices/'.$invoice->id.'/payments', ['amount' => 1000, 'method' => 'cash'], $other)->assertNotFound();
    spa('POST', '/api/v1/billing/cash-sessions/'.$session.'/close', ['counted_cash' => 0], $other)->assertNotFound();
    spa('GET', '/api/v1/billing/cash-desk', [], $other)->assertOk()->assertJsonPath('data.sessions', []);
});

it('annule un paiement (direction, motif) sans effacer le reçu ni réutiliser son numéro', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    $payment = pay($school, $invoice->id, 30000);
    spa('POST', '/api/v1/payments/'.$payment.'/cancel', ['reason' => 'Erreur de saisie'], $school)->assertForbidden();

    actingAsRole(Role::Director, $school);
    spa('POST', '/api/v1/payments/'.$payment.'/cancel', ['reason' => ''], $school)->assertUnprocessable()->assertJsonValidationErrors('reason');
    spa('POST', '/api/v1/payments/'.$payment.'/cancel', ['reason' => 'Erreur de saisie'], $school)->assertOk()
        ->assertJsonPath('data.payment.receipt_number', 'REC-2026-000001')
        ->assertJsonPath('data.payment.cancellation.reason', 'Erreur de saisie')
        ->assertJsonPath('data.remaining', 205000)
        ->assertJsonPath('data.can_cancel', false);
    spa('POST', '/api/v1/payments/'.$payment.'/cancel', ['reason' => 'Encore'], $school)->assertConflict()->assertJsonPath('code', 'already_cancelled');

    $next = pay($school, $invoice->id, 30000);
    spa('GET', '/api/v1/payments/'.$next, [], $school)->assertOk()->assertJsonPath('data.payment.receipt_number', 'REC-2026-000002');
});

it('garde les écritures comptables immuables en base', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    $payment = pay($school, $invoice->id, 30000);

    // Connexion applicative : ni modification ni suppression
    expect(static fn () => inSchool($school, static fn (): int => DB::update('UPDATE payments SET amount = 1 WHERE id = ?', [$payment])))
        ->toThrow(QueryException::class, 'permission denied');
    expect(static fn () => inSchool($school, static fn (): int => DB::delete('DELETE FROM payments WHERE id = ?', [$payment])))
        ->toThrow(QueryException::class, 'permission denied');
    // Même le propriétaire des tables ne modifie pas une écriture comptable (déclencheur)
    expect(static fn (): int => DB::connection('pgsql_owner')->update('UPDATE payments SET amount = 1 WHERE id = ?', [$payment]))
        ->toThrow(QueryException::class, 'immuable');
    expect(static fn (): int => DB::connection('pgsql_owner')->update('UPDATE payment_cancellations SET reason = ?', ['x']))
        ->not->toThrow(QueryException::class);
});

it('tient la caisse du jour par caissier et la clôture avec un écart justifié', function (): void {
    [$school, $invoice] = billedSchool();
    $cashier = actingAsRole(Role::Accountant, $school);
    pay($school, $invoice->id, 50000);
    pay($school, $invoice->id, 20000, 'mtn_momo', 'MTN-55');
    $cancelled = pay($school, $invoice->id, 10000);

    actingAsRole(Role::Director, $school);
    spa('POST', '/api/v1/payments/'.$cancelled.'/cancel', ['reason' => 'Doublon'], $school)->assertOk();

    login($cashier);
    $desk = spa('GET', '/api/v1/billing/cash-desk', [], $school)->assertOk()
        ->assertJsonPath('data.date', '2026-10-01')
        ->assertJsonPath('data.all_cashiers', true)
        ->assertJsonPath('data.net_total', 70000)
        ->assertJsonPath('data.sessions.0.is_mine', true)
        ->assertJsonPath('data.sessions.0.expected_cash', 50000)
        ->assertJsonPath('data.sessions.0.methods.0.method', 'cash')
        ->assertJsonPath('data.sessions.0.methods.0.collected', 60000)
        ->assertJsonPath('data.sessions.0.methods.0.cancelled', 10000)
        ->assertJsonPath('data.sessions.0.methods.1.method', 'mtn_momo')
        ->assertJsonPath('data.sessions.0.movements', static fn (mixed $rows): bool => is_array($rows) && count($rows) === 4);
    $session = $desk->json('data.sessions.0.id');
    \assert(is_string($session));
    $close = '/api/v1/billing/cash-sessions/'.$session.'/close';

    // Seul le caissier clôture sa caisse
    actingAsRole(Role::Director, $school);
    spa('POST', $close, ['counted_cash' => 50000], $school)->assertForbidden();

    login($cashier);
    spa('POST', $close, ['counted_cash' => 49000], $school)->assertUnprocessable()->assertJsonValidationErrors('note');
    spa('POST', $close, ['counted_cash' => 49000, 'note' => 'Billet de 1 000 manquant'], $school)->assertOk()
        ->assertJsonPath('data.expected_cash', 50000)
        ->assertJsonPath('data.counted_cash', 49000)
        ->assertJsonPath('data.difference', -1000)
        ->assertJsonPath('data.closed_at', static fn (mixed $value): bool => is_string($value));
    spa('POST', $close, ['counted_cash' => 50000], $school)->assertConflict()->assertJsonPath('code', 'cash_closed');
    spa('POST', '/api/v1/invoices/'.$invoice->id.'/payments', ['amount' => 1000, 'method' => 'cash'], $school)->assertConflict()->assertJsonPath('code', 'cash_closed');

    // Annulation après clôture : comptée dans la caisse du jour de la direction, la caisse clôturée ne bouge pas
    $first = inSchool($school, static fn (): string => Payment::query()->where('receipt_number', 'REC-2026-000001')->firstOrFail()->id);
    $director = actingAsRole(Role::Director, $school);
    spa('POST', '/api/v1/payments/'.$first.'/cancel', ['reason' => 'Chèque sans provision'], $school)->assertOk();
    spa('GET', '/api/v1/billing/cash-desk', [], $school)->assertOk()
        ->assertJsonPath('data.sessions.0.cashier_name', $director->name)
        ->assertJsonPath('data.sessions.0.expected_cash', -50000)
        ->assertJsonPath('data.sessions.1.expected_cash', 50000)
        ->assertJsonPath('data.sessions.1.counted_cash', 49000);
});

it('limite la caisse d’un caissier d’un cycle à sa propre caisse', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    pay($school, $invoice->id, 5000);

    actingAsRole(Role::Accountant, $school, cycleOf($school, 'primary'));
    spa('GET', '/api/v1/billing/cash-desk', [], $school)->assertOk()
        ->assertJsonPath('data.all_cashiers', false)
        ->assertJsonPath('data.sessions', []);
    spa('GET', '/api/v1/billing/cash-desk?date=2026-10-01', [], $school)->assertOk();
    spa('GET', '/api/v1/billing/cash-desk?date=01/10/2026', [], $school)->assertUnprocessable();

    actingAsRole(Role::Secretary, $school);
    spa('GET', '/api/v1/billing/cash-desk', [], $school)->assertForbidden();
    actingAsRole(Role::Guardian, $school);
    spa('GET', '/api/v1/billing/cash-desk', [], $school)->assertForbidden();
});

it('annule au départ les échéances des périodes non commencées, rembourse le trop-perçu et rétablit au retour', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    pay($school, $invoice->id, 205000);
    $enrollment = inSchool($school, static fn (): Enrollment => Enrollment::query()->findOrFail($invoice->enrollment_id));

    actingAsRole(Role::Director, $school);
    spa('PATCH', '/api/v1/enrollments/'.$enrollment->id, ['status' => 'left', 'left_on' => '2027-02-10', 'leave_reason' => 'Mutation des parents'], $school)->assertOk();

    $student = $invoice->student_id;
    $data = spa('GET', '/api/v1/students/'.$student.'/invoices', [], $school)->assertOk()
        ->assertJsonPath('data.0.total', 145000)
        ->assertJsonPath('data.0.left_on', '2027-02-10')
        ->assertJsonPath('data.0.lines.2.kind', 'departure')
        ->assertJsonPath('data.0.lines.2.amount', -60000)
        ->assertJsonPath('data.0.lines.2.reason', 'Départ le 10/02/2027 : Mutation des parents')
        ->assertJsonPath('data.0.balance.settled', 205000)
        ->assertJsonPath('data.0.balance.credit', 60000)
        ->assertJsonPath('data.0.balance.remaining', 0)
        ->assertJsonPath('data.0.can_refund', true)
        ->assertJsonPath('data.0.schedule', static fn (mixed $rows): bool => is_array($rows) && array_column($rows, 'due_on') === ['2026-09-14', '2027-01-05']);
    expect(assertBalanced($school, $invoice))->toBe(145000);
    expect($data->json('data.0.payments.0.cancellation'))->toBeNull();

    $refunds = '/api/v1/invoices/'.$invoice->id.'/refunds';
    actingAsRole(Role::Accountant, $school);
    spa('POST', $refunds, ['amount' => 60000, 'method' => 'cash', 'reason' => 'Départ'], $school)->assertForbidden();

    actingAsRole(Role::Director, $school);
    spa('POST', $refunds, ['amount' => 60001, 'method' => 'cash', 'reason' => 'Départ'], $school)->assertConflict()->assertJsonPath('code', 'amount_exceeds_credit');
    spa('POST', $refunds, ['amount' => 60000, 'method' => 'cash'], $school)->assertUnprocessable()->assertJsonValidationErrors('reason');
    spa('POST', $refunds, ['amount' => 60000, 'method' => 'cash', 'reason' => 'Trop-perçu après départ'], $school)->assertOk()
        ->assertJsonPath('data.balance.settled', 145000)
        ->assertJsonPath('data.balance.credit', 0)
        ->assertJsonPath('data.refunds.0.number', 'RMB-2026-000001')
        ->assertJsonPath('data.refunds.0.reason', 'Trop-perçu après départ');
    spa('POST', $refunds, ['amount' => 1, 'method' => 'cash', 'reason' => 'Encore'], $school)->assertConflict()->assertJsonPath('code', 'no_credit');
    spa('GET', '/api/v1/billing/cash-desk', [], $school)->assertOk()->assertJsonPath('data.sessions.0.expected_cash', -60000);

    // Retour : la ligne de départ disparaît, le reste dû revient
    spa('PATCH', '/api/v1/enrollments/'.$enrollment->id, ['status' => 'active'], $school)->assertOk();
    spa('GET', '/api/v1/students/'.$student.'/invoices', [], $school)->assertOk()
        ->assertJsonPath('data.0.total', 205000)
        ->assertJsonPath('data.0.left_on', null)
        ->assertJsonPath('data.0.balance.remaining', 60000);
});

it('applique la politique de l’école qui garde toutes les échéances au départ', function (): void {
    [$school, $invoice] = billedSchool();

    actingAsRole(Role::Accountant, $school);
    spa('GET', '/api/v1/billing/policy', [], $school)->assertOk()->assertJsonPath('data.departure', 'cancel_unstarted');
    spa('PUT', '/api/v1/billing/policy', ['departure' => 'keep_all'], $school)->assertForbidden();

    actingAsRole(Role::Director, $school, cycleOf($school, 'primary'));
    spa('PUT', '/api/v1/billing/policy', ['departure' => 'keep_all'], $school)->assertForbidden();

    actingAsRole(Role::Director, $school);
    spa('PUT', '/api/v1/billing/policy', ['departure' => 'tout'], $school)->assertUnprocessable()->assertJsonValidationErrors('departure');
    spa('PUT', '/api/v1/billing/policy', ['departure' => 'keep_all'], $school)->assertOk()->assertJsonPath('data.departure', 'keep_all');
    spa('PATCH', '/api/v1/enrollments/'.$invoice->enrollment_id, ['status' => 'left', 'left_on' => '2026-10-15'], $school)->assertOk();
    spa('GET', '/api/v1/students/'.$invoice->student_id.'/invoices', [], $school)->assertOk()
        ->assertJsonPath('data.0.total', 205000);
    spa('POST', '/api/v1/invoices/'.$invoice->id.'/options', ['fee_type_id' => feeTypeOf($school, 'canteen')->id], $school)->assertConflict()->assertJsonPath('code', 'student_left');
});

it('reporte un trop-perçu sur la facture d’un frère ou d’une sœur du même payeur', function (): void {
    [$school, $invoice] = billedSchool();
    $sibling = enrollStudent($school, classroomOf($school, 'CE1', 'B'), ['first_name' => 'Ismaël', 'gender' => 'M']);
    $siblingInvoice = invoiceOf($school, $sibling);
    $stranger = enrollStudent($school, classroomOf($school, 'CE1', 'C'), ['first_name' => 'Yao', 'last_name' => 'Kouassi', 'gender' => 'M', 'guardian_phone' => '+2250505050505', 'guardian_name' => 'Paul Kouassi']);
    $strangerInvoice = invoiceOf($school, $stranger);

    actingAsRole(Role::Accountant, $school);
    pay($school, $invoice->id, 205000);
    actingAsRole(Role::Director, $school);
    spa('PATCH', '/api/v1/enrollments/'.$invoice->enrollment_id, ['status' => 'left', 'left_on' => '2027-02-10'], $school)->assertOk();

    $uri = '/api/v1/invoices/'.$invoice->id.'/credit-transfers';
    spa('GET', '/api/v1/students/'.$invoice->student_id.'/invoices', [], $school)->assertOk()
        ->assertJsonPath('data.0.credit_targets.0.invoice_id', $siblingInvoice->id)
        ->assertJsonPath('data.0.credit_targets', static fn (mixed $rows): bool => is_array($rows) && count($rows) === 1);
    spa('POST', $uri, ['to_invoice_id' => $strangerInvoice->id, 'amount' => 10000, 'reason' => 'Report'], $school)->assertConflict()->assertJsonPath('code', 'other_payer');
    spa('POST', $uri, ['to_invoice_id' => '01890000-0000-7000-8000-000000000000', 'amount' => 10000, 'reason' => 'Report'], $school)->assertUnprocessable()->assertJsonValidationErrors('to_invoice_id');
    spa('POST', $uri, ['to_invoice_id' => $siblingInvoice->id, 'amount' => 60000, 'reason' => 'Report sur la scolarité d’Ismaël'], $school)->assertOk()
        ->assertJsonPath('data.balance.credit', 0)
        ->assertJsonPath('data.transfers.0.direction', 'out')
        ->assertJsonPath('data.transfers.0.other_student_name', 'KONÉ Ismaël');
    spa('GET', '/api/v1/students/'.$sibling->id.'/invoices', [], $school)->assertOk()
        ->assertJsonPath('data.0.balance.settled', 60000)
        ->assertJsonPath('data.0.transfers.0.direction', 'in');
});

it('garde une facture équilibrée quand une remise précède le départ', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Director, $school);
    spa('POST', '/api/v1/invoices/'.$invoice->id.'/discounts', ['amount' => 30000, 'reason' => 'Fratrie'], $school)->assertOk();
    spa('PATCH', '/api/v1/enrollments/'.$invoice->enrollment_id, ['status' => 'left', 'left_on' => '2027-02-10'], $school)->assertOk();
    expect(assertBalanced($school, $invoice))->toBe(145000);

    // Une ligne ajoutée ensuite redistribue les remises sans déséquilibrer la facture ni rouvrir l'échéance annulée
    spa('POST', '/api/v1/invoices/'.$invoice->id.'/lines', ['label' => 'Tenue', 'amount' => 5000, 'due_on' => '2026-11-02'], $school)->assertOk()
        ->assertJsonPath('data.total', 150000)
        ->assertJsonPath('data.schedule', static fn (mixed $rows): bool => is_array($rows) && ! in_array('2027-04-05', array_column($rows, 'due_on'), true));
    expect(assertBalanced($school, $invoice))->toBe(150000);

    // Nouvelle date de départ : la ligne de départ est recalculée, jamais cumulée
    spa('PATCH', '/api/v1/enrollments/'.$invoice->enrollment_id, ['status' => 'left', 'left_on' => '2026-12-01'], $school)->assertOk();
    expect(assertBalanced($school, $invoice))->toBe(90000);
});

it('recalcule la ligne de départ quand une ligne annulée par le départ est retirée', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Director, $school);
    $line = spa('POST', '/api/v1/invoices/'.$invoice->id.'/lines', ['label' => 'Sortie de fin d’année', 'amount' => 5000, 'due_on' => '2027-03-01'], $school)
        ->assertOk()->json('data.lines.2.id');
    \assert(is_string($line));
    spa('PATCH', '/api/v1/enrollments/'.$invoice->enrollment_id, ['status' => 'left', 'left_on' => '2027-02-10'], $school)->assertOk();
    // Avril et la sortie de mars sont annulés
    expect(assertBalanced($school, $invoice))->toBe(145000);

    // Retirer la sortie ne réduit pas la facture une seconde fois
    spa('DELETE', '/api/v1/invoices/'.$invoice->id.'/lines/'.$line, [], $school)->assertOk()
        ->assertJsonPath('data.total', 145000)
        ->assertJsonPath('data.balance.credit', 0)
        ->assertJsonPath('data.schedule', static fn (mixed $rows): bool => is_array($rows) && array_column($rows, 'due_on') === ['2026-09-14', '2027-01-05']);
    expect(assertBalanced($school, $invoice))->toBe(145000);
});
