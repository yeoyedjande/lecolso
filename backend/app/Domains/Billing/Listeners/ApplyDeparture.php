<?php

declare(strict_types=1);

namespace App\Domains\Billing\Listeners;

use App\Domains\Billing\Enums\DeparturePolicy;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Support\DepartureAdjustment;
use App\Domains\Billing\Support\FinancialPolicy;
use App\Domains\Students\Events\StudentLeft;
use App\Domains\Students\Events\StudentReturned;
use App\Support\Tenancy\TenantContext;

/**
 * Départ d'un élève (décision du 05/11/2026, politique par défaut de l'école) : les échéances des périodes déjà
 * commencées à la date effective du départ restent dues ; celles des périodes non commencées (échéance après le
 * départ) sont annulées par une ligne « Départ » négative, motivée et journalisée. Les paiements ne changent pas :
 * un éventuel trop-perçu apparaît comme crédit, à rembourser ou reporter après validation de la direction.
 * Retour de l'élève : la ligne est retirée. Synchrone, dans la transaction qui modifie l'inscription.
 */
final readonly class ApplyDeparture
{
    public function __construct(
        private TenantContext $context,
        private DepartureAdjustment $adjustment,
    ) {}

    public function left(StudentLeft $event): void
    {
        $invoice = Invoice::query()->where('enrollment_id', $event->enrollmentId)->lockForUpdate()->first();
        if ($invoice === null) {
            return;
        }

        $this->adjustment->clear($invoice);
        if (FinancialPolicy::departure($this->context->school()) === DeparturePolicy::CancelUnstarted) {
            $this->adjustment->apply($invoice);
        }
    }

    public function returned(StudentReturned $event): void
    {
        $invoice = Invoice::query()->where('enrollment_id', $event->enrollmentId)->lockForUpdate()->first();
        if ($invoice !== null) {
            $this->adjustment->clear($invoice);
        }
    }
}
