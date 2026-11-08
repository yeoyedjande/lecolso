<?php

declare(strict_types=1);

namespace App\Domains\Billing\Events;

use Illuminate\Foundation\Events\Dispatchable;

/** Un paiement a été annulé (identifiants seulement), après la validation de la transaction. */
final readonly class PaymentCancelled
{
    use Dispatchable;

    public function __construct(
        public string $schoolId,
        public string $paymentId,
    ) {}
}
