<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

use App\Domains\Billing\Models\FeeType;
use App\Domains\Billing\Models\Invoice;
use Illuminate\Support\Collection;

/** Facture telle que l'utilisateur la voit, avec les services qu'il peut encore y ajouter. */
final readonly class InvoiceView
{
    /**
     * @param  Collection<int, array{type: FeeType, amount: int}>  $availableOptions
     */
    public function __construct(
        public Invoice $invoice,
        public Collection $availableOptions,
        public bool $canManage,
        public bool $canDiscount,
    ) {}
}
