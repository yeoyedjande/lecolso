<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Models;

use App\Domains\Academic\Models\Cycle;
use App\Domains\Tenancy\Enums\SchoolType;
use App\Support\Audit\Auditable;
use Database\Factories\SchoolFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Établissement : le tenant. Pas de BelongsToSchool ici : la table est protégée par ses propres
 * politiques RLS (école courante, écoles où l'utilisateur a une affectation). Création et suppression :
 * connexion super-admin uniquement (Platform::run).
 *
 * @property string $id
 * @property string|null $organization_id
 * @property string $name
 * @property string $slug
 * @property SchoolType $type
 * @property string|null $city
 * @property string $currency
 * @property string|null $logo_path
 * @property array<string, mixed> $settings
 * @property array<string, bool> $features
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
final class School extends Model
{
    use Auditable;

    /** @use HasFactory<SchoolFactory> */
    use HasFactory, HasUuids, SoftDeletes;

    /** @var list<string> */
    protected $fillable = ['organization_id', 'name', 'slug', 'type', 'city', 'currency', 'logo_path', 'settings', 'features'];

    /** @var array<string, string> */
    protected $attributes = [
        'settings' => '{}',
        'features' => '{}',
        'currency' => 'XOF',
    ];

    /** Module activé pour l'établissement (schools.features). */
    public function hasFeature(string $feature): bool
    {
        return ($this->features[$feature] ?? false) === true;
    }

    /**
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * @return HasMany<Cycle, $this>
     */
    public function cycles(): HasMany
    {
        return $this->hasMany(Cycle::class)->orderBy('position');
    }

    protected static function newFactory(): SchoolFactory
    {
        return SchoolFactory::new();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => SchoolType::class,
            'settings' => 'array',
            'features' => 'array',
        ];
    }
}
