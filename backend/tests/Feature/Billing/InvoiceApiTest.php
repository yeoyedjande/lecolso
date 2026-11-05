<?php

declare(strict_types=1);

use App\Domains\Billing\Actions\CreateInvoice;
use App\Domains\Billing\Models\Installment;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\InvoiceLine;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Guardian;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;
use Illuminate\Support\Carbon;

/**
 * Facture de l'élève (créée d'après la grille ; services optionnels choisis).
 *
 * @param  list<string>  $options
 */
function invoiceOf(School $school, Student $student, array $options = []): Invoice
{
    $invoice = inSchool($school, static fn (): ?Invoice => app(CreateInvoice::class)->handle(
        Enrollment::query()->where('student_id', $student->id)->firstOrFail(),
        $options,
    ));

    return $invoice ?? throw new LogicException('Grille vide : aucune facture.');
}

/** Somme des échéances d'une facture, et somme des lignes : toujours égales. */
function assertBalanced(School $school, Invoice $invoice): int
{
    $lines = inSchool($school, static fn (): int => (int) InvoiceLine::query()->where('invoice_id', $invoice->id)->sum('amount'));
    $installments = inSchool($school, static fn (): int => (int) Installment::query()->where('invoice_id', $invoice->id)->sum('amount'));
    expect($installments)->toBe($lines);

    return $lines;
}

it('facture l’inscription d’après la grille du niveau et les services choisis', function (): void {
    $school = makeSchool(['primary']);
    $classroom = classroomOf($school, 'CE1');
    setFees($school, 'CE1', ['registration' => 25000, 'tuition' => 180000, 'canteen' => 60000, 'transport' => 45000]);
    actingAsRole(Role::Secretary, $school);

    $student = spa('POST', '/api/v1/enrollments', [
        'classroom_id' => $classroom->id,
        'student' => ['first_name' => 'Awa', 'last_name' => 'Koné', 'gender' => 'F', 'birth_date' => '2019-03-14'],
        'guardians' => [['name' => 'Mariam Koné', 'phone' => '0701020304', 'relation' => 'mother']],
        'options' => ['canteen'],
        'enrolled_on' => '2026-09-14',
    ], $school)->assertCreated()->json('data.id');
    \assert(is_string($student));

    spa('GET', '/api/v1/students/'.$student.'/invoices', [], $school)->assertOk()
        ->assertJsonPath('data.0.total', 265000)
        ->assertJsonPath('data.0.payer.name', 'Mariam Koné')
        ->assertJsonPath('data.0.classroom_name', 'CE1 A')
        ->assertJsonPath('data.0.lines.0.label', 'Inscription')
        ->assertJsonPath('data.0.lines.1.label', 'Scolarité')
        ->assertJsonPath('data.0.lines.2.label', 'Cantine')
        ->assertJsonPath('data.0.schedule.0.due_on', '2026-09-14')
        ->assertJsonPath('data.0.schedule.0.amount', 105000)
        ->assertJsonPath('data.0.schedule.1.due_on', '2027-01-05')
        ->assertJsonPath('data.0.schedule.1.amount', 80000)
        ->assertJsonPath('data.0.available_options.0.code', 'transport')
        ->assertJsonPath('data.0.can_manage', false)
        ->assertJsonPath('data.0.can_discount', false);
});

it('refuse un service inconnu ou obligatoire à l’inscription', function (string $option): void {
    $school = makeSchool(['primary']);
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/enrollments', [
        'classroom_id' => classroomOf($school, 'CE1')->id,
        'student' => ['first_name' => 'Awa', 'last_name' => 'Koné', 'gender' => 'F', 'birth_date' => '2019-03-14'],
        'guardians' => [['name' => 'Mariam Koné', 'phone' => '0701020304', 'relation' => 'mother']],
        'options' => [$option],
    ], $school)->assertUnprocessable()->assertJsonValidationErrors('options.0');
    expect(inSchool($school, static fn (): int => Student::query()->count()))->toBe(0);
})->with(['piscine', 'tuition']);

it('ne facture que les échéances restantes à une inscription en cours d’année', function (): void {
    $school = makeSchool(['primary']);
    setFees($school, 'CE1', ['registration' => 25000, 'tuition' => 180000]);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    inSchool($school, static fn () => Enrollment::query()->update(['enrolled_on' => '2027-02-01']));

    $invoice = invoiceOf($school, $student);

    expect(assertBalanced($school, $invoice))->toBe(25000 + 120000);
    $dates = inSchool($school, static fn (): array => Installment::query()->where('invoice_id', $invoice->id)->orderBy('due_on')->get()
        ->map(static fn (Installment $row): array => [$row->due_on->toDateString(), $row->amount])->all());
    expect($dates)->toBe([['2027-02-01', 25000], ['2027-02-01', 60000], ['2027-04-05', 60000]]);
});

it('accorde une remise répartie depuis la dernière échéance, réservée à la direction', function (): void {
    $school = makeSchool(['primary']);
    setFees($school, 'CE1', ['registration' => 25000, 'tuition' => 180000]);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    $invoice = invoiceOf($school, $student);

    actingAsRole(Role::Accountant, $school);
    spa('POST', '/api/v1/invoices/'.$invoice->id.'/discounts', ['amount' => 10000, 'reason' => 'Fratrie'], $school)->assertForbidden();

    actingAsRole(Role::Director, $school);
    spa('POST', '/api/v1/invoices/'.$invoice->id.'/discounts', ['amount' => 70000, 'reason' => 'Bourse de mérite'], $school)->assertOk()
        ->assertJsonPath('data.total', 135000)
        ->assertJsonPath('data.discount_total', 70000)
        ->assertJsonPath('data.lines.2.kind', 'discount')
        ->assertJsonPath('data.lines.2.amount', -70000)
        ->assertJsonPath('data.lines.2.reason', 'Bourse de mérite')
        ->assertJsonPath('data.schedule.0.amount', 85000)
        ->assertJsonPath('data.schedule.1.amount', 50000)
        ->assertJsonPath('data.schedule', static fn (mixed $schedule): bool => is_array($schedule) && count($schedule) === 2);
    expect(assertBalanced($school, $invoice))->toBe(135000);

    spa('POST', '/api/v1/invoices/'.$invoice->id.'/discounts', ['amount' => 200000, 'reason' => 'Trop'], $school)
        ->assertStatus(409)->assertJsonPath('code', 'discount_exceeds');
    spa('POST', '/api/v1/invoices/'.$invoice->id.'/discounts', ['amount' => 5000], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('reason');

    $discount = inSchool($school, static fn (): string => InvoiceLine::query()->where('kind', 'discount')->firstOrFail()->id);
    spa('DELETE', '/api/v1/invoices/'.$invoice->id.'/lines/'.$discount, [], $school)->assertOk()->assertJsonPath('data.total', 205000);
});

it('ajoute une ligne à la main, puis la retire', function (): void {
    $school = makeSchool(['primary']);
    setFees($school, 'CE1', ['tuition' => 90000]);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    $invoice = invoiceOf($school, $student);
    actingAsRole(Role::Accountant, $school);

    $response = spa('POST', '/api/v1/invoices/'.$invoice->id.'/lines', ['label' => 'Tenue scolaire', 'amount' => 12500, 'due_on' => '2026-10-01'], $school)
        ->assertOk()->assertJsonPath('data.total', 102500)->assertJsonPath('data.lines.1.kind', 'manual');
    $line = $response->json('data.lines.1.id');
    \assert(is_string($line));

    spa('POST', '/api/v1/invoices/'.$invoice->id.'/lines', ['label' => 'X', 'amount' => 0], $school)
        ->assertUnprocessable()->assertJsonValidationErrors(['label', 'amount']);
    $tuition = inSchool($school, static fn (): string => InvoiceLine::query()->where('kind', 'fee')->firstOrFail()->id);
    spa('DELETE', '/api/v1/invoices/'.$invoice->id.'/lines/'.$tuition, [], $school)->assertUnprocessable()->assertJsonValidationErrors('line');
    spa('DELETE', '/api/v1/invoices/'.$invoice->id.'/lines/'.$line, [], $school)->assertOk()->assertJsonPath('data.total', 90000);
});

it('ajoute un service en cours d’année puis le retire, les périodes commencées restant dues', function (): void {
    $school = makeSchool(['primary']);
    setFees($school, 'CE1', ['tuition' => 90000, 'canteen' => 60000]);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    $invoice = invoiceOf($school, $student);
    $canteen = feeTypeOf($school, 'canteen');
    actingAsRole(Role::Director, $school);

    Carbon::setTestNow('2026-12-01');
    spa('POST', '/api/v1/invoices/'.$invoice->id.'/options', ['fee_type_id' => $canteen->id], $school)->assertOk()
        ->assertJsonPath('data.total', 150000)
        ->assertJsonPath('data.available_options', []);
    spa('POST', '/api/v1/invoices/'.$invoice->id.'/options', ['fee_type_id' => $canteen->id], $school)
        ->assertStatus(409)->assertJsonPath('code', 'option_present');

    Carbon::setTestNow('2027-02-10');
    spa('DELETE', '/api/v1/invoices/'.$invoice->id.'/options/'.$canteen->id, [], $school)->assertOk()
        ->assertJsonPath('data.total', 130000);
    Carbon::setTestNow();
    expect(assertBalanced($school, $invoice))->toBe(130000);
});

it('refuse un service sans montant dans la grille', function (): void {
    $school = makeSchool(['primary']);
    setFees($school, 'CE1', ['tuition' => 90000]);
    $invoice = invoiceOf($school, enrollStudent($school, classroomOf($school, 'CE1')));
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/invoices/'.$invoice->id.'/options', ['fee_type_id' => feeTypeOf($school, 'transport')->id], $school)
        ->assertStatus(409)->assertJsonPath('code', 'no_amount');
    spa('POST', '/api/v1/invoices/'.$invoice->id.'/options', ['fee_type_id' => feeTypeOf($school, 'tuition')->id], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('fee_type_id');
});

it('montre la facture au parent de l’enfant, pas aux autres', function (): void {
    $school = makeSchool(['primary']);
    setFees($school, 'CE1', ['tuition' => 90000]);
    setFees($school, 'CE2', ['tuition' => 90000]);
    $child = enrollStudent($school, classroomOf($school, 'CE1'));
    $other = enrollStudent($school, classroomOf($school, 'CE2'), ['guardian_phone' => '+2250102030405']);
    invoiceOf($school, $child);
    $foreignInvoice = invoiceOf($school, $other);
    $parent = User::factory()->createOne(['phone' => '+2250701020304']);
    assignRole($parent, $school, Role::Guardian);
    login($parent)->assertOk();

    spa('GET', '/api/v1/students/'.$child->id.'/invoices', [], $school)->assertOk()->assertJsonPath('data.0.total', 90000);
    spa('GET', '/api/v1/students/'.$other->id.'/invoices', [], $school)->assertNotFound();
    spa('POST', '/api/v1/invoices/'.$foreignInvoice->id.'/lines', ['label' => 'Pirate', 'amount' => 1], $school)->assertNotFound();
});

it('isole les factures entre deux écoles et limite la gestion au cycle', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    setFees($school, 'CE1', ['tuition' => 90000]);
    $invoice = invoiceOf($school, enrollStudent($school, classroomOf($school, 'CE1')));

    $other = makeSchool(['primary']);
    actingAsRole(Role::Director, $other);
    spa('POST', '/api/v1/invoices/'.$invoice->id.'/lines', ['label' => 'Pirate', 'amount' => 1], $other)->assertNotFound();

    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));
    spa('POST', '/api/v1/invoices/'.$invoice->id.'/lines', ['label' => 'Hors cycle', 'amount' => 1], $school)->assertNotFound();

    actingAsRole(Role::Teacher, $school);
    spa('GET', '/api/v1/students/'.$invoice->student_id.'/invoices', [], $school)->assertNotFound();
});

it('adresse la facture au nouveau payeur', function (): void {
    $school = makeSchool(['primary']);
    setFees($school, 'CE1', ['tuition' => 90000]);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    invoiceOf($school, $student);
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/students/'.$student->id.'/guardians', ['name' => 'Ibrahim Koné', 'phone' => '0501020304', 'relation' => 'father', 'is_payer' => true], $school)->assertOk();
    spa('GET', '/api/v1/students/'.$student->id.'/invoices', [], $school)->assertJsonPath('data.0.payer.name', 'Ibrahim Koné');

    $father = inSchool($school, static fn (): Guardian => Guardian::query()->where('phone', '+2250501020304')->firstOrFail());
    spa('PATCH', '/api/v1/students/'.$student->id.'/guardians/'.$father->id, ['name' => 'Ibrahim Koné Traoré'], $school)->assertOk();
    spa('GET', '/api/v1/students/'.$student->id.'/invoices', [], $school)->assertJsonPath('data.0.payer.name', 'Ibrahim Koné Traoré');
});

it('accepte un libellé de ligne long', function (): void {
    $school = makeSchool(['primary']);
    setFees($school, 'CE1', ['tuition' => 90000]);
    $invoice = invoiceOf($school, enrollStudent($school, classroomOf($school, 'CE1')));
    actingAsRole(Role::Director, $school);
    $label = str_repeat('Sortie pédagogique au musée ', 4);

    spa('POST', '/api/v1/invoices/'.$invoice->id.'/lines', ['label' => trim($label), 'amount' => 3000], $school)
        ->assertOk()->assertJsonPath('data.lines.1.label', trim($label));
});

it('ne crée pas de facture vide : l’élève inscrit avant la grille est facturé ensuite', function (): void {
    $school = makeSchool(['primary']);
    $classroom = classroomOf($school, 'CE1');
    actingAsRole(Role::Director, $school);

    $student = spa('POST', '/api/v1/enrollments', [
        'classroom_id' => $classroom->id,
        'student' => ['first_name' => 'Awa', 'last_name' => 'Koné', 'gender' => 'F', 'birth_date' => '2019-03-14'],
        'guardians' => [['name' => 'Mariam Koné', 'phone' => '0701020304', 'relation' => 'mother']],
        'enrolled_on' => '2026-09-14',
    ], $school)->assertCreated()->json('data.id');
    \assert(is_string($student));
    spa('GET', '/api/v1/students/'.$student.'/invoices', [], $school)->assertOk()->assertJsonCount(0, 'data');
    spa('POST', '/api/v1/billing/invoices/generate', [], $school)->assertJsonPath('created', 0);

    setFees($school, 'CE1', ['tuition' => 90000]);
    spa('GET', '/api/v1/billing/grid', [], $school)->assertJsonPath('data.pending_invoices', 1);
    spa('POST', '/api/v1/billing/invoices/generate', [], $school)->assertJsonPath('created', 1);
    spa('GET', '/api/v1/students/'.$student.'/invoices', [], $school)->assertJsonPath('data.0.total', 90000);
});
