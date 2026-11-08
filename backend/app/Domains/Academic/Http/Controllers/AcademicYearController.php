<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Controllers;

use App\Domains\Academic\Actions\SaveAcademicYear;
use App\Domains\Academic\Http\Requests\ListAcademicYearsRequest;
use App\Domains\Academic\Http\Requests\SaveAcademicYearRequest;
use App\Domains\Academic\Http\Resources\AcademicYearResource;
use App\Domains\Academic\Models\AcademicYear;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class AcademicYearController
{
    /**
     * Années scolaires de l'école.
     *
     * La plus récente d'abord. Tout membre de l'école.
     */
    public function index(ListAcademicYearsRequest $request): AnonymousResourceCollection
    {
        return AcademicYearResource::collection(AcademicYear::query()->orderByDesc('starts_on')->get());
    }

    /**
     * Créer une année scolaire.
     *
     * Permission school.settings.manage sur toute l'école. `is_current` : en faire l'année en cours.
     */
    public function store(SaveAcademicYearRequest $request, SaveAcademicYear $save): JsonResponse
    {
        return (new AcademicYearResource($save->handle(null, $request->yearAttributes())))->response()->setStatusCode(201);
    }

    /**
     * Modifier une année scolaire.
     *
     * Dates, statut (`open` / `closed`), année en cours. 409 `current_year` si l'on clôture l'année en cours.
     */
    public function update(SaveAcademicYearRequest $request, SaveAcademicYear $save): AcademicYearResource
    {
        return new AcademicYearResource($save->handle($request->year(), $request->yearAttributes()));
    }
}
