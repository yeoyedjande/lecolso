<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Domains\Billing\Enums\PayerKind;
use App\Domains\Students\Models\Guardian;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Payeur d'une facture : en V1 le tuteur payeur de l'élève (un payeur par tuteur). Le nom est gardé pour l'historique.
 *
 * @property string $id
 * @property string $school_id
 * @property PayerKind $kind
 * @property string|null $guardian_id
 * @property string $name
 * @property-read Guardian|null $guardian
 */
final class Payer extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['kind', 'guardian_id', 'name'];

    /**
     * @return BelongsTo<Guardian, $this>
     */
    public function guardian(): BelongsTo
    {
        return $this->belongsTo(Guardian::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['kind' => PayerKind::class];
    }
}
