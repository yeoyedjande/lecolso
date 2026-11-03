<?php

declare(strict_types=1);

namespace App\Domains\Academic\Models;

use App\Support\Tenancy\BelongsToSchool;
use Database\Factories\LevelFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Niveau d'un cycle (Crèche, PS, MS, GS, CP1…CM2).
 *
 * @property string $id
 * @property string $school_id
 * @property string $cycle_id
 * @property string $code
 * @property string $name
 * @property int $position
 */
final class Level extends Model
{
    use BelongsToSchool;

    /** @use HasFactory<LevelFactory> */
    use HasFactory;

    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['cycle_id', 'code', 'name', 'position'];

    /**
     * @return BelongsTo<Cycle, $this>
     */
    public function cycle(): BelongsTo
    {
        return $this->belongsTo(Cycle::class);
    }

    protected static function newFactory(): LevelFactory
    {
        return LevelFactory::new();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['position' => 'integer'];
    }
}
