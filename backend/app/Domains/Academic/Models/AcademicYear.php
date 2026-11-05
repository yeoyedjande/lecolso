<?php

declare(strict_types=1);

namespace App\Domains\Academic\Models;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Database\Factories\AcademicYearFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Année scolaire d'un établissement (« 2026-2027 ») ; une seule est en cours.
 *
 * @property string $id
 * @property string $school_id
 * @property string $label
 * @property Carbon $starts_on
 * @property Carbon $ends_on
 * @property AcademicYearStatus $status
 * @property bool $is_current
 */
final class AcademicYear extends Model
{
    use Auditable;
    use BelongsToSchool;

    /** @use HasFactory<AcademicYearFactory> */
    use HasFactory;

    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['label', 'starts_on', 'ends_on', 'status', 'is_current'];

    /**
     * @return HasMany<Classroom, $this>
     */
    public function classrooms(): HasMany
    {
        return $this->hasMany(Classroom::class);
    }

    protected static function newFactory(): AcademicYearFactory
    {
        return AcademicYearFactory::new();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
            'status' => AcademicYearStatus::class,
            'is_current' => 'boolean',
        ];
    }
}
