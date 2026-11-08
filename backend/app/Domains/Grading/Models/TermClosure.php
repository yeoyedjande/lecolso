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
 * Validation d'une classe pour une période par la direction : notes, compétences et appréciations figées. Rouverte
 * (`reopened_at`) avec un motif, elle reste dans l'historique ; une seule validation en cours par classe et période.
 *
 * @property string $id
 * @property string $school_id
 * @property string $classroom_id
 * @property string $term_id
 * @property Carbon $closed_at
 * @property string $closed_by
 * @property string $closed_by_name
 * @property Carbon|null $reopened_at
 * @property string|null $reopened_by
 * @property string|null $reopened_by_name
 * @property string|null $reopen_reason
 * @property-read Classroom $classroom
 * @property-read Term $term
 * @property-read Collection<int, ReportCard> $reportCards
 */
final class TermClosure extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['classroom_id', 'term_id', 'closed_at', 'closed_by', 'closed_by_name', 'reopened_at', 'reopened_by', 'reopened_by_name', 'reopen_reason'];

    /**
     * @return BelongsTo<Classroom, $this>
     */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /**
     * @return BelongsTo<Term, $this>
     */
    public function term(): BelongsTo
    {
        return $this->belongsTo(Term::class);
    }

    /**
     * @return HasMany<ReportCard, $this>
     */
    public function reportCards(): HasMany
    {
        return $this->hasMany(ReportCard::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['closed_at' => 'datetime', 'reopened_at' => 'datetime'];
    }
}
