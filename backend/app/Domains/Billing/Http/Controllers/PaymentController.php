<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Controllers;

use App\Domains\Billing\Actions\CancelPayment;
use App\Domains\Billing\Actions\PresentInvoice;
use App\Domains\Billing\Actions\RecordPayment;
use App\Domains\Billing\Actions\RefundCredit;
use App\Domains\Billing\Actions\ShowReceipt;
use App\Domains\Billing\Actions\TransferCredit;
use App\Domains\Billing\Http\Requests\CancelPaymentRequest;
use App\Domains\Billing\Http\Requests\RecordPaymentRequest;
use App\Domains\Billing\Http\Requests\RefundRequest;
use App\Domains\Billing\Http\Requests\ShowReceiptRequest;
use App\Domains\Billing\Http\Requests\TransferCreditRequest;
use App\Domains\Billing\Http\Resources\InvoiceResource;
use App\Domains\Billing\Http\Resources\ReceiptResource;
use App\Domains\Identity\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/** Encaissements, reçus, annulations et trop-perçus. */
final class PaymentController
{
    public function __construct(
        private ShowReceipt $receipt,
        private PresentInvoice $present,
    ) {}

    /**
     * Encaisser un paiement.
     *
     * Dans la caisse du jour de l'utilisateur ; renvoie le reçu (numéro REC-2026-000123). 409 `nothing_due`,
     * `amount_exceeds` (au-delà du reste à payer), `cash_closed` (caisse du jour clôturée), `reference_used`.
     *
     * @status 201
     */
    public function store(RecordPaymentRequest $request, RecordPayment $record): JsonResponse
    {
        $user = $this->user($request);
        $payment = $record->handle($user, $request->invoice(), $request->integer('amount'), $request->paymentMethod(), $request->reference(), Carbon::now());

        return (new ReceiptResource($this->receipt->handle($user, $payment)))->response()->setStatusCode(201);
    }

    /**
     * Reçu d'un paiement.
     *
     * Qui voit la facture de l'élève ; un paiement annulé porte la mention et le motif.
     */
    public function show(ShowReceiptRequest $request): ReceiptResource
    {
        return new ReceiptResource($this->receipt->handle($this->user($request), $request->payment()));
    }

    /**
     * Annuler un paiement.
     *
     * Direction (`billing.cancel`), motif obligatoire ; le reçu reste, marqué annulé. 409 `already_cancelled`,
     * `cash_closed`.
     */
    public function cancel(CancelPaymentRequest $request, CancelPayment $cancel): ReceiptResource
    {
        $user = $this->user($request);
        $payment = $cancel->handle($user, $request->payment(), trim($request->string('reason')->toString()), Carbon::now());

        return new ReceiptResource($this->receipt->handle($user, $payment));
    }

    /**
     * Rembourser un trop-perçu.
     *
     * Direction (`billing.refund`), motif obligatoire, sorti de sa caisse du jour. 409 `no_credit`,
     * `amount_exceeds_credit`, `cash_closed`. Renvoie la facture.
     */
    public function refund(RefundRequest $request, RefundCredit $refund): InvoiceResource
    {
        $user = $this->user($request);
        $invoice = $request->invoice();
        $refund->handle($user, $invoice, $request->integer('amount'), $request->paymentMethod(), $request->reference(), trim($request->string('reason')->toString()), Carbon::now());

        return new InvoiceResource($this->present->handle($user, $invoice->refresh()));
    }

    /**
     * Reporter un trop-perçu.
     *
     * Vers une autre facture du même payeur (`to_invoice_id`). Direction (`billing.refund`), motif obligatoire.
     * 409 `other_payer`, `no_credit`, `amount_exceeds_credit`, `target_not_due`. Renvoie la facture d'origine.
     */
    public function transfer(TransferCreditRequest $request, TransferCredit $transfer): InvoiceResource
    {
        $user = $this->user($request);
        $invoice = $request->invoice();
        $transfer->handle($user, $invoice, $request->target(), $request->integer('amount'), trim($request->string('reason')->toString()), Carbon::now());

        return new InvoiceResource($this->present->handle($user, $invoice->refresh()));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
