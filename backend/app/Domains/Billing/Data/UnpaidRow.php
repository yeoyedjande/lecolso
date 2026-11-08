<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\PaymentReminder;

/** Facture en retard : montants (FCFA), plus ancienne échéance non réglée, dernière relance du payeur, droit de relancer. */
final readonly class UnpaidRow
{
    public function __construct(
        public Invoice $invoice,
        public int $overdue,
        public int $remaining,
        public string $oldestDueOn,
        public int $daysLate,
        public ?PaymentReminder $lastReminder,
        public bool $canRemind,
    ) {}
}
