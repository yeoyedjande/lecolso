<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

/** Montant attendu à une date d'échéance, toutes factures confondues (FCFA). */
final readonly class ScheduleRow
{
    public function __construct(
        public string $dueOn,
        public string $label,
        public int $expected,
        public int $invoices,
    ) {}
}
