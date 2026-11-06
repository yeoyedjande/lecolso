<?php

declare(strict_types=1);

namespace App\Domains\Billing\Contracts;

use App\Domains\Billing\Data\GatewayRequest;
use App\Domains\Billing\Data\GatewayResult;
use App\Domains\Billing\Exceptions\InvalidWebhookSignature;
use App\Domains\Billing\Exceptions\PaymentGatewayUnavailable;

/**
 * Prestataire Mobile Money (agrégateur ou opérateur). Le parent valide le paiement sur son téléphone ; le prestataire
 * notifie le résultat par un webhook signé, et peut être interrogé (réconciliation, expiration).
 */
interface PaymentGateway
{
    /** Nom stable du prestataire (route du webhook, colonne `provider`). */
    public function name(): string;

    /**
     * Ouvre la demande chez le prestataire (en attente de validation par le parent).
     *
     * @throws PaymentGatewayUnavailable
     */
    public function initiate(GatewayRequest $request): GatewayResult;

    /**
     * Vérifie la signature d'une notification et la lit.
     *
     * @param  array<string, string>  $headers  en-têtes en minuscules
     *
     * @throws InvalidWebhookSignature
     */
    public function parseWebhook(string $payload, array $headers): GatewayResult;

    /**
     * État actuel d'une demande chez le prestataire.
     *
     * @throws PaymentGatewayUnavailable
     */
    public function status(string $reference): GatewayResult;
}
