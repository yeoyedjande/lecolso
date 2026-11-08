<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Controllers;

use App\Domains\Identity\Models\User;
use App\Domains\Students\Actions\ListStudents;
use App\Domains\Students\Actions\ManagePhotos;
use App\Domains\Students\Actions\PresentStudent;
use App\Domains\Students\Actions\UpdateStudent;
use App\Domains\Students\Http\Requests\ListStudentsRequest;
use App\Domains\Students\Http\Requests\ManageStudentRequest;
use App\Domains\Students\Http\Requests\ShowStudentRequest;
use App\Domains\Students\Http\Requests\UpdateStudentRequest;
use App\Domains\Students\Http\Resources\StudentResource;
use App\Domains\Students\Http\Resources\StudentRowResource;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use LogicException;

final class StudentController
{
    public function __construct(
        private CurrentSchool $currentSchool,
        private PresentStudent $present,
    ) {}

    /**
     * Élèves de l'école.
     *
     * Inscrits sur l'année demandée (en cours par défaut), par nom, 25 par page (curseur). Personnel : son cycle ;
     * enseignant : élèves de ses classes ; parent : ses enfants. Aucune donnée médicale dans la liste.
     */
    public function index(ListStudentsRequest $request, ListStudents $list): AnonymousResourceCollection
    {
        return StudentRowResource::collection($list->handle($this->user($request), $this->school(), $request->filters()));
    }

    /**
     * Dossier d'un élève.
     *
     * Tuteurs, inscriptions, fratrie ; `medical` seulement avec students.medical.view. 404 hors du périmètre.
     */
    public function show(ShowStudentRequest $request): StudentResource
    {
        return $this->resource($request, $request->student());
    }

    /** Modifier le dossier d'un élève. */
    public function update(UpdateStudentRequest $request, UpdateStudent $update): StudentResource
    {
        return $this->resource($request, $update->handle($request->student(), $request->studentChanges()));
    }

    /**
     * Supprimer le dossier d'un élève.
     *
     * Suppression logique (saisie erronée) : le matricule n'est jamais réutilisé, la photo est effacée. Un départ se
     * note sur l'inscription.
     */
    public function destroy(ManageStudentRequest $request, ManagePhotos $photos): JsonResponse
    {
        // Le dossier reste (suppression logique) ; la photo, donnée personnelle sans usage, est effacée
        $photos->remove($request->student());
        $request->student()->delete();

        return new JsonResponse(null, 204);
    }

    private function resource(Request $request, Student $student): StudentResource
    {
        return new StudentResource($this->present->handle($this->user($request), $this->school(), $student));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }

    private function school(): School
    {
        return $this->currentSchool->get() ?? throw new LogicException('Aucune école courante.');
    }
}
