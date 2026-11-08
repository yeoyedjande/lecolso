<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Domains\Billing\Enums\LineKind;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Ligne d'une facture : frais de la grille, remise (montant négatif, motif) ou ligne manuelle. FCFA, entier.
 *
 * @property string $id
 * @property string $school_id
 * @property string $invoice_id
 * @property string|null $fee_type_id
 * @property LineKind $kind
 * @property string $label
 * @property int $amount
 * @property string|null $reason
 * @property string|null $created_by
 * @property-read FeeType|null $feeType
 * @property-read Collection<int, Installment> $installments
 */
final class InvoiceLine extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['invoice_id', 'fee_type_id', 'kind', 'label', 'amount', 'reason', 'created_by'];

    /**
     * @return BelongsTo<FeeType, $this>
     */
    public function feeType(): BelongsTo
    {
        return $this->belongsTo(FeeType::class);
    }

    /**
     * @return HasMany<Installment, $this>
     */
    public function installments(): HasMany
    {
        return $this->hasMany(Installment::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['kind' => LineKind::class, 'amount' => 'integer'];
    }
}
