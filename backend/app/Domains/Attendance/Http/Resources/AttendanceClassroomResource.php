<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Classe pour les présences : cycle, mode (roll_call : appel ; check_in_out : arrivées et départs), droits.
 *
 * @property-read array{id: string, name: string, cycle_id: string, cycle_code: string, cycle_name: string, mode: string, can_take: bool, is_homeroom: bool} $resource
 */
final class AttendanceClassroomResource extends JsonResource
{
    /**
     * @return array{id: string, name: string, cycle: array{id: string, code: string, name: string}, mode: string, can_take: bool, is_homeroom: bool}
     */
    public function toArray(Request $request): array
    {
        $row = $this->resource;

        return [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'cycle' => ['id' => (string) $row['cycle_id'], 'code' => (string) $row['cycle_code'], 'name' => (string) $row['cycle_name']],
            'mode' => (string) $row['mode'],
            'can_take' => (bool) $row['can_take'],
            'is_homeroom' => (bool) $row['is_homeroom'],
        ];
    }
}
