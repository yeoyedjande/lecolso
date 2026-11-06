<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Data\GatewayResult;
use App\Domains\Billing\Enums\PaymentIntentStatus;
use App\Domains\Billing\Models\PaymentIntent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Applique la réponse du prestataire à une demande (webhook ou interrogation) : réussie → paiement enregistré (reçu
 * REC-…), échouée → motif noté. Une demande réussie n'est jamais modifiée (notification rejouée sans effet). Une
 * confirmation de paiement l'emporte sur une expiration ou un échec notés localement : l'argent a été débité, il est
 * enregistré (la référence de l'opérateur empêche un second enregistrement).
 */
final readonly class SettleMobilePayment
{
    public function __construct(private RecordPayment $record) {}

    public function handle(PaymentIntent $intent, GatewayResult $result, Carbon $now): PaymentIntent
    {
        return DB::transaction(function () use ($intent, $result, $now): PaymentIntent {
            $locked = PaymentIntent::query()->whereKey($intent->id)->lockForUpdate()->firstOrFail();
            $confirmed = $result->status === PaymentIntentStatus::Succeeded;
            if ($locked->status === PaymentIntentStatus::Succeeded || $result->status === PaymentIntentStatus::Pending) {
                return $locked;
            }
            if ($locked->status !== PaymentIntentStatus::Pending && ! $confirmed) {
                return $locked;
            }
            if ($confirmed) {
                $payment = $this->record->online(
                    $locked->invoice,
                    $locked->amount,
                    $locked->method,
                    $result->operatorReference ?? $result->reference,
                    $locked->requested_by,
                    $locked->requested_by_name,
                    $now,
                );
                $locked->fill(['status' => PaymentIntentStatus::Succeeded, 'payment_id' => $payment->id, 'failure_reason' => null])->save();

                return $locked;
            }
            $locked->fill([
                'status' => $result->status,
                'failure_reason' => $result->failureReason ?? 'Paiement non abouti.',
            ])->save();

            return $locked;
        });
    }
}
