<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Jour de classe dans l'historique : appel fait ou non, présents, absents, retards.
 *
 * @property-read array{date: string, taken: bool, present: int, absent: int, late: int} $resource
 */
final class AttendanceDayResource extends JsonResource
{
    /**
     * @return array{date: string, taken: bool, present: int, absent: int, late: int}
     */
    public function toArray(Request $request): array
    {
        $day = $this->resource;

        return [
            'date' => (string) $day['date'],
            'taken' => (bool) $day['taken'],
            'present' => (int) $day['present'],
            'absent' => (int) $day['absent'],
            'late' => (int) $day['late'],
        ];
    }
}
