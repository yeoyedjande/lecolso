<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Contracts\PaymentGateway;
use App\Domains\Billing\Data\GatewayRequest;
use App\Domains\Billing\Enums\PaymentIntentStatus;
use App\Domains\Billing\Enums\PaymentMethod;
use App\Domains\Billing\Exceptions\PaymentGatewayUnavailable;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\PaymentIntent;
use App\Domains\Billing\Support\FinancialPolicy;
use App\Domains\Billing\Support\InvoiceBalance;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Le parent lance un paiement Mobile Money (décision du 06/11/2026) : montant libre plafonné au reste dû, frais selon
 * la politique de l'école, une seule demande en attente par facture. La demande est ouverte chez le prestataire (le
 * parent valide sur son téléphone) ; elle expire après 30 minutes sans réponse.
 */
final readonly class StartMobilePayment
{
    public const int EXPIRES_AFTER_MINUTES = 30;

    public function __construct(
        private PaymentGateway $gateway,
        private RefreshMobilePayment $refresh,
        private TenantContext $context,
    ) {}

    /**
     * @throws BusinessConflict nothing_due, amount_exceeds, payment_pending, gateway_unavailable
     */
    public function handle(User $guardian, Invoice $invoice, int $amount, PaymentMethod $method, string $phone, Carbon $now): PaymentIntent
    {
        // Demandes restées en attente : dernière interrogation du prestataire, puis expiration
        PaymentIntent::query()->where('invoice_id', $invoice->id)->where('status', PaymentIntentStatus::Pending)->get()
            ->each(fn (PaymentIntent $pending): PaymentIntent => $this->refresh->handle($pending, $now));

        $fees = FinancialPolicy::mobileMoney($this->context->school());
        $intent = DB::transaction(function () use ($guardian, $invoice, $amount, $method, $phone, $now, $fees): PaymentIntent {
            $locked = Invoice::query()->whereKey($invoice->id)->lockForUpdate()->firstOrFail();
            if (PaymentIntent::query()->where('invoice_id', $locked->id)->where('status', PaymentIntentStatus::Pending)->exists()) {
                throw new BusinessConflict('payment_pending', 'Un paiement est déjà en attente de validation sur un téléphone.');
            }
            $remaining = InvoiceBalance::of($locked, $now)->remaining;
            if ($remaining <= 0) {
                throw new BusinessConflict('nothing_due', 'Cette facture est entièrement réglée.');
            }
            if ($amount > $remaining) {
                throw new BusinessConflict('amount_exceeds', 'Le montant dépasse le reste à payer de la facture.');
            }

            return PaymentIntent::query()->create([
                'invoice_id' => $locked->id,
                'student_id' => $locked->student_id,
                'requested_by' => $guardian->id,
                'requested_by_name' => $guardian->name,
                'method' => $method,
                'phone' => $phone,
                'amount' => $amount,
                'fee' => $fees->feeFor($amount),
                'charged' => $fees->chargedFor($amount),
                'fee_payer' => $fees->payer,
                'provider' => $this->gateway->name(),
                'status' => PaymentIntentStatus::Pending,
                'expires_at' => $now->copy()->addMinutes(self::EXPIRES_AFTER_MINUTES),
            ]);
        });

        try {
            $opened = $this->gateway->initiate(new GatewayRequest($intent->id, $intent->charged, $method, $phone, 'Frais de scolarité'));
        } catch (PaymentGatewayUnavailable $unavailable) {
            $intent->fill(['status' => PaymentIntentStatus::Failed, 'failure_reason' => $unavailable->getMessage()])->save();
            throw new BusinessConflict('gateway_unavailable', $unavailable->getMessage());
        }
        $intent->fill(['provider_reference' => $opened->reference])->save();

        return $intent;
    }
}
