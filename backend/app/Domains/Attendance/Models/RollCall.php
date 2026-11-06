<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Models;

use App\Domains\Academic\Models\Classroom;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Appel d'une classe pour un jour (un seul) : auteur et heure du dernier enregistrement ; absences et retards dans
 * attendance_marks, corrections faites après la journée dans attendance_corrections.
 *
 * @property string $id
 * @property string $school_id
 * @property string $classroom_id
 * @property Carbon $date
 * @property string $taken_by
 * @property string $taken_by_name
 * @property Carbon $taken_at
 * @property-read Classroom $classroom
 * @property-read Collection<int, AttendanceMark> $marks
 * @property-read Collection<int, AttendanceCorrection> $corrections
 */
final class RollCall extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['id', 'classroom_id', 'date', 'taken_by', 'taken_by_name', 'taken_at'];

    /**
     * @return BelongsTo<Classroom, $this>
     */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /**
     * @return HasMany<AttendanceMark, $this>
     */
    public function marks(): HasMany
    {
        return $this->hasMany(AttendanceMark::class);
    }

    /**
     * @return HasMany<AttendanceCorrection, $this>
     */
    public function corrections(): HasMany
    {
        return $this->hasMany(AttendanceCorrection::class)->orderBy('created_at');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['date' => 'date', 'taken_at' => 'datetime'];
    }
}
