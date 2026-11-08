<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Data\ReceiptPdfView;
use App\Domains\Billing\Enums\ReceiptFileStatus;
use App\Domains\Billing\Models\Payment;
use App\Domains\Billing\Support\ReceiptPdf;
use App\Domains\Billing\Support\ReceiptRendering;

/**
 * Reçu PDF d'un paiement dans sa version actuelle (« ANNULÉ » après une annulation). Demandé s'il manque (paiement
 * antérieur aux reçus PDF) ; un rendu en échec n'est relancé que par `$retry`.
 */
final readonly class ShowReceiptPdf
{
    public function __construct(private ReceiptPdf $pdf) {}

    public function handle(Payment $payment, bool $retry = false): ReceiptPdfView
    {
        $file = ReceiptRendering::request($payment, $retry);

        return new ReceiptPdfView(
            $file->status,
            $file->cancelled,
            $file->status === ReceiptFileStatus::Ready ? $this->pdf->url($file->path) : null,
        );
    }
}
