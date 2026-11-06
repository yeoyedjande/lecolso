<?php

declare(strict_types=1);

namespace App\Domains\Grading\Models;

use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Matière d'un niveau pour une année, avec son coefficient (1 à 20).
 *
 * @property string $id
 * @property string $school_id
 * @property string $academic_year_id
 * @property string $level_id
 * @property string $name
 * @property int $coefficient
 * @property int $position
 */
final class Subject extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['academic_year_id', 'level_id', 'name', 'coefficient', 'position'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['coefficient' => 'integer', 'position' => 'integer'];
    }
}
