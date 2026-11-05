<?php

declare(strict_types=1);

namespace App\Domains\Students\Models;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Inscription : élève × classe × année (une par élève et par année). Pivot des frais, notes et présences.
 *
 * @property string $id
 * @property string $school_id
 * @property string $student_id
 * @property string $academic_year_id
 * @property string $classroom_id
 * @property EnrollmentStatus $status
 * @property Carbon $enrolled_on
 * @property Carbon|null $left_on
 * @property string|null $leave_reason
 * @property-read Student $student
 * @property-read Classroom $classroom
 * @property-read AcademicYear $academicYear
 */
final class Enrollment extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['student_id', 'academic_year_id', 'classroom_id', 'status', 'enrolled_on', 'left_on', 'leave_reason'];

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return BelongsTo<Classroom, $this>
     */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /**
     * @return BelongsTo<AcademicYear, $this>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => EnrollmentStatus::class,
            'enrolled_on' => 'date',
            'left_on' => 'date',
        ];
    }
}
