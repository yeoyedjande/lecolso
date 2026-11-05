<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Domains\Billing\Enums\PaymentMethod;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Remboursement d'un trop-perçu, validé par la direction (motif obligatoire), sorti de la caisse de son auteur.
 * Numéro RMB-2026-000001 unique dans l'école. Immuable.
 *
 * @property string $id
 * @property string $school_id
 * @property string $invoice_id
 * @property string $cash_session_id
 * @property string $number
 * @property int $amount
 * @property PaymentMethod $method
 * @property string|null $reference
 * @property string $reason
 * @property string $refunded_by
 * @property string $refunded_by_name
 * @property Carbon $created_at
 * @property-read Invoice $invoice
 */
final class Refund extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['invoice_id', 'cash_session_id', 'number', 'amount', 'method', 'reference', 'reason', 'refunded_by', 'refunded_by_name'];

    /**
     * @return BelongsTo<Invoice, $this>
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['amount' => 'integer', 'method' => PaymentMethod::class];
    }
}
