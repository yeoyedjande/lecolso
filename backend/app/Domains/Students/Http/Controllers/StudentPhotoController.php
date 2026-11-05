<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Controllers;

use App\Domains\Identity\Models\User;
use App\Domains\Students\Actions\ManagePhotos;
use App\Domains\Students\Actions\PresentStudent;
use App\Domains\Students\Http\Requests\GuardianPhotoRequest;
use App\Domains\Students\Http\Requests\ManageStudentRequest;
use App\Domains\Students\Http\Requests\UploadGuardianPhotoRequest;
use App\Domains\Students\Http\Requests\UploadStudentPhotoRequest;
use App\Domains\Students\Http\Resources\StudentResource;
use App\Domains\Students\Models\Student;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use LogicException;

/** Photos de l'élève et de ses tuteurs ; chaque réponse renvoie le dossier à jour (URL signées de 10 minutes). */
final class StudentPhotoController
{
    public function __construct(
        private CurrentSchool $currentSchool,
        private PresentStudent $present,
        private ManagePhotos $photos,
    ) {}

    /**
     * Ajouter ou remplacer la photo de l'élève.
     *
     * JPEG, PNG ou WebP, 5 Mo au plus ; redressée, réduite à 512 px et réencodée en WebP sans métadonnées.
     */
    public function storeStudent(UploadStudentPhotoRequest $request): StudentResource
    {
        $this->photos->store($request->student(), $request->photo());

        return $this->file($request, $request->student());
    }

    /** Retirer la photo de l'élève. */
    public function destroyStudent(ManageStudentRequest $request): StudentResource
    {
        $this->photos->remove($request->student());

        return $this->file($request, $request->student());
    }

    /**
     * Ajouter ou remplacer la photo d'un tuteur.
     *
     * Le tuteur est partagé par la fratrie : la photo l'est aussi.
     */
    public function storeGuardian(UploadGuardianPhotoRequest $request): StudentResource
    {
        $this->photos->store($request->link()->guardian, $request->photo());

        return $this->file($request, $request->student());
    }

    /** Retirer la photo d'un tuteur. */
    public function destroyGuardian(GuardianPhotoRequest $request): StudentResource
    {
        $this->photos->remove($request->link()->guardian);

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
