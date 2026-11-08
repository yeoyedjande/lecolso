<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Controllers;

use App\Domains\Identity\Models\User;
use App\Domains\Students\Actions\ManageGuardians;
use App\Domains\Students\Actions\PresentStudent;
use App\Domains\Students\Http\Requests\RemoveGuardianRequest;
use App\Domains\Students\Http\Requests\StoreGuardianRequest;
use App\Domains\Students\Http\Requests\UpdateGuardianRequest;
use App\Domains\Students\Http\Resources\StudentResource;
use App\Domains\Students\Models\Student;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use LogicException;

/** Tuteurs du dossier d'un élève ; chaque réponse renvoie le dossier à jour. */
final class StudentGuardianController
{
    public function __construct(
        private CurrentSchool $currentSchool,
        private PresentStudent $present,
        private ManageGuardians $guardians,
    ) {}

    /**
     * Ajouter un tuteur.
     *
     * Téléphone d'un tuteur déjà connu de l'école : il est réutilisé (fratrie).
     */
    public function store(StoreGuardianRequest $request): StudentResource
    {
        $this->guardians->add($request->student(), $request->guardian());

        return $this->file($request, $request->student());
    }

    /**
     * Modifier un tuteur.
     *
     * Ses informations (partagées par la fratrie) et son lien avec cet élève.
     */
    public function update(UpdateGuardianRequest $request): StudentResource
    {
        $this->guardians->update($request->link(), $request->guardianChanges(), $request->linkChanges());

        return $this->file($request, $request->student());
    }

    /**
     * Retirer un tuteur.
     *
     * 409 `last_guardian` (dernier tuteur) ou `reassign_first` (payeur ou contact principal à remplacer d'abord).
     */
    public function destroy(RemoveGuardianRequest $request): StudentResource
    {
        $this->guardians->remove($request->link());

        return $this->file($request, $request->student());
    }

    private function file(Request $request, Student $student): StudentResource
    {
        $user = $request->user();

        return new StudentResource($this->present->handle(
            $user instanceof User ? $user : throw new AuthenticationException,
            $this->currentSchool->get() ?? throw new LogicException('Aucune école courante.'),
            $student->refresh(),
        ));
    }
}
