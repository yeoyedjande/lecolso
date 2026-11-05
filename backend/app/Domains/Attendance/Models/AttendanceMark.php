<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Models;

use App\Domains\Attendance\Enums\AttendanceStatus;
use App\Domains\Students\Models\Student;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * Absence ou retard d'un élève à un appel (les présents ne sont pas stockés).
 *
 * @property string $id
 * @property string $school_id
 * @property string $roll_call_id
 * @property string $student_id
 * @property Carbon $date
 * @property AttendanceStatus $status
 * @property int|null $late_minutes
 * @property-read RollCall $rollCall
 * @property-read Student $student
 * @property-read AbsenceJustification|null $justification
 */
final class AttendanceMark extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['roll_call_id', 'student_id', 'date', 'status', 'late_minutes'];

    /**
     * @return BelongsTo<RollCall, $this>
     */
    public function rollCall(): BelongsTo
    {
        return $this->belongsTo(RollCall::class);
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return HasOne<AbsenceJustification, $this>
     */
    public function justification(): HasOne
    {
        return $this->hasOne(AbsenceJustification::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['date' => 'date', 'status' => AttendanceStatus::class, 'late_minutes' => 'integer'];
    }
}
