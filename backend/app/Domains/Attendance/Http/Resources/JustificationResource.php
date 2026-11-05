<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Resources;

use App\Domains\Attendance\Models\AbsenceJustification;
use App\Domains\Attendance\Support\AbsenceProof;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Justification d'une absence : motif, photo (URL signée de 10 minutes), source (guardian, school), statut
 * (pending, accepted, refused), auteurs et dates.
 *
 * @property-read AbsenceJustification $resource
 */
final class JustificationResource extends JsonResource
{
    /**
     * @return array{id: string, status: string, source: string, reason: string, proof_url: string|null, submitted_by_name: string, submitted_at: string, decided_by_name: string|null, decided_at: string|null, decision_note: string|null}
     */
    public function toArray(Request $request): array
    {
        $justification = $this->resource;
        $proof = $justification->proof_path === null ? null : app(AbsenceProof::class)->url($justification->proof_path);

        return [
            'id' => $justification->id,
            'status' => $justification->status->value,
            'source' => $justification->source->value,
            'reason' => $justification->reason,
            'proof_url' => $proof === null ? null : (string) $proof,
            'submitted_by_name' => $justification->submitted_by_name,
            'submitted_at' => $justification->created_at->toIso8601String(),
            'decided_by_name' => $justification->decided_by_name,
            'decided_at' => $justification->decided_at?->toIso8601String(),
            'decision_note' => $justification->decision_note,
        ];
    }
}
