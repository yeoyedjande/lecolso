<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Controllers;

use App\Domains\Billing\Actions\GenerateInvoices;
use App\Domains\Billing\Actions\ListSchedules;
use App\Domains\Billing\Actions\SaveCalendar;
use App\Domains\Billing\Actions\SaveFeeGrid;
use App\Domains\Billing\Actions\ShowBillingGrid;
use App\Domains\Billing\Http\Requests\GenerateInvoicesRequest;
use App\Domains\Billing\Http\Requests\SaveCalendarRequest;
use App\Domains\Billing\Http\Requests\SaveFeeGridRequest;
use App\Domains\Billing\Http\Requests\ShowBillingGridRequest;
use App\Domains\Billing\Http\Resources\BillingGridResource;
use App\Domains\Billing\Http\Resources\ScheduleRowResource;
use App\Domains\Identity\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class BillingGridController
{
    public function __construct(private ShowBillingGrid $show) {}

    /**
     * Grille de frais d'une année.
     *
     * Montants annuels par niveau et type de frais, calendrier des échéances de chaque cycle (créé d'après sa
     * périodicité de facturation), nombre d'inscriptions encore sans facture. Cycles du périmètre billing.view.
     */
    public function show(ShowBillingGridRequest $request): BillingGridResource
    {
        return new BillingGridResource($this->show->handle($this->user($request), $request->year()));
    }

    /**
     * Modifier la grille de frais.
     *
     * Montants fournis seulement (0 = aucun frais). S'applique aux nouvelles inscriptions ; les factures déjà émises
     * ne changent pas.
     */
    public function update(SaveFeeGridRequest $request, SaveFeeGrid $save): BillingGridResource
    {
        $save->handle($request->year(), $request->amounts());

        return new BillingGridResource($this->show->handle($this->user($request), $request->year()));
    }

    /**
     * Modifier le calendrier des échéances d'un cycle.
     *
     * Autant de dates que la périodicité du cycle en prévoit, croissantes, dans l'année scolaire.
     */
    public function updateCalendar(SaveCalendarRequest $request, SaveCalendar $save): BillingGridResource
    {
        $save->handle($request->year(), $request->cycle(), $request->dates());

        return new BillingGridResource($this->show->handle($this->user($request), $request->year()));
    }

    /**
     * Facturer les élèves déjà inscrits.
     *
     * Inscriptions actives de l'année sans facture, dans les cycles gérés ; sans service optionnel. `{ created }`.
     */
    public function generate(GenerateInvoicesRequest $request, GenerateInvoices $generate): JsonResponse
    {
        return new JsonResponse(['created' => $generate->handle($request->year(), $request->cycles())]);
    }

    /**
     * Échéancier de l'année.
     *
     * Montant attendu et nombre de factures par date d'échéance (cycles du périmètre billing.view).
     */
    public function schedules(ShowBillingGridRequest $request, ListSchedules $list): AnonymousResourceCollection
    {
        return ScheduleRowResource::collection($list->handle($this->user($request), $request->year()));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
