<?php

declare(strict_types=1);

namespace App\Domains\Academic\Models;

use App\Support\Audit\Auditable;
use App\Support\Cycles\CycleSettings;
use App\Support\Tenancy\BelongsToSchool;
use Database\Factories\CycleFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Cycle d'un établissement (garderie, maternelle, primaire…). Son comportement vient de $settings,
 * jamais de $code (ADR 0003).
 *
 * @property string $id
 * @property string $school_id
 * @property string $code
 * @property string $name
 * @property int $position
 * @property CycleSettings $settings
 * @property bool $is_active
 */
final class Cycle extends Model
{
    use Auditable;
    use BelongsToSchool;

    /** @use HasFactory<CycleFactory> */
    use HasFactory;

    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['code', 'name', 'position', 'settings', 'is_active'];

    /**
     * @return HasMany<Level, $this>
     */
    public function levels(): HasMany
    {
        return $this->hasMany(Level::class)->orderBy('position');
    }

    protected static function newFactory(): CycleFactory
    {
        return CycleFactory::new();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'settings' => CycleSettings::class,
            'position' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
