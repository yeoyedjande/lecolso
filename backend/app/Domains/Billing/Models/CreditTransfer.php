<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Trop-perçu d'une facture reporté sur une autre facture du même payeur (validé par la direction, motif obligatoire).
 * Aucun mouvement d'argent. Immuable.
 *
 * @property string $id
 * @property string $school_id
 * @property string $from_invoice_id
 * @property string $to_invoice_id
 * @property int $amount
 * @property string $reason
 * @property string $created_by
 * @property string $created_by_name
 * @property Carbon $created_at
 * @property-read Invoice $fromInvoice
 * @property-read Invoice $toInvoice
 */
final class CreditTransfer extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['from_invoice_id', 'to_invoice_id', 'amount', 'reason', 'created_by', 'created_by_name'];

    /**
     * @return BelongsTo<Invoice, $this>
     */
    public function fromInvoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'from_invoice_id');
    }

    /**
     * @return BelongsTo<Invoice, $this>
     */
    public function toInvoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'to_invoice_id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['amount' => 'integer'];
    }
}
