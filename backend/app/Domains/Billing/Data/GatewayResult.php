<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

use App\Domains\Billing\Enums\PaymentIntentStatus;

/**
 * Réponse du prestataire (ouverture, notification ou interrogation) : sa référence, l'état, la référence de l'opérateur
 * une fois payé, le motif d'un échec.
 */
final readonly class GatewayResult
{
    public function __construct(
        public string $reference,
        public PaymentIntentStatus $status,
        public ?string $operatorReference = null,
        public ?string $failureReason = null,
    ) {}
}
