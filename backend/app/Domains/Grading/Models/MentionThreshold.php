<?php

declare(strict_types=1);

namespace App\Domains\Grading\Models;

use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Seuils des mentions d'un cycle, sur l'échelle du cycle (décimaux lus en chaîne).
 *
 * @property string $id
 * @property string $school_id
 * @property string $cycle_id
 * @property string $congratulations
 * @property string $honor_roll
 * @property string $encouragement
 * @property string $warning_below
 */
final class MentionThreshold extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['cycle_id', 'congratulations', 'honor_roll', 'encouragement', 'warning_below'];
}
