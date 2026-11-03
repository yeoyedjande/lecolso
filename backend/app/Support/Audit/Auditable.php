<?php

declare(strict_types=1);

namespace App\Support\Audit;

use App\Domains\Tenancy\Models\School;
use Spatie\Activitylog\Contracts\Activity as ActivityContract;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Journal d'audit d'un modèle : champs modifiables qui ont changé, sans champ sensible ni entrée vide.
 * L'auteur (causer) est l'utilisateur connecté ; l'école est celle de l'objet, sinon l'école courante.
 */
trait Auditable
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnly($this->auditInclude())
            ->logExcept(array_merge(SensitiveAttributes::NAMES, $this->auditExcept()))
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('audit');
    }

    public function tapActivity(ActivityContract $activity, string $eventName): void
    {
        if (! $activity instanceof Activity) {
            return;
        }

        // Même connexion que l'objet journalisé (ex. école écrite par la connexion super-admin)
        $activity->setConnection($this->getConnectionName());

        if ($activity->school_id !== null) {
            return;
        }

        $schoolId = $this instanceof School ? $this->getKey() : $this->getAttribute('school_id');

        if (is_string($schoolId)) {
            $activity->school_id = $schoolId;
        }
    }

    /**
     * Attributs non assignables en masse à journaliser quand même (ex. un indicateur modifié par une Action).
     *
     * @return list<string>
     */
    protected function auditInclude(): array
    {
        return [];
    }

    /**
     * Attributs supplémentaires à ne pas journaliser pour ce modèle.
     *
     * @return list<string>
     */
    protected function auditExcept(): array
    {
        return [];
    }
}
