<?php

declare(strict_types=1);

namespace App\Domains\Grading\Models;

use App\Domains\Grading\Enums\SkillLevel;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Niveau d'un élève dans une compétence pour une période (A, EA, NA). Pas de ligne : non évaluée.
 *
 * @property string $id
 * @property string $school_id
 * @property string $skill_id
 * @property string $student_id
 * @property string $term_id
 * @property SkillLevel $level
 * @property string $entered_by
 * @property Carbon|null $updated_at
 */
final class SkillEvaluation extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['skill_id', 'student_id', 'term_id', 'level', 'entered_by'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['level' => SkillLevel::class];
    }
}
