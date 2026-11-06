<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Controllers;

use App\Domains\Family\Actions\ListGuardianChildren;
use App\Domains\Family\Actions\ShowGuardianChild;
use App\Domains\Family\Http\Requests\GuardianChildRequest;
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

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
