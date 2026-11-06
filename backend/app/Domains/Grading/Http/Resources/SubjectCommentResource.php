<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Matière d'un bulletin : moyenne de l'élève sur l'échelle du cycle et appréciation du titulaire.
 *
 * @property-read array{subject_id: string, average: float|null, comment: string|null} $resource
 */
final class SubjectCommentResource extends JsonResource
{
    /**
     * @return array{subject_id: string, average: float|null, comment: string|null}
     */
    public function toArray(Request $request): array
    {
        return [
            'subject_id' => $this->resource['subject_id'],
            'average' => $this->resource['average'] === null ? null : (float) $this->resource['average'],
            'comment' => $this->resource['comment'] === null ? null : (string) $this->resource['comment'],
        ];
    }
}
