<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

use App\Domains\Billing\Models\CashSession;
use Illuminate\Support\Collection;

/** Caisses d'un jour visibles par l'utilisateur (la sienne ; toutes avec billing.manage sur toute l'école). */
final readonly class CashDeskView
{
    /**
     * @param  Collection<int, CashSession>  $sessions
     */
    public function __construct(
        public string $date,
        public Collection $sessions,
        public string $userId,
        public bool $allCashiers,
    ) {}
}
