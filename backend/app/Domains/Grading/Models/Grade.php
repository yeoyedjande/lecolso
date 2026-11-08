<?php

declare(strict_types=1);

namespace App\Domains\Grading\Models;

use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Note d'un élève à une évaluation (sur le barème de l'évaluation), ou absence. Pas de ligne, ou ligne sans valeur ni
 * absence (note effacée, dont la date protège l'effacement d'une saisie hors connexion plus ancienne) : non saisie.
 *
 * @property string $id
 * @property string $school_id
 * @property string $assessment_id
 * @property string $student_id
 * @property string|null $value décimal (2 chiffres), chaîne lue en base ; null : absent ou effacée
 * @property bool $absent
 * @property string $entered_by
 * @property Carbon|null $updated_at
 */
final class Grade extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['assessment_id', 'student_id', 'value', 'absent', 'entered_by'];

    public function score(): ?float
    {
        return $this->absent || $this->value === null ? null : (float) $this->value;
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['absent' => 'boolean'];
    }
}
