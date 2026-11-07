<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Controllers;

use App\Domains\Identity\Models\User;
use App\Domains\Students\Actions\ImportStudents;
use App\Domains\Students\Http\Requests\ImportStudentsRequest;
use App\Domains\Students\Http\Resources\ImportResultResource;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Carbon;
use LogicException;

final class StudentImportController
{
    /**
     * Importer des élèves (fichier Excel).
     *
     * Lignes lues par le navigateur, 500 au plus. `dry_run: true` : vérification seule (`ready` ou `error` par ligne,
     * places comptées sur tout le lot). `dry_run: false` : inscription des lignes valides, chacune comme une
     * inscription manuelle (matricule, facture) ; un élève déjà inscrit est ignoré (`skipped`). Envoyer de petits lots
     * (50 lignes) pour l'inscription.
     */
    public function __invoke(ImportStudentsRequest $request, ImportStudents $import, CurrentSchool $currentSchool): ImportResultResource
    {
        $user = $request->user();
        $school = $currentSchool->get() ?? throw new LogicException('Aucune école courante.');

        return new ImportResultResource($import->handle(
            $user instanceof User ? $user : throw new AuthenticationException,
            $school,
            $request->importRows(),
            $request->boolean('dry_run'),
            Carbon::now(),
        ));
    }
}
