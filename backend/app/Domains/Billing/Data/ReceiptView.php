<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

use App\Domains\Billing\Models\Payment;
use App\Domains\Tenancy\Models\School;

/** Reçu d'un paiement : paiement, facture (élève, classe, année), école émettrice, reste à payer à ce jour, droits. */
final readonly class ReceiptView
{
    public function __construct(
        public Payment $payment,
        public School $school,
        public ?string $logoUrl,
        public int $remaining,
        public bool $canCancel,
    ) {}
}
