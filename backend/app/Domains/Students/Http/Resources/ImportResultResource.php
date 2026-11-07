<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Resources;

use App\Domains\Students\Actions\ImportStudents;
use App\Domains\Students\Data\ImportRowResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Résultat d'un import, ligne par ligne : `status` ready (vérifiée), created (inscrite, matricule), skipped (élève déjà
 * inscrit) ou error (`errors` : last_name, first_name, gender, birth_date, classroom, year_closed, classroom_full,
 * guardian, phone, duplicate), et les totaux.
 *
 * @property-read list<ImportRowResult> $resource
 */
final class ImportResultResource extends JsonResource
{
    /**
     * @return array{rows: AnonymousResourceCollection, counts: array{ready: int, created: int, skipped: int, error: int}}
     */
    public function toArray(Request $request): array
    {
        $counts = ImportStudents::counts($this->resource);

        return [
            'rows' => ImportRowResource::collection($this->resource),
            'counts' => [
                'ready' => $counts->ready,
                'created' => $counts->created,
                'skipped' => $counts->skipped,
                'error' => $counts->error,
            ],
        ];
    }
}
