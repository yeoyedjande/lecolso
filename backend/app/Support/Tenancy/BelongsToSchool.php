<?php

declare(strict_types=1);

namespace App\Support\Tenancy;

use App\Domains\Tenancy\Models\School;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle d'une table métier (colonne school_id + RLS).
 *
 * - Scope global : uniquement l'école courante ; sans école courante, aucune ligne (mode fermé, comme la RLS).
 * - Création : school_id rempli depuis l'école courante ; sans contexte, ou pour une autre école : exception.
 * - Mise à jour : changer le school_id d'une ligne est interdit.
 *
 * Seule exception, explicite : dans Platform::run() (super-admin, BYPASSRLS), le scope ne filtre pas.
 *
 * @mixin Model
 */
trait BelongsToSchool
{
    public static function bootBelongsToSchool(): void
    {
        static::addGlobalScope('school', static function (Builder $query): void {
            if (Platform::active()) {
                return;
            }

            $schoolId = app(TenantContext::class)->schoolId();

            if ($schoolId === null) {
                $query->whereRaw('false');

                return;
            }

            $query->where($query->qualifyColumn('school_id'), $schoolId);
        });

        static::creating(static function (Model $model): void {
            $current = app(TenantContext::class)->schoolId();
            $given = $model->getAttribute('school_id');

            if ($current === null) {
                if (Platform::active() && is_string($given)) {
                    return;
                }

                throw new MissingTenantContext(sprintf('Création de %s sans école courante.', $model::class));
            }

            if ($given !== null && $given !== $current) {
                throw new MissingTenantContext(sprintf('Création de %s pour une autre école que l’école courante.', $model::class));
            }

            $model->setAttribute('school_id', $current);
        });

        static::updating(static function (Model $model): void {
            if ($model->isDirty('school_id')) {
                throw new MissingTenantContext(sprintf('Le school_id de %s ne peut pas changer.', $model::class));
            }
        });
    }

    /**
     * @return BelongsTo<School, $this>
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }
}
