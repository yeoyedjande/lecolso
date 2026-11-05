<?php

declare(strict_types=1);

namespace App\Domains\Billing\Events;

use Illuminate\Foundation\Events\Dispatchable;

/** Un paiement a été encaissé (identifiants seulement ; reçu par SMS au lot des relances). */
final readonly class PaymentReceived
{
    use Dispatchable;

    public function __construct(
        public string $schoolId,
        public string $paymentId,
    ) {}
}
