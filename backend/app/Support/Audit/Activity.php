<?php

declare(strict_types=1);

namespace App\Support\Audit;

use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Collection;
use Spatie\Activitylog\Models\Activity as SpatieActivity;

/**
 * Entrée du journal d'audit, toujours rattachée à une école (table activity_log, RLS).
 *
 * - school_id : celui posé par l'objet journalisé (Auditable::tapActivity), sinon l'école courante ;
 *   sans école déterminable, l'entrée n'est pas écrite.
 * - Les attributs sensibles sont retirés des propriétés avant l'écriture (second filet après Auditable).
 *
 * @property string|null $school_id
 */
final class Activity extends SpatieActivity
{
    use HasUuids;

    protected static function booted(): void
    {
        self::creating(static function (Activity $activity): bool {
            $activity->school_id ??= app(TenantContext::class)->schoolId();

            if ($activity->school_id === null) {
                return false;
            }

            $properties = $activity->properties;
            if ($properties instanceof Collection) {
                $activity->properties = new Collection(SensitiveAttributes::scrub($properties->all()));
            }

            return true;
        });
    }
}
