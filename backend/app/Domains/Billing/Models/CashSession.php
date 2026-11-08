<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Caisse d'un caissier pour un jour (ouverte au premier mouvement). Clôturée : montant compté, écart justifié, figée.
 *
 * @property string $id
 * @property string $school_id
 * @property string $cashier_id
 * @property string $cashier_name
 * @property Carbon $business_date
 * @property Carbon|null $closed_at
 * @property string|null $closed_by
 * @property int|null $expected_cash
 * @property int|null $counted_cash
 * @property string|null $note
 * @property-read Collection<int, Payment> $payments
 * @property-read Collection<int, PaymentCancellation> $cancellations
 * @property-read Collection<int, Refund> $refunds
 */
final class CashSession extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['cashier_id', 'cashier_name', 'business_date', 'closed_at', 'closed_by', 'expected_cash', 'counted_cash', 'note'];

    public function isClosed(): bool
    {
        return $this->closed_at !== null;
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->orderBy('paid_at');
    }

    /**
     * @return HasMany<PaymentCancellation, $this>
     */
    public function cancellations(): HasMany
    {
        return $this->hasMany(PaymentCancellation::class)->orderBy('created_at');
    }

    /**
     * @return HasMany<Refund, $this>
     */
    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class)->orderBy('created_at');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'business_date' => 'date',
            'closed_at' => 'datetime',
            'expected_cash' => 'integer',
            'counted_cash' => 'integer',
        ];
    }
}
