<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

use App\Domains\Billing\Enums\PaymentMethod;

/** Demande envoyée au prestataire : montant débité, opérateur, numéro (E.164), identifiant de la demande chez nous. */
final readonly class GatewayRequest
{
    public function __construct(
        public string $intentId,
        public int $charged,
        public PaymentMethod $method,
        public string $phone,
        public string $description,
    ) {}
}
