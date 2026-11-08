<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Controllers;

use App\Domains\Students\Actions\SubmitPreRegistration;
use App\Domains\Students\Http\Requests\SubmitPreRegistrationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class PublicPreRegistrationController
{
    /**
     * Envoyer une pré-inscription.
     *
     * Sans connexion, depuis la page publique de l'école. Renvoie seulement le numéro du dossier (`reference`) ; une
     * même demande renvoyée rend le même numéro. Limité par adresse et par téléphone (429). 404 : école inconnue ;
     * 422 : niveau inconnu, champ piège rempli ; 409 `too_many_pending`.
     *
     * @status 201
     */
    public function __invoke(string $slug, SubmitPreRegistrationRequest $request, SubmitPreRegistration $submit): JsonResponse
    {
        $preRegistration = $submit->handle($slug, $request->preRegistration(), Carbon::now()) ?? throw new NotFoundHttpException;

        return new JsonResponse(['data' => ['reference' => $preRegistration->reference]], 201);
    }
}
