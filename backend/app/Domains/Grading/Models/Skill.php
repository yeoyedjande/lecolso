<?php

declare(strict_types=1);

namespace App\Domains\Grading\Models;

use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Compétence du référentiel d'un cycle pour une année, rangée par domaine.
 *
 * @property string $id
 * @property string $school_id
 * @property string $academic_year_id
 * @property string $cycle_id
 * @property string $domain
 * @property string $label
 * @property int $position
 */
final class Skill extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['academic_year_id', 'cycle_id', 'domain', 'label', 'position'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['position' => 'integer'];
    }
}
