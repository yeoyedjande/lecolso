<?php

declare(strict_types=1);

namespace App\Domains\Billing\Listeners;

use App\Domains\Billing\Enums\NotificationStatus;
use App\Domains\Billing\Events\PaymentCancelled;
use App\Domains\Billing\Events\PaymentReceived;
use App\Domains\Billing\Jobs\SendPaymentConfirmationSms;
use App\Domains\Billing\Models\Payment;
use App\Domains\Billing\Models\PaymentNotification;
use App\Domains\Billing\Support\ReceiptRendering;
use App\Domains\Messaging\Contracts\SmsSender;

/**
 * Après un encaissement (guichet ou Mobile Money) : reçu PDF et SMS de confirmation au payeur, en file. Après une
 * annulation : reçu PDF marqué « ANNULÉ ». Une seule confirmation par paiement (clé unique), même si l'événement
 * est rejoué. Écouteur synchrone, dans l'école courante (requête ou webhook dans `TenantContext::run`).
 */
final readonly class PrepareReceipt
{
    public function __construct(private SmsSender $sms) {}

    public function received(PaymentReceived $event): void
    {
        $payment = Payment::query()->find($event->paymentId);
        if ($payment === null) {
            return;
        }
        ReceiptRendering::request($payment);

        // Sans fournisseur SMS : confirmation notée non envoyée, sans tâche en file
        $available = $this->sms->available();
        $notification = PaymentNotification::query()->firstOrCreate(
            ['payment_id' => $payment->id, 'channel' => 'sms'],
            $available
                ? ['status' => NotificationStatus::Queued]
                : ['status' => NotificationStatus::Failed, 'failure' => 'Aucun fournisseur SMS n’est configuré.'],
        );
        if ($available && $notification->wasRecentlyCreated) {
            SendPaymentConfirmationSms::dispatch($payment->school_id, $notification->id);
        }
    }

    public function cancelled(PaymentCancelled $event): void
    {
        $payment = Payment::query()->find($event->paymentId);
        if ($payment !== null) {
            ReceiptRendering::request($payment);
        }
    }
}
