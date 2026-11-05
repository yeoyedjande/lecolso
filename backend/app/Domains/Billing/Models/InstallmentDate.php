<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Date d'une échéance du calendrier d'un cycle pour une année (modèle des échéances des factures).
 *
 * @property string $id
 * @property string $school_id
 * @property string $academic_year_id
 * @property string $cycle_id
 * @property int $position
 * @property Carbon $due_on
 * @property string $label
 */
final class InstallmentDate extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['academic_year_id', 'cycle_id', 'position', 'due_on', 'label'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['position' => 'integer', 'due_on' => 'date'];
    }
}
