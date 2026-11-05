<?php

declare(strict_types=1);

namespace App\Domains\Billing\Listeners;

use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Support\PayerDirectory;
use App\Domains\Students\Events\StudentPayerChanged;

/**
 * Le payeur d'un élève a changé (autre tuteur désigné, nom modifié) : ses factures sont adressées au nouveau payeur.
 * Synchrone : dans la requête qui modifie le tuteur, sans aucun appel extérieur.
 */
final readonly class UpdateInvoicePayer
{
    public function __construct(private PayerDirectory $payers) {}

    public function handle(StudentPayerChanged $event): void
    {
        $payer = $this->payers->forStudent($event->studentId);

        Invoice::query()->where('student_id', $event->studentId)->update(['payer_id' => $payer?->id]);
    }
}
