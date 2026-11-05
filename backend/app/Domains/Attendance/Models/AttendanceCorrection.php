<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Models;

use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Correction d'un appel après sa journée (ou appel fait en retard), par la direction, avec son motif.
 *
 * @property string $id
 * @property string $school_id
 * @property string $roll_call_id
 * @property string $reason
 * @property string $corrected_by
 * @property string $corrected_by_name
 * @property Carbon $created_at
 */
final class AttendanceCorrection extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['roll_call_id', 'reason', 'corrected_by', 'corrected_by_name'];
}
