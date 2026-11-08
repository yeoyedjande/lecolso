<?php

declare(strict_types=1);

namespace App\Domains\Billing\Gateways;

use App\Domains\Billing\Contracts\PaymentGateway;
use App\Domains\Billing\Data\GatewayRequest;
use App\Domains\Billing\Data\GatewayResult;
use App\Domains\Billing\Exceptions\InvalidWebhookSignature;
use App\Domains\Billing\Exceptions\PaymentGatewayUnavailable;

/** Production sans prestataire Mobile Money : refus explicite plutôt qu'un paiement factice. */
final class UnconfiguredPaymentGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'none';
    }

    public function initiate(GatewayRequest $request): GatewayResult
    {
        throw new PaymentGatewayUnavailable('Le paiement Mobile Money n’est pas encore disponible.');
    }

    public function parseWebhook(string $payload, array $headers): GatewayResult
    {
        throw new InvalidWebhookSignature('Aucun prestataire configuré.');
    }

    public function status(string $reference): GatewayResult
    {
        throw new PaymentGatewayUnavailable('Le paiement Mobile Money n’est pas encore disponible.');
    }
}
