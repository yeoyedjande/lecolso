<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Billing\Enums\ReceiptFileStatus;
use App\Domains\Billing\Jobs\RenderReceipt;
use App\Domains\Billing\Models\Payment;
use App\Domains\Billing\Models\ReceiptFile;

/**
 * Demande du reçu PDF d'un paiement, dans sa version actuelle (« ANNULÉ » si le paiement est annulé) : fiche créée
 * en attente et rendu mis en file. Un rendu déjà prêt ou en cours n'est pas relancé ; un rendu en échec ne l'est
 * que sur demande (`$retry`).
 */
final class ReceiptRendering
{
    public static function request(Payment $payment, bool $retry = false): ReceiptFile
    {
        $cancelled = $payment->cancellation()->exists();
        $file = ReceiptFile::query()->firstOrCreate(
            ['payment_id' => $payment->id, 'cancelled' => $cancelled],
            ['status' => ReceiptFileStatus::Pending],
        );

        if ($file->wasRecentlyCreated) {
            RenderReceipt::dispatch($payment->school_id, $file->id);
        } elseif ($retry && $file->status === ReceiptFileStatus::Failed) {
            $file->fill(['status' => ReceiptFileStatus::Pending])->save();
            RenderReceipt::dispatch($payment->school_id, $file->id);
        }

        return $file->refresh();
    }
}
