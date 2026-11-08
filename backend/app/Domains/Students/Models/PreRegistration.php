<?php

declare(strict_types=1);

namespace App\Domains\Students\Models;

use App\Domains\Academic\Models\Level;
use App\Domains\Students\Enums\Gender;
use App\Domains\Students\Enums\PreRegistrationStatus;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Pré-inscription envoyée en ligne par une famille (page publique de l'école), traitée par le secrétariat.
 * Données d'enfant et message jamais journalisés (aucun Auditable).
 *
 * @property string $id
 * @property string $school_id
 * @property string $reference PRE-2026-000123
 * @property string $level_id
 * @property string $child_last_name
 * @property string $child_first_name
 * @property Gender $child_gender
 * @property Carbon $child_birth_date
 * @property string $guardian_name
 * @property string $guardian_phone E.164
 * @property string|null $guardian_email
 * @property string|null $message
 * @property PreRegistrationStatus $status
 * @property string|null $decided_by
 * @property string|null $decided_by_name
 * @property Carbon|null $decided_at
 * @property string|null $decision_note
 * @property string|null $student_id
 * @property string|null $notification_status
 * @property string|null $notification_failure
 * @property Carbon $created_at
 * @property-read Level $level
 */
final class PreRegistration extends Model
{
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'reference', 'level_id', 'child_last_name', 'child_first_name', 'child_gender', 'child_birth_date',
        'guardian_name', 'guardian_phone', 'guardian_email', 'message', 'status', 'decided_by', 'decided_by_name',
        'decided_at', 'decision_note', 'student_id', 'notification_status', 'notification_failure',
    ];

    public function childName(): string
    {
        return mb_strtoupper($this->child_last_name).' '.$this->child_first_name;
    }

    /**
     * @return BelongsTo<Level, $this>
     */
    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'child_gender' => Gender::class,
            'child_birth_date' => 'date',
            'status' => PreRegistrationStatus::class,
            'decided_at' => 'datetime',
        ];
    }
}
