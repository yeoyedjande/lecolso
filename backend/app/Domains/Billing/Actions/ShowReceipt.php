<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Data\ReceiptView;
use App\Domains\Billing\Models\Payment;
use App\Domains\Billing\Support\InvoiceBalance;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Support\SchoolLogo;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Carbon;
use LogicException;

/** Reçu imprimable d'un paiement (même annulé : il porte alors la mention et le motif). */
final readonly class ShowReceipt
{
    public function __construct(
        private TenantContext $context,
        private SchoolLogo $logo,
    ) {}

    public function handle(User $user, Payment $payment): ReceiptView
    {
        $school = $this->context->school() ?? throw new LogicException('Aucune école courante.');
        $payment->load(['cancellation', 'invoice.studentRecord', 'invoice.academicYear', 'invoice.enrollment.classroom.level']);

        return new ReceiptView(
            $payment,
            $school,
            $this->logo->url($school->logo_path),
            InvoiceBalance::of($payment->invoice, Carbon::now())->remaining,
            $payment->cancellation === null && $user->can('cancel', $payment->invoice),
        );
    }
}
