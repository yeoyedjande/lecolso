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
 * Échéance d'une ligne de facture : date et montant (négatif pour la part d'une remise). FCFA, entier.
 *
 * @property string $id
 * @property string $school_id
 * @property string $invoice_id
 * @property string $invoice_line_id
 * @property Carbon $due_on
 * @property string $label
 * @property int $amount
 * @property-read Invoice $invoice
 */
final class Installment extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['invoice_id', 'invoice_line_id', 'due_on', 'label', 'amount'];

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
        return ['due_on' => 'date', 'amount' => 'integer'];
    }
}
