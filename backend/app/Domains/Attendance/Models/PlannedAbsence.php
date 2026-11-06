<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Models;

use App\Domains\Attendance\Enums\JustificationStatus;
use App\Domains\Students\Models\Student;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Absence annoncée à l'avance par un parent (du … au …, motif) : l'appel des jours couverts marque l'enfant absent
 * avec cette justification, en attente puis acceptée ou refusée par l'école. Le motif n'est pas journalisé.
 *
 * @property string $id
 * @property string $school_id
 * @property string $student_id
 * @property Carbon $starts_on
 * @property Carbon $ends_on
 * @property string $reason
 * @property JustificationStatus $status
 * @property string $submitted_by
 * @property string $submitted_by_name
 * @property string|null $decided_by
 * @property string|null $decided_by_name
 * @property Carbon|null $decided_at
 * @property string|null $decision_note
 * @property Carbon $created_at
 * @property-read Student $student
 */
final class PlannedAbsence extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'student_id', 'starts_on', 'ends_on', 'reason', 'status', 'submitted_by', 'submitted_by_name',
        'decided_by', 'decided_by_name', 'decided_at', 'decision_note',
    ];

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function covers(string $date): bool
    {
        return $this->starts_on->toDateString() <= $date && $date <= $this->ends_on->toDateString();
    }

    /**
     * @return list<string>
     */
    protected function auditExcept(): array
    {
        return ['reason', 'decision_note'];
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
            'status' => JustificationStatus::class,
            'decided_at' => 'datetime',
        ];
    }
}
