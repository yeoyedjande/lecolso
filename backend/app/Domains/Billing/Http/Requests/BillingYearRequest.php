<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Billing\Support\BillingScope;
use App\Domains\Identity\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

/** Année de la requête (`academic_year_id`, l'année en cours par défaut) et cycles de l'utilisateur pour une permission. */
trait BillingYearRequest
{
    private ?AcademicYear $resolvedYear = null;

    public function year(): AcademicYear
    {
        if ($this->resolvedYear !== null) {
            return $this->resolvedYear;
        }

        $id = $this->input('academic_year_id');
        $year = is_string($id) && Str::isUuid($id)
            ? AcademicYear::query()->find($id)
            : AcademicYear::query()->where('is_current', true)->first();

        return $this->resolvedYear = $year
            ?? throw new HttpResponseException(new JsonResponse(['message' => 'Aucune année scolaire.', 'code' => 'no_year'], 404));
    }

    /**
     * @return list<string>|null
     */
    protected function cyclesFor(string $permission): ?array
    {
        $user = $this->user();

        return $user instanceof User ? app(BillingScope::class)->cycles($user, $permission) : [];
    }
}
