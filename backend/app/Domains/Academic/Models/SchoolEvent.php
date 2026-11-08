<?php

declare(strict_types=1);

namespace App\Domains\Academic\Models;

use App\Domains\Academic\Enums\SchoolEventKind;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Événement du calendrier de l'école (congé, examen, réunion, événement, formation), pour toute l'école ou un cycle.
 *
 * @property string $id
 * @property string $school_id
 * @property string $title
 * @property SchoolEventKind $kind
 * @property Carbon $starts_on
 * @property Carbon $ends_on
 * @property string|null $cycle_id
 * @property string|null $location
 * @property string $created_by
 * @property-read Cycle|null $cycle
 */
final class SchoolEvent extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['title', 'kind', 'starts_on', 'ends_on', 'cycle_id', 'location', 'created_by'];

    /**
     * @return BelongsTo<Cycle, $this>
     */
    public function cycle(): BelongsTo
    {
        return $this->belongsTo(Cycle::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => SchoolEventKind::class,
            'starts_on' => 'date',
            'ends_on' => 'date',
        ];
    }
}
