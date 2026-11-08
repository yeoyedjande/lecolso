<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Controllers;

use App\Domains\Billing\Actions\ManageInvoiceLines;
use App\Domains\Billing\Actions\PresentInvoice;
use App\Domains\Billing\Http\Requests\AddDiscountRequest;
use App\Domains\Billing\Http\Requests\AddInvoiceLineRequest;
use App\Domains\Billing\Http\Requests\AddOptionRequest;
use App\Domains\Billing\Http\Requests\RemoveInvoiceLineRequest;
use App\Domains\Billing\Http\Requests\RemoveOptionRequest;
use App\Domains\Billing\Http\Requests\StudentInvoicesRequest;
use App\Domains\Billing\Http\Resources\InvoiceResource;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Identity\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

/** Factures d'un élève ; chaque modification renvoie la facture à jour. */
final class InvoiceController
{
    public function __construct(
        private PresentInvoice $present,
        private ManageInvoiceLines $lines,
    ) {}

    /**
     * Factures d'un élève.
     *
     * Une par année d'inscription, la plus récente d'abord. billing.view dans le périmètre de l'élève.
     */
    public function index(StudentInvoicesRequest $request): AnonymousResourceCollection
    {
        $user = $this->user($request);
        $invoices = Invoice::query()
            ->where('student_id', $request->student()->id)
            ->join('academic_years', 'academic_years.id', '=', 'invoices.academic_year_id')
            ->orderByDesc('academic_years.starts_on')
            ->select('invoices.*')
            ->get();

        return InvoiceResource::collection($invoices->map(fn (Invoice $invoice) => $this->present->handle($user, $invoice)));
    }

    /**
     * Ajouter un service optionnel.
     *
     * À partir d'aujourd'hui : périodes restantes seulement. 409 `option_present`, `no_amount`.
     */
    public function addOption(AddOptionRequest $request): InvoiceResource
    {
        return $this->respond($request, $this->lines->addOption($request->invoice(), $request->feeType(), Carbon::today()));
    }

    /**
     * Retirer un service optionnel.
     *
     * Les périodes déjà commencées restent dues.
     */
    public function removeOption(RemoveOptionRequest $request): InvoiceResource
    {
        return $this->respond($request, $this->lines->removeOption($request->invoice(), $request->feeType(), Carbon::today()));
    }

    /** Ajouter une ligne à la main. */
    public function addLine(AddInvoiceLineRequest $request): InvoiceResource
    {
        return $this->respond($request, $this->lines->addManual(
            $request->invoice(),
            $this->user($request),
            trim($request->string('label')->toString()),
            $request->integer('amount'),
            $request->dueOn(),
        ));
    }

    /**
     * Accorder une remise.
     *
     * Montant et motif ; répartie à partir de la dernière échéance. 409 `discount_exceeds`.
     */
    public function addDiscount(AddDiscountRequest $request): InvoiceResource
    {
        return $this->respond($request, $this->lines->addDiscount(
            $request->invoice(),
            $this->user($request),
            $request->integer('amount'),
            trim($request->string('reason')->toString()),
        ));
    }

    /** Retirer une ligne manuelle ou une remise. */
    public function removeLine(RemoveInvoiceLineRequest $request): InvoiceResource
    {
        return $this->respond($request, $this->lines->removeLine($request->invoice(), $request->line()));
    }

    private function respond(Request $request, Invoice $invoice): InvoiceResource
    {
        return new InvoiceResource($this->present->handle($this->user($request), $invoice->refresh()));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
