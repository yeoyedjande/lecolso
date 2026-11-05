<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Montant annuel d'un type de frais pour un niveau et une année (grille de frais). FCFA, entier.
 *
 * @property string $id
 * @property string $school_id
 * @property string $academic_year_id
 * @property string $level_id
 * @property string $fee_type_id
 * @property int $amount
 */
final class FeeSchedule extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['academic_year_id', 'level_id', 'fee_type_id', 'amount'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['amount' => 'integer'];
    }
}
