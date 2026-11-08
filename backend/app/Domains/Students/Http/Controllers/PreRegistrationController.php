<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Controllers;

use App\Domains\Identity\Models\User;
use App\Domains\Students\Actions\ListPreRegistrations;
use App\Domains\Students\Actions\RefusePreRegistration;
use App\Domains\Students\Http\Requests\ListPreRegistrationsRequest;
use App\Domains\Students\Http\Requests\PreRegistrationRequest;
use App\Domains\Students\Http\Requests\RefusePreRegistrationRequest;
use App\Domains\Students\Http\Resources\PreRegistrationResource;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

/** Pré-inscriptions reçues en ligne, traitées par le secrétariat. */
final class PreRegistrationController
{
    /**
     * Pré-inscriptions.
     *
     * Personnel avec `students.manage` : demandes des niveaux de ses cycles (200 au plus), les plus récentes d'abord.
     */
    public function index(ListPreRegistrationsRequest $request, ListPreRegistrations $list): AnonymousResourceCollection
    {
        return PreRegistrationResource::collection($list->handle($this->user($request), $request->status()));
    }

    /**
     * Une pré-inscription.
     *
     * Pour pré-remplir l'inscription : l'inscrire par `POST enrollments` avec `pre_registration_id`.
     */
    public function show(PreRegistrationRequest $request): PreRegistrationResource
    {
        return new PreRegistrationResource($request->preRegistration()->load('level.cycle'));
    }

    /**
     * Refuser une pré-inscription.
     *
     * Motif obligatoire, envoyé au parent par SMS. 409 `already_decided`.
     */
    public function refuse(RefusePreRegistrationRequest $request, RefusePreRegistration $refuse): PreRegistrationResource
    {
        return new PreRegistrationResource($refuse->handle(
            $this->user($request),
            $request->preRegistration(),
            trim($request->string('reason')->toString()),
            Carbon::now(),
        ));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
