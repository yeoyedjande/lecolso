<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Academic\Models\Level;
use App\Domains\Grading\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Niveau et ses matières, dans les réglages.
 *
 * @property-read array{level: Level, subjects: list<array{subject: Subject, used: bool}>} $resource
 */
final class SettingsLevelResource extends JsonResource
{
    /**
     * @return array{id: string, name: string, subjects: AnonymousResourceCollection}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource['level']->id,
            'name' => $this->resource['level']->name,
            'subjects' => SettingsSubjectResource::collection($this->resource['subjects']),
        ];
    }
}
