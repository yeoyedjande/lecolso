<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Resources;

use App\Domains\Family\Data\ChildSummary;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Enfant à l'accueil de l'espace parent : présence du jour (present, absent, late ; null si l'appel n'est pas fait),
 * reste à payer et retard (FCFA), absences à justifier.
 *
 * @property-read ChildSummary $resource
 */
final class ChildSummaryResource extends JsonResource
{
    /**
     * @return array{student: ChildStudentResource, presence: string|null, remaining: int|null, overdue: int|null, next_due_on: string|null, absences_to_justify: int}
     */
    public function toArray(Request $request): array
    {
        $summary = $this->resource;
        $balance = $summary->balance;
        $next = $balance?->next;

        return [
            'student' => new ChildStudentResource(['student' => $summary->student, 'enrollment' => $summary->enrollment]),
            'presence' => $summary->presence === null ? null : (string) $summary->presence,
            'remaining' => $balance === null ? null : $balance->remaining,
            'overdue' => $balance === null ? null : $balance->overdue,
            'next_due_on' => $next === null ? null : (string) $next['due_on'],
            'absences_to_justify' => $summary->absencesToJustify,
        ];
    }
}
