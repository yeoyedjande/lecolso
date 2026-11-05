<?php

declare(strict_types=1);

namespace App\Domains\Students\Models;

use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Tuteur (parent) d'un ou plusieurs élèves de l'école, unique par téléphone (E.164) : une fratrie partage ses tuteurs.
 * Le compte parent de l'application s'y rattache par le téléphone.
 *
 * @property string $id
 * @property string $school_id
 * @property string $name
 * @property string $phone
 * @property string|null $email
 * @property string|null $profession
 * @property string|null $photo_path photo WebP du stockage privé (Support\PersonPhoto)
 * @property-read Collection<int, GuardianLink> $links
 */
final class Guardian extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['name', 'phone', 'email', 'profession'];

    /**
     * @return HasMany<GuardianLink, $this>
     */
    public function links(): HasMany
    {
        return $this->hasMany(GuardianLink::class);
    }
}
