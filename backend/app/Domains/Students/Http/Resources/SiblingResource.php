<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Resources;

use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Frère ou sœur (tuteur commun) visible par l'utilisateur, avec sa classe de l'année en cours.
 *
 * @property-read Student $resource
 */
final class SiblingResource extends JsonResource
{
    /**
     * @return array{id: string, full_name: string, classroom_name: string|null}
     */
    public function toArray(Request $request): array
    {
        $enrollment = $this->resource->enrollments->first();

        return [
            'id' => $this->resource->id,
            'full_name' => $this->resource->fullName(),
            'classroom_name' => $enrollment instanceof Enrollment ? $enrollment->classroom->name() : null,
        ];
    }
}
