<?php

declare(strict_types=1);

namespace App\Domains\Billing\Jobs;

use App\Domains\Billing\Enums\ReceiptFileStatus;
use App\Domains\Billing\Models\Payment;
use App\Domains\Billing\Models\ReceiptFile;
use App\Domains\Billing\Support\ReceiptDocument;
use App\Domains\Billing\Support\ReceiptPdf;
use App\Support\Pdf\PdfRenderer;
use App\Support\Pdf\PdfRenderingFailed;
use App\Support\Tenancy\RunsInSchool;
use App\Support\Tenancy\TenantAware;
use App\Support\Tenancy\TenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Filesystem\Factory as Filesystems;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\View\Factory as Views;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Throwable;

/**
 * Rendu du reçu PDF d'un paiement, dans l'école du paiement : gabarit Blade `receipts.receipt` (mention « ANNULÉ »
 * pour la version annulée), PdfRenderer (Gotenberg), fichier privé à nom aléatoire (écriture vérifiée). Un échec est
 * noté (`failed`), y compris quand la tâche elle-même échoue (délai dépassé, stockage indisponible : `failed()`) ;
 * on relance depuis le reçu. Aucune donnée du reçu n'est journalisée.
 */
final class RenderReceipt implements ShouldQueue, TenantAware
{
    use Dispatchable, InteractsWithQueue, Queueable, RunsInSchool;

    public int $tries = 1;

    public int $timeout = 120;

    public function __construct(
        public string $schoolId,
        public string $receiptFileId,
    ) {}

    public function handle(ReceiptDocument $document, PdfRenderer $renderer, Views $views, Filesystems $filesystems, TenantContext $context): void
    {
        $file = ReceiptFile::query()->find($this->receiptFileId);
        $school = $context->school();
        if ($file === null || $file->status !== ReceiptFileStatus::Pending || $school === null) {
            return;
        }
        $payment = Payment::query()->find($file->payment_id);
        if ($payment === null) {
            return;
        }

        try {
            $html = $views->make('receipts.receipt', $document->data($school, $payment, $file->cancelled, Carbon::now()))->render();
            $pdf = $renderer->render($html);
            $path = ReceiptPdf::path(Str::uuid()->toString().'.pdf');
            // Disques configurés sans exception (throw: false) : une écriture refusée renvoie false
            if (! $filesystems->disk()->put($path, $pdf)) {
                $file->fill(['status' => ReceiptFileStatus::Failed])->save();

                return;
            }
            $file->fill(['status' => ReceiptFileStatus::Ready, 'path' => $path, 'rendered_at' => Carbon::now()])->save();
        } catch (PdfRenderingFailed) {
            $file->fill(['status' => ReceiptFileStatus::Failed])->save();
        }
    }

    /**
     * Tâche en échec (exception inattendue, délai dépassé) : le reçu encore en attente est noté en échec pour pouvoir
     * être relancé. Appelé hors du middleware de la tâche : l'école est rétablie ici.
     */
    public function failed(?Throwable $exception): void
    {
        app(TenantContext::class)->run($this->schoolId, function (): void {
            ReceiptFile::query()
                ->whereKey($this->receiptFileId)
                ->where('status', ReceiptFileStatus::Pending)
                ->update(['status' => ReceiptFileStatus::Failed, 'updated_at' => Carbon::now()]);
        });
    }
}
