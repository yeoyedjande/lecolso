<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Resources;

use App\Domains\Attendance\Models\AttendanceCorrection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Correction d'un appel après sa journée : motif, auteur, date.
 *
 * @property-read AttendanceCorrection $resource
 */
final class RollCallCorrectionResource extends JsonResource
{
    /**
     * @return array{reason: string, by: string, at: string}
     */
    public function toArray(Request $request): array
    {
        return [
            'reason' => $this->resource->reason,
            'by' => $this->resource->corrected_by_name,
            'at' => $this->resource->created_at->toIso8601String(),
        ];
    }
}
