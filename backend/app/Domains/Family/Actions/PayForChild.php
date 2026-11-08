<?php

declare(strict_types=1);

namespace App\Domains\Family\Actions;

use App\Domains\Billing\Actions\RefreshMobilePayment;
use App\Domains\Billing\Actions\StartMobilePayment;
use App\Domains\Billing\Enums\PaymentMethod;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\PaymentIntent;
use App\Domains\Family\Support\GuardianChildren;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Paiement Mobile Money par le parent (lot 10a) : la facture de l'inscription de son enfant, puis la demande au
 * prestataire (domaine Billing). Suivi : l'état est relu chez le prestataire tant qu'il est en attente.
 */
final readonly class PayForChild
{
    public function __construct(
        private GuardianChildren $children,
        private StartMobilePayment $start,
        private RefreshMobilePayment $refresh,
    ) {}

    /**
     * @throws BusinessConflict no_invoice, nothing_due, amount_exceeds, payment_pending, gateway_unavailable
     */
    public function handle(User $user, string $studentId, int $amount, PaymentMethod $method, string $phone, Carbon $now): PaymentIntent
    {
        $student = $this->children->query($user)->whereKey($studentId)->first() ?? throw new NotFoundHttpException;
        $enrollment = GuardianChildren::enrollment($student);
        $invoice = $enrollment === null ? null : Invoice::query()->where('enrollment_id', $enrollment->id)->first();
        if ($invoice === null) {
            throw new BusinessConflict('no_invoice', 'Aucune facture pour cette année.');
        }

        return $this->start->handle($user, $invoice, $amount, $method, $phone, $now)->load('payment');
    }

    /** Suivi d'un paiement d'un de ses enfants (autre famille : 404). */
    public function show(User $user, PaymentIntent $intent, Carbon $now): PaymentIntent
    {
        if (! $this->children->query($user)->whereKey($intent->student_id)->exists()) {
            throw new NotFoundHttpException;
        }

        return $this->refresh->handle($intent, $now)->load('payment');
    }
}
