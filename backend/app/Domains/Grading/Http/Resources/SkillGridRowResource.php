<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Enums\SkillLevel;
use App\Domains\Students\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Ligne d'une grille de compétences : élève, un niveau par compétence (dans l'ordre des colonnes).
 *
 * @property-read array{student: Student, levels: list<array{skill_id: string, level: SkillLevel|null}>} $resource
 */
final class SkillGridRowResource extends JsonResource
{
    /**
     * @return array{student: GradingStudentResource, levels: AnonymousResourceCollection}
     */
    public function toArray(Request $request): array
    {
        return [
            'student' => new GradingStudentResource($this->resource['student']),
            'levels' => SkillCellResource::collection($this->resource['levels']),
        ];
    }
}
