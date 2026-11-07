<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Resources;

use App\Domains\Students\Data\ImportRowResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Une ligne importée : `status` ready, created, skipped ou error ; `errors` : last_name, first_name, gender,
 * birth_date, classroom, year_closed, classroom_full, guardian, phone, duplicate.
 *
 * @property-read ImportRowResult $resource
 */
final class ImportRowResource extends JsonResource
{
    /**
     * @return array{line: int, status: string, errors: list<string>, student_id: string|null, matricule: string|null}
     */
    public function toArray(Request $request): array
    {
        return [
            'line' => $this->resource->line,
            'status' => $this->resource->status,
            'errors' => $this->resource->errors,
            'student_id' => $this->resource->studentId,
            'matricule' => $this->resource->matricule,
        ];
    }
}
