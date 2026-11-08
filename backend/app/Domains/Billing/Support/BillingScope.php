<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Identity\Authorization\StaffScope;
use App\Domains\Identity\Models\User;

/**
 * Cycles où l'utilisateur a une permission de facturation **au titre du personnel** : null = toute l'école, [] = aucun
 * (Identity\Authorization\StaffScope). Un parent ne voit que les factures de ses enfants (InvoicePolicy,
 * StudentAccess), jamais les montants des autres familles.
 */
final readonly class BillingScope
{
    public function __construct(private StaffScope $staff) {}

    /**
     * @return list<string>|null
     */
    public function cycles(User $user, string $permission): ?array
    {
        return $this->staff->cycles($user, $permission);
    }

    public function allows(User $user, string $permission, string $cycleId): bool
    {
        return $this->staff->allows($user, $permission, $cycleId);
    }
}
