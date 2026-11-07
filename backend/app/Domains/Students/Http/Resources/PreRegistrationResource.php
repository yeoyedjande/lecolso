<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Resources;

use App\Domains\Students\Models\PreRegistration;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Pré-inscription vue par le secrétariat : enfant, niveau demandé (et son cycle), famille, message, décision et
 * dernier SMS envoyé au parent (`notification_status` : queued, sent, failed avec `notification_failure`).
 *
 * @property-read PreRegistration $resource
 */
final class PreRegistrationResource extends JsonResource
{
    /**
     * @return array{id: string, reference: string, status: string, created_at: string, child: array{last_name: string, first_name: string, gender: string, birth_date: string}, level: array{id: string, name: string, cycle_id: string, cycle_name: string}, guardian: array{name: string, phone: string, email: string|null}, message: string|null, decided_by_name: string|null, decided_at: string|null, decision_note: string|null, student_id: string|null, notification_status: string|null, notification_failure: string|null}
     */
    public function toArray(Request $request): array
    {
        $pre = $this->resource;
        $level = $pre->level;

        return [
            'id' => $pre->id,
            'reference' => $pre->reference,
            'status' => $pre->status->value,
            'created_at' => $pre->created_at->toIso8601String(),
            'child' => [
                'last_name' => $pre->child_last_name,
                'first_name' => $pre->child_first_name,
                'gender' => $pre->child_gender->value,
                'birth_date' => $pre->child_birth_date->toDateString(),
            ],
            'level' => [
                'id' => $level->id,
                'name' => $level->name,
                'cycle_id' => $level->cycle_id,
                'cycle_name' => $level->cycle->name,
            ],
            'guardian' => [
                'name' => $pre->guardian_name,
                'phone' => $pre->guardian_phone,
                'email' => $pre->guardian_email,
            ],
            'message' => $pre->message,
            'decided_by_name' => $pre->decided_by_name,
            'decided_at' => $pre->decided_at === null ? null : $pre->decided_at->toIso8601String(),
            'decision_note' => $pre->decision_note,
            'student_id' => $pre->student_id,
            'notification_status' => $pre->notification_status,
            'notification_failure' => $pre->notification_failure,
        ];
    }
}
