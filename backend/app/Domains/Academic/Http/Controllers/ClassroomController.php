<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Controllers;

use App\Domains\Academic\Actions\ListClassrooms;
use App\Domains\Academic\Actions\SaveClassroom;
use App\Domains\Academic\Http\Requests\DeleteClassroomRequest;
use App\Domains\Academic\Http\Requests\ListClassroomsRequest;
use App\Domains\Academic\Http\Requests\SaveClassroomRequest;
use App\Domains\Academic\Http\Resources\ClassroomResource;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use LogicException;

final class ClassroomController
{
    /**
     * Classes de l'école.
     *
     * Celles de l'année en cours (ou de `academic_year_id`), par cycle, niveau et section ; un utilisateur limité à des
     * cycles ne voit que les classes de ses cycles.
     */
    public function index(ListClassroomsRequest $request, ListClassrooms $list, CurrentSchool $school): AnonymousResourceCollection
    {
        $user = $request->user();

        if (! $user instanceof User) {
            throw new AuthenticationException;
        }

        return ClassroomResource::collection($list->handle(
            $user,
            $school->get() ?? throw new LogicException('Aucune école courante.'),
            $request->academicYearId(),
        ));
    }

    /**
     * Créer une classe.
     *
     * Niveau et section (« A ») ; année en cours par défaut. school.settings.manage sur le cycle du niveau.
     */
    public function store(SaveClassroomRequest $request, SaveClassroom $save): JsonResponse
    {
        return (new ClassroomResource($save->handle(null, $request->classroomAttributes())))->response()->setStatusCode(201);
    }

    /** Modifier une classe. */
    public function update(SaveClassroomRequest $request, SaveClassroom $save): ClassroomResource
    {
        return new ClassroomResource($save->handle($request->classroom(), $request->classroomAttributes()));
    }

    /**
     * Supprimer une classe.
     *
     * 409 `classroom_not_empty` si des élèves y ont été inscrits (changez-les d'abord de classe).
     */
    public function destroy(DeleteClassroomRequest $request): JsonResponse
    {
        $classroom = $request->classroom();

        if ($classroom->enrollments()->exists()) {
            throw new BusinessConflict('classroom_not_empty', 'Des élèves sont inscrits dans cette classe : changez-les de classe avant de la supprimer.');
        }

        $classroom->delete();

        return new JsonResponse(null, 204);
    }
}
