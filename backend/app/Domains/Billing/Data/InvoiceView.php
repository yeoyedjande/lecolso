<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

use App\Domains\Billing\Models\FeeType;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Support\InvoiceBalance;
use Illuminate\Support\Collection;

/**
 * Facture telle que l'utilisateur la voit : services qu'il peut encore y ajouter, situation (réglé, reste, crédit),
 * droits, et factures du même payeur vers lesquelles reporter un trop-perçu.
 */
final readonly class InvoiceView
{
    /**
     * @param  Collection<int, array{type: FeeType, amount: int}>  $availableOptions
     * @param  list<array{invoice: Invoice, remaining: int}>  $creditTargets
     */
    public function __construct(
        public Invoice $invoice,
        public Collection $availableOptions,
        public bool $canManage,
        public bool $canDiscount,
        public InvoiceBalance $balance,
        public bool $canCancel,
        public bool $canRefund,
        public array $creditTargets,
    ) {}
}
