<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Classe pour les notes : cycle, niveau, mode d'évaluation (weighted_average, competency, observation), échelle des
 * moyennes, droit de saisie.
 *
 * @property-read array{id: string, name: string, level_id: string, cycle_id: string, cycle_code: string, cycle_name: string, mode: string, grade_scale: int, can_manage: bool, is_homeroom: bool} $resource
 */
final class GradingClassroomResource extends JsonResource
{
    /**
     * @return array{id: string, name: string, level_id: string, cycle: array{id: string, code: string, name: string}, mode: string, grade_scale: int, can_manage: bool, is_homeroom: bool}
     */
    public function toArray(Request $request): array
    {
        $row = $this->resource;

        return [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'level_id' => (string) $row['level_id'],
            'cycle' => ['id' => (string) $row['cycle_id'], 'code' => (string) $row['cycle_code'], 'name' => (string) $row['cycle_name']],
            'mode' => (string) $row['mode'],
            'grade_scale' => (int) $row['grade_scale'],
            'can_manage' => (bool) $row['can_manage'],
            'is_homeroom' => (bool) $row['is_homeroom'],
        ];
    }
}
