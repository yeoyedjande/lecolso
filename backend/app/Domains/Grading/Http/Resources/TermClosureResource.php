<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Models\TermClosure;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Validation d'une classe pour une période : qui et quand ; déverrouillage éventuel (qui, quand, motif).
 *
 * @property-read TermClosure $resource
 */
final class TermClosureResource extends JsonResource
{
    /**
     * @return array{id: string, closed_at: string, closed_by: string, reopened_at: string|null, reopened_by: string|null, reopen_reason: string|null}
     */
    public function toArray(Request $request): array
    {
        $closure = $this->resource;

        return [
            'id' => $closure->id,
            'closed_at' => $closure->closed_at->toIso8601String(),
            'closed_by' => $closure->closed_by_name,
            'reopened_at' => $closure->reopened_at === null ? null : $closure->reopened_at->toIso8601String(),
            'reopened_by' => $closure->reopened_by_name === null ? null : (string) $closure->reopened_by_name,
            'reopen_reason' => $closure->reopen_reason === null ? null : (string) $closure->reopen_reason,
        ];
    }
}
