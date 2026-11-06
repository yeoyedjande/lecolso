<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Matière dans les réglages ; `used` : des évaluations l'utilisent (elle ne peut être retirée).
 *
 * @property-read array{subject: Subject, used: bool} $resource
 */
final class SettingsSubjectResource extends JsonResource
{
    /**
     * @return array{id: string, name: string, coefficient: int, position: int, used: bool}
     */
    public function toArray(Request $request): array
    {
        $subject = $this->resource['subject'];

        return [
            'id' => $subject->id,
            'name' => $subject->name,
            'coefficient' => $subject->coefficient,
            'position' => $subject->position,
            'used' => (bool) $this->resource['used'],
        ];
    }
}
