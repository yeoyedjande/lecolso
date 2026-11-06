<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Models;

use App\Domains\Attendance\Enums\JustificationSource;
use App\Domains\Attendance\Enums\JustificationStatus;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Justification d'une absence ou d'un retard : motif, photo facultative (certificat), décision de l'école.
 * Le motif (souvent médical) n'est pas journalisé.
 *
 * @property string $id
 * @property string $school_id
 * @property string $attendance_mark_id
 * @property string $reason
 * @property string|null $proof_path
 * @property JustificationSource $source
 * @property JustificationStatus $status
 * @property string $submitted_by
 * @property string $submitted_by_name
 * @property string|null $decided_by
 * @property string|null $decided_by_name
 * @property Carbon|null $decided_at
 * @property string|null $decision_note
 * @property string|null $planned_absence_id absence annoncée par le parent, d'où vient la justification
 * @property Carbon $created_at
 * @property-read AttendanceMark $mark
 */
final class AbsenceJustification extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'attendance_mark_id', 'reason', 'proof_path', 'source', 'status', 'submitted_by', 'submitted_by_name',
        'decided_by', 'decided_by_name', 'decided_at', 'decision_note', 'planned_absence_id',
    ];

    /**
     * @return BelongsTo<AttendanceMark, $this>
     */
    public function mark(): BelongsTo
    {
        return $this->belongsTo(AttendanceMark::class, 'attendance_mark_id');
    }

    /**
     * @return list<string>
     */
    protected function auditExcept(): array
    {
        return ['reason', 'proof_path', 'decision_note'];
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'source' => JustificationSource::class,
            'status' => JustificationStatus::class,
            'decided_at' => 'datetime',
        ];
    }
}
