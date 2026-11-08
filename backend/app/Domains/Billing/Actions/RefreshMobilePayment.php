<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Contracts\PaymentGateway;
use App\Domains\Billing\Data\GatewayResult;
use App\Domains\Billing\Enums\PaymentIntentStatus;
use App\Domains\Billing\Exceptions\PaymentGatewayUnavailable;
use App\Domains\Billing\Models\PaymentIntent;
use Illuminate\Support\Carbon;

/**
 * Réconciliation (le webhook a pu se perdre) : une demande en attente, ou expirée localement, est vérifiée auprès du
 * prestataire et sa réponse appliquée ; toujours en attente après le délai, la demande expire. Un paiement confirmé
 * après l'expiration est donc enregistré à la lecture suivante.
 */
final readonly class RefreshMobilePayment
{
    public function __construct(
        private PaymentGateway $gateway,
        private SettleMobilePayment $settle,
    ) {}

    public function handle(PaymentIntent $intent, Carbon $now): PaymentIntent
    {
        if ($intent->status !== PaymentIntentStatus::Pending && $intent->status !== PaymentIntentStatus::Expired) {
            return $intent;
        }
        if ($intent->provider_reference !== null && $intent->provider === $this->gateway->name()) {
            try {
                $intent = $this->settle->handle($intent, $this->gateway->status($intent->provider_reference), $now);
            } catch (PaymentGatewayUnavailable) {
                // Prestataire injoignable : on réessaiera à la prochaine lecture
            }
        }
        if ($intent->status === PaymentIntentStatus::Pending && $intent->expires_at->lessThan($now)) {
            return $this->settle->handle($intent, new GatewayResult($intent->provider_reference ?? '', PaymentIntentStatus::Expired, null, 'Paiement non validé à temps.'), $now);
        }

        return $intent;
    }
}
