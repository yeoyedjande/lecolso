<?php

declare(strict_types=1);

namespace App\Domains\Grading\Models;

use App\Domains\Grading\Enums\ReportCardStatus;
use App\Domains\Students\Models\Student;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Bulletin (ou livret) PDF d'un élève, rendu à la validation de sa classe. Fichier privé `report-cards/{uuid}.pdf`,
 * lu par une URL signée de 10 minutes.
 *
 * @property string $id
 * @property string $school_id
 * @property string $term_closure_id
 * @property string $student_id
 * @property ReportCardStatus $status
 * @property string|null $path
 * @property Carbon|null $rendered_at
 * @property-read TermClosure $closure
 * @property-read Student $student
 */
final class ReportCard extends Model
{
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['term_closure_id', 'student_id', 'status', 'path', 'rendered_at'];

    /**
     * @return BelongsTo<TermClosure, $this>
     */
    public function closure(): BelongsTo
    {
        return $this->belongsTo(TermClosure::class, 'term_closure_id');
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['status' => ReportCardStatus::class, 'rendered_at' => 'datetime'];
    }
}
