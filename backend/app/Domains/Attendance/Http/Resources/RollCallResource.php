<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Resources;

use App\Domains\Attendance\Data\RollCallView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Appel d'une classe pour un jour : élèves inscrits et leur statut (present, absent, late), justification, appel
 * enregistré (auteur, heure), corrections (motif), `can_edit`, `needs_reason` (journée passée : motif obligatoire).
 *
 * @property-read RollCallView $resource
 */
final class RollCallResource extends JsonResource
{
    /**
     * @return array{classroom: array{id: string, name: string}, date: string, taken: array{by: string, at: string}|null, corrections: AnonymousResourceCollection<RollCallCorrectionResource>, rows: AnonymousResourceCollection<RollCallRowResource>, can_edit: bool, needs_reason: bool}
     */
    public function toArray(Request $request): array
    {
        $view = $this->resource;
        $call = $view->rollCall;

        return [
            'classroom' => ['id' => $view->classroom->id, 'name' => $view->classroom->name()],
            'date' => $view->date,
            'taken' => $call === null ? null : ['by' => $call->taken_by_name, 'at' => $call->taken_at->toIso8601String()],
            'corrections' => RollCallCorrectionResource::collection($call === null ? [] : $call->corrections),
            'rows' => RollCallRowResource::collection($view->rows),
            'can_edit' => $view->canEdit,
            'needs_reason' => $view->needsReason,
        ];
    }
}
