<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Models;

use App\Domains\Attendance\Enums\DaycareLogKind;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Entrée du journal de garderie (repas, sieste, change, humeur, activité, santé). La note n'est jamais journalisée.
 *
 * @property string $id
 * @property string $school_id
 * @property string $student_id
 * @property Carbon $date
 * @property string $time
 * @property DaycareLogKind $kind
 * @property string $note
 * @property string $created_by
 */
final class DaycareLog extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['id', 'student_id', 'date', 'time', 'kind', 'note', 'created_by'];

    /**
     * @return list<string>
     */
    protected function auditExcept(): array
    {
        return ['note'];
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['date' => 'date', 'kind' => DaycareLogKind::class];
    }
}
