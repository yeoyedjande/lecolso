<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Domains\Billing\Enums\PayerKind;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Payeur d'une facture : en V1 le tuteur payeur de l'élève (un payeur par tuteur). Le nom est gardé pour l'historique.
 *
 * @property string $id
 * @property string $school_id
 * @property PayerKind $kind
 * @property string|null $guardian_id
 * @property string $name
 */
final class Payer extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['kind', 'guardian_id', 'name'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['kind' => PayerKind::class];
    }
}
