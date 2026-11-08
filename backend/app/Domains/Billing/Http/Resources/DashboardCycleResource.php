<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Effectif d'un cycle pour l'année en cours : élèves inscrits (actifs) et classes.
 *
 * @property-read array{cycle_id: string, code: string, name: string, students: int, classrooms: int} $resource
 */
final class DashboardCycleResource extends JsonResource
{
    /**
     * @return array{cycle_id: string, code: string, name: string, students: int, classrooms: int}
     */
    public function toArray(Request $request): array
    {
        $row = $this->resource;

        return [
            'cycle_id' => (string) $row['cycle_id'],
            'code' => (string) $row['code'],
            'name' => (string) $row['name'],
            'students' => (int) $row['students'],
            'classrooms' => (int) $row['classrooms'],
        ];
    }
}
