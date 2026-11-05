<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Models;

use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Journée de garderie d'un enfant : heures d'arrivée et de départ (HH:MM, heure d'Abidjan), qui l'a déposé et
 * récupéré.
 *
 * @property string $id
 * @property string $school_id
 * @property string $student_id
 * @property Carbon $date
 * @property string|null $arrived_at
 * @property string|null $left_at
 * @property string|null $dropped_by
 * @property string|null $picked_up_by
 */
final class DaycareVisit extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['id', 'student_id', 'date', 'arrived_at', 'left_at', 'dropped_by', 'picked_up_by'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['date' => 'date'];
    }
}
