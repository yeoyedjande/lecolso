<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Billing\Enums\ReceiptFileStatus;
use App\Domains\Billing\Jobs\RenderReceipt;
use App\Domains\Billing\Models\Payment;
use App\Domains\Billing\Models\ReceiptFile;
use Illuminate\Support\Carbon;

/**
 * Demande du reçu PDF d'un paiement, dans sa version actuelle (« ANNULÉ » si le paiement est annulé) : fiche créée
 * en attente et rendu mis en file. Un rendu déjà prêt ou en cours n'est pas relancé ; un rendu en échec ne l'est
 * que sur demande (`$retry`). Un rendu resté en attente au-delà de STALE_MINUTES (tâche perdue avec son worker)
 * est remis en file à la lecture suivante.
 */
final class ReceiptRendering
{
    public const int STALE_MINUTES = 5;

    public static function request(Payment $payment, bool $retry = false): ReceiptFile
    {
        $cancelled = $payment->cancellation()->exists();
        $file = ReceiptFile::query()->firstOrCreate(
            ['payment_id' => $payment->id, 'cancelled' => $cancelled],
            ['status' => ReceiptFileStatus::Pending],
        );

        if ($file->wasRecentlyCreated) {
            RenderReceipt::dispatch($payment->school_id, $file->id);
        } elseif (($retry && $file->status === ReceiptFileStatus::Failed) || self::isStale($file)) {
            $file->fill(['status' => ReceiptFileStatus::Pending])->touch();
            RenderReceipt::dispatch($payment->school_id, $file->id);
        }

        return $file->refresh();
    }

    private static function isStale(ReceiptFile $file): bool
    {
        return $file->status === ReceiptFileStatus::Pending
            && $file->updated_at->lt(Carbon::now()->subMinutes(self::STALE_MINUTES));
    }
}
