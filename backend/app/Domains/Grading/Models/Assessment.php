<?php

declare(strict_types=1);

namespace App\Domains\Grading\Models;

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
 * Évaluation (devoir, interrogation) d'une classe dans une matière et une période, avec son barème.
 *
 * @property string $id
 * @property string $school_id
 * @property string $classroom_id
 * @property string $subject_id
 * @property string $term_id
 * @property string $title
 * @property Carbon $date
 * @property int $out_of
 * @property string $created_by
 * @property-read Classroom $classroom
 * @property-read Subject $subject
 * @property-read Term $term
 * @property-read Collection<int, Grade> $grades
 */
final class Assessment extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['id', 'classroom_id', 'subject_id', 'term_id', 'title', 'date', 'out_of', 'created_by'];

    /**
     * @return BelongsTo<Classroom, $this>
     */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /**
     * @return BelongsTo<Subject, $this>
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * @return BelongsTo<Term, $this>
     */
    public function term(): BelongsTo
    {
        return $this->belongsTo(Term::class);
    }

    /**
     * @return HasMany<Grade, $this>
     */
    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['date' => 'date', 'out_of' => 'integer'];
    }
}
