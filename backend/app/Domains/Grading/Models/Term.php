<?php

declare(strict_types=1);

namespace App\Domains\Grading\Models;

use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Période d'un cycle pour une année (trimestre, semestre ou période libre, d'après term_type du cycle).
 *
 * @property string $id
 * @property string $school_id
 * @property string $academic_year_id
 * @property string $cycle_id
 * @property int $position
 * @property string $label
 * @property Carbon $starts_on
 * @property Carbon $ends_on
 */
final class Term extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['academic_year_id', 'cycle_id', 'position', 'label', 'starts_on', 'ends_on'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['position' => 'integer', 'starts_on' => 'date', 'ends_on' => 'date'];
    }
}
