<?php

declare(strict_types=1);

namespace App\Domains\Billing\Jobs;

use App\Domains\Billing\Enums\NotificationStatus;
use App\Domains\Billing\Models\Payment;
use App\Domains\Billing\Models\PaymentNotification;
use App\Domains\Billing\Support\ReceiptDocument;
use App\Domains\Messaging\Contracts\SmsSender;
use App\Domains\Messaging\Sms\UnconfiguredSmsSender;
use App\Support\Tenancy\RunsInSchool;
use App\Support\Tenancy\TenantAware;
use App\Support\Tenancy\TenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Carbon;
use Throwable;

/**
 * SMS de confirmation d'un paiement au payeur (tuteur payeur de la facture), dans l'école du paiement. Le texte
 * (école, montant, numéro de reçu, aucune donnée sur l'enfant) est composé ici et n'est ni stocké ni journalisé.
 * Sans numéro : `skipped`. Un échec (fournisseur non configuré, refus) est noté, sans nouvel essai automatique.
 */
final class SendPaymentConfirmationSms implements ShouldQueue, TenantAware
{
    use Dispatchable, InteractsWithQueue, Queueable, RunsInSchool;

    public int $tries = 1;

    public function __construct(
        public string $schoolId,
        public string $notificationId,
    ) {}

    public function handle(SmsSender $sms, TenantContext $context): void
    {
        $notification = PaymentNotification::query()->find($this->notificationId);
        if ($notification === null || $notification->status !== NotificationStatus::Queued) {
            return;
        }
        $payment = Payment::query()->with('invoice.payer.guardian')->find($notification->payment_id);
        $phone = $payment?->invoice->payer?->guardian?->phone;
        if ($payment === null || $phone === null || $phone === '') {
            $notification->fill(['status' => NotificationStatus::Skipped])->save();

            return;
        }

        try {
            $sms->send($phone, self::message($context->school()->name ?? '', $payment));
            $notification->fill(['status' => NotificationStatus::Sent, 'sent_at' => Carbon::now()])->save();
        } catch (Throwable) {
            $notification->fill([
                'status' => NotificationStatus::Failed,
                'failure' => $sms instanceof UnconfiguredSmsSender ? 'Aucun fournisseur SMS n’est configuré.' : 'Envoi refusé par le fournisseur SMS.',
            ])->save();
        }
    }

    /** « Les Lauriers : paiement de 50 000 FCFA reçu le 01/10/2026 (reçu REC-2026-000001). Merci. » */
    public static function message(string $school, Payment $payment): string
    {
        return sprintf(
            '%s : paiement de %s reçu le %s (reçu %s). Merci.',
            $school,
            ReceiptDocument::money($payment->amount),
            $payment->paid_at->copy()->setTimezone('Africa/Abidjan')->format('d/m/Y'),
            $payment->receipt_number,
        );
    }
}
