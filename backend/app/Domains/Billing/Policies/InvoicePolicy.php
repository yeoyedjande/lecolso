<?php

declare(strict_types=1);

namespace App\Domains\Billing\Policies;

use App\Domains\Billing\Models\Invoice;
use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Support\StudentAccess;
use App\Support\Tenancy\TenantContext;

/**
 * Factures. Voir : billing.view dans le périmètre de l'élève (StudentAccess : cycle, enfants du parent).
 * Modifier (services, lignes) et encaisser : billing.manage sur le cycle de la classe ; remise : billing.discount ;
 * annuler un paiement : billing.cancel ; rembourser ou reporter un trop-perçu : billing.refund (même cycle).
 */
final readonly class InvoicePolicy
{
    public function __construct(
        private Authorizer $authorizer,
        private StudentAccess $access,
        private TenantContext $context,
    ) {}

    public function view(User $user, Invoice $invoice): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null && $this->access->allows($user, $invoice->student, $schoolId, 'billing.view');
    }

    public function manage(User $user, Invoice $invoice): bool
    {
        return $this->allowsOnCycle($user, 'billing.manage', $invoice);
    }

    public function discount(User $user, Invoice $invoice): bool
    {
        return $this->allowsOnCycle($user, 'billing.discount', $invoice);
    }

    public function collect(User $user, Invoice $invoice): bool
    {
        return $this->allowsOnCycle($user, 'billing.manage', $invoice);
    }

    public function cancel(User $user, Invoice $invoice): bool
    {
        return $this->allowsOnCycle($user, 'billing.cancel', $invoice);
    }

    public function refund(User $user, Invoice $invoice): bool
    {
        return $this->allowsOnCycle($user, 'billing.refund', $invoice);
    }

    private function allowsOnCycle(User $user, string $permission, Invoice $invoice): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null
            && $this->authorizer->allows($user, $permission, $schoolId, $invoice->enrollment->classroom->level->cycle_id);
    }
}
