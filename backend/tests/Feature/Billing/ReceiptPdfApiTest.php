<?php

declare(strict_types=1);

use App\Domains\Billing\Enums\NotificationStatus;
use App\Domains\Billing\Enums\ReceiptFileStatus;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\PaymentNotification;
use App\Domains\Billing\Models\ReceiptFile;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Contracts\SmsSender;
use App\Domains\Messaging\Sms\UnconfiguredSmsSender;
use App\Domains\Tenancy\Models\School;
use App\Support\Pdf\FakePdfRenderer;
use App\Support\Pdf\PdfRenderer;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;

use function Pest\Laravel\get;

function receiptRenderer(): FakePdfRenderer
{
    // GOTENBERG_URL vide en test (phpunit.xml) : rendu factice
    return app(PdfRenderer::class);
}

/** @return TestResponse<Response> */
function receiptPdf(School $school, string $payment): TestResponse
{
    return spa('GET', '/api/v1/payments/'.$payment.'/receipt-pdf', [], $school);
}

/** @param TestResponse<Response> $response */
function receiptUrl(TestResponse $response): string
{
    $url = $response->json('data.url');

    return is_string($url) ? $url : throw new LogicException('URL du reçu attendue.');
}

function notificationOf(School $school, string $payment): ?PaymentNotification
{
    return inSchool($school, static fn (): ?PaymentNotification => PaymentNotification::query()->where('payment_id', $payment)->first());
}

beforeEach(function (): void {
    Carbon::setTestNow('2026-10-01 09:30:00');
    Storage::fake();
});

afterEach(function (): void {
    Carbon::setTestNow();
});

it('rend le reçu PDF d’un encaissement et le sert par une URL signée de 10 minutes', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    $payment = pay($school, $invoice->id, 1250);

    $response = receiptPdf($school, $payment)->assertOk()
        ->assertJsonPath('data.status', 'ready')
        ->assertJsonPath('data.cancelled', false);
    expect(receiptRenderer()->rendered)->toHaveCount(1)
        ->and(receiptRenderer()->rendered[0])->toContain(
            'Reçu de paiement', 'REC-2026-000001', 'Le 01/10/2026 à 09:30', "1\u{202F}250 FCFA", 'Arrêté le présent reçu à la somme de : mille deux cent cinquante francs CFA.',
            'Mariam Koné', 'KONÉ Awa', 'CE1 A', 'Espèces', "203\u{202F}750 FCFA",
        )
        ->and(receiptRenderer()->rendered[0])->not->toContain('ANNULÉ');

    $parts = parse_url(receiptUrl($response));
    $path = is_array($parts) ? ($parts['path'] ?? '') : '';
    expect($path)->toMatch('#^/api/v1/files/receipts/[0-9a-f-]{36}\.pdf$#');
    $file = get($path.'?'.(is_array($parts) ? ($parts['query'] ?? '') : ''))->assertOk()
        ->assertHeader('Content-Type', 'application/pdf')
        ->assertHeader('Referrer-Policy', 'no-referrer');
    expect($file->getContent())->toStartWith('%PDF');
    get($path)->assertForbidden();

    // Relu : le même fichier, pas de nouveau rendu
    receiptPdf($school, $payment)->assertOk()->assertJsonPath('data.status', 'ready');
    expect(receiptRenderer()->rendered)->toHaveCount(1);

    // URL expirée au-delà de 10 minutes
    Carbon::setTestNow('2026-10-01 09:41:00');
    get($path.'?'.(is_array($parts) ? ($parts['query'] ?? '') : ''))->assertForbidden();
});

it('rend une version « ANNULÉ » après une annulation, sans toucher à la première', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    $payment = pay($school, $invoice->id, 30000);
    $first = receiptUrl(receiptPdf($school, $payment));

    actingAsRole(Role::Director, $school);
    spa('POST', '/api/v1/payments/'.$payment.'/cancel', ['reason' => 'Erreur de saisie'], $school)->assertOk();

    $cancelled = receiptPdf($school, $payment)->assertOk()
        ->assertJsonPath('data.status', 'ready')
        ->assertJsonPath('data.cancelled', true);
    expect(receiptUrl($cancelled))->not->toBe($first)
        ->and(receiptRenderer()->rendered)->toHaveCount(2)
        ->and(receiptRenderer()->rendered[1])->toContain('ANNULÉ le 01/10/2026', 'Motif : Erreur de saisie', 'REC-2026-000001');
    expect(inSchool($school, static fn (): array => ReceiptFile::query()->orderBy('cancelled')->pluck('cancelled')->all()))->toBe([false, true]);
});

it('note un rendu en échec, ne le relance que sur demande et rend un reçu antérieur aux PDF', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    receiptRenderer()->failing = true;
    $payment = pay($school, $invoice->id, 30000);

    receiptPdf($school, $payment)->assertOk()->assertJsonPath('data.status', 'failed')->assertJsonPath('data.url', null);
    receiptRenderer()->failing = false;
    receiptPdf($school, $payment)->assertOk()->assertJsonPath('data.status', 'failed');
    spa('POST', '/api/v1/payments/'.$payment.'/receipt-pdf', [], $school)->assertOk()->assertJsonPath('data.status', 'ready');

    // Paiement sans fiche de reçu (encaissé avant les reçus PDF) : rendu à la première demande
    inSchool($school, static fn (): mixed => ReceiptFile::query()->where('payment_id', $payment)->delete());
    receiptPdf($school, $payment)->assertOk()->assertJsonPath('data.status', 'ready');
    expect(receiptRenderer()->rendered)->toHaveCount(2);
});

it('réserve le reçu PDF à qui voit la facture et l’isole entre deux écoles', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    $payment = pay($school, $invoice->id, 30000);

    $parent = User::factory()->createOne(['phone' => '+2250701020304']);
    assignRole($parent, $school, Role::Guardian);
    login($parent);
    receiptPdf($school, $payment)->assertOk()->assertJsonPath('data.status', 'ready');

    actingAsRole(Role::Guardian, $school);
    receiptPdf($school, $payment)->assertNotFound();
    spa('POST', '/api/v1/payments/'.$payment.'/receipt-pdf', [], $school)->assertNotFound();

    actingAsRole(Role::Accountant, $school, cycleOf($school, 'kindergarten'));
    receiptPdf($school, $payment)->assertNotFound();

    $other = makeSchool(['primary']);
    actingAsRole(Role::Director, $other);
    receiptPdf($other, $payment)->assertNotFound();
    spa('POST', '/api/v1/payments/'.$payment.'/receipt-pdf', [], $other)->assertNotFound();
});

it('envoie au payeur un SMS de confirmation sans donnée sur l’enfant, une seule fois', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    $payment = pay($school, $invoice->id, 50000);

    expect(sentSms())->toHaveCount(1)
        ->and(sentSms()[0]['to'])->toBe('+2250701020304')
        ->and(sentSms()[0]['message'])->toBe($school->name." : paiement de 50\u{202F}000 FCFA reçu le 01/10/2026 (reçu REC-2026-000001). Merci.")
        ->and(sentSms()[0]['message'])->not->toContain('Awa');
    expect(notificationOf($school, $payment)?->status)->toBe(NotificationStatus::Sent);

    // Une annulation ne renvoie pas de confirmation
    actingAsRole(Role::Director, $school);
    spa('POST', '/api/v1/payments/'.$payment.'/cancel', ['reason' => 'Erreur'], $school)->assertOk();
    expect(sentSms())->toHaveCount(1);
});

it('note un SMS sans numéro de payeur ou sans fournisseur configuré', function (): void {
    [$school, $invoice] = billedSchool();
    actingAsRole(Role::Accountant, $school);
    inSchool($school, static fn (): int => Invoice::query()->whereKey($invoice->id)->update(['payer_id' => null]));
    $skipped = pay($school, $invoice->id, 1000);
    expect(notificationOf($school, $skipped)?->status)->toBe(NotificationStatus::Skipped)
        ->and(sentSms())->toBe([]);

    inSchool($school, static fn (): int => Invoice::query()->whereKey($invoice->id)->update(['payer_id' => $invoice->payer_id]));
    app()->instance(SmsSender::class, new UnconfiguredSmsSender);
    $failed = pay($school, $invoice->id, 1000);
    $notification = notificationOf($school, $failed);
    expect($notification?->status)->toBe(NotificationStatus::Failed)
        ->and($notification?->failure)->toBe('Aucun fournisseur SMS n’est configuré.');
    // Le reçu PDF ne dépend pas du SMS
    expect(inSchool($school, static fn (): ?ReceiptFileStatus => ReceiptFile::query()->where('payment_id', $failed)->first()?->status))->toBe(ReceiptFileStatus::Ready);
});
