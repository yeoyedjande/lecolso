<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Controllers;

use App\Domains\Billing\Http\Resources\PaymentIntentResource;
use App\Domains\Billing\Models\PaymentIntent;
use App\Domains\Family\Actions\ListGuardianChildren;
use App\Domains\Family\Actions\PayForChild;
use App\Domains\Family\Actions\PlanChildAbsence;
use App\Domains\Family\Actions\ShowGuardianChild;
use App\Domains\Family\Http\Requests\GuardianChildRequest;
use App\Domains\Family\Http\Requests\PayForChildRequest;
use App\Domains\Family\Http\Requests\PlanChildAbsenceRequest;
use App\Domains\Family\Http\Resources\ChildPlannedAbsenceResource;
use App\Domains\Family\Http\Resources\ChildResource;
use App\Domains\Family\Http\Resources\ChildSummaryResource;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

/** Espace parent : ses enfants seulement (rôle Parent, rapprochement par le téléphone du compte). */
final class GuardianController
{
    /**
     * Mes enfants.
     *
     * Enfants dont un tuteur a le téléphone du compte (rôle Parent dans l'école) : classe, présence du jour, reste à
     * payer et retard, absences à justifier. Sans rôle Parent : liste vide.
     */
    public function index(Request $request, ListGuardianChildren $list): AnonymousResourceCollection
    {
        return ChildSummaryResource::collection($list->handle($this->user($request), Carbon::now()));
    }

    /**
     * Fiche d'un enfant.
     *
     * Notes de la période au fil de l'eau (évaluations, moyenne de chaque matière), compétences, bulletins validés
     * (PDF), absences et retards de l'année, facture et paiements. Enfant d'un autre parent ou d'une autre école : 404.
     */
    public function show(GuardianChildRequest $request, Student $student, ShowGuardianChild $show): ChildResource
    {
        return new ChildResource($show->handle($this->user($request), $student->id, $request->termId(), Carbon::now()));
    }

    /**
     * Prévenir d'une absence à venir.
     *
     * Du … au … (aujourd'hui ou plus tard, 30 jours au plus), motif : l'administration reçoit un message et décide
     * comme pour une justification ; l'appel de ces jours marque l'enfant absent avec cette justification.
     * 409 `overlap`, `not_enrolled`. Enfant d'un autre parent : 404.
     */
    public function planAbsence(PlanChildAbsenceRequest $request, Student $student, PlanChildAbsence $plan): ChildPlannedAbsenceResource
    {
        $message = trim($request->string('message')->toString());

        return new ChildPlannedAbsenceResource($plan->handle(
            $this->user($request),
            $student->id,
            $request->string('starts_on')->toString(),
            $request->string('ends_on')->toString(),
            trim($request->string('reason')->toString()),
            $message === '' ? null : $message,
            Carbon::now(),
        ));
    }

    /**
     * Payer par Mobile Money.
     *
     * Montant libre plafonné au reste dû, frais selon l'école ; le parent valide sur son téléphone, puis suit l'état
     * (`GET guardian/payment-intents/{id}`). 409 `no_invoice`, `nothing_due`, `amount_exceeds`, `payment_pending`,
     * `gateway_unavailable`. Enfant d'un autre parent : 404.
     */
    public function pay(PayForChildRequest $request, Student $student, PayForChild $pay): PaymentIntentResource
    {
        return new PaymentIntentResource($pay->handle(
            $this->user($request),
            $student->id,
            $request->integer('amount'),
            $request->paymentMethod(),
            $request->phone(),
            Carbon::now(),
        ));
    }

    /**
     * Suivre un paiement Mobile Money.
     *
     * Tant qu'il est en attente, l'état est relu chez le prestataire ; sans réponse après 30 minutes, il expire.
     */
    public function payment(Request $request, PaymentIntent $paymentIntent, PayForChild $pay): PaymentIntentResource
    {
        return new PaymentIntentResource($pay->show($this->user($request), $paymentIntent, Carbon::now()));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
