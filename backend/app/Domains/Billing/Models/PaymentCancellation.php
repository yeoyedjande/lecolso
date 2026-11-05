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
 * Annulation d'un paiement (direction, motif obligatoire), comptée dans une session de caisse : celle du paiement si
 * elle est encore ouverte, sinon celle du jour de l'auteur. Immuable.
 *
 * @property string $id
 * @property string $school_id
 * @property string $payment_id
 * @property string $cash_session_id
 * @property string $reason
 * @property string $cancelled_by
 * @property string $cancelled_by_name
 * @property Carbon $created_at
 * @property-read Payment $payment
 */
final class PaymentCancellation extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['payment_id', 'cash_session_id', 'reason', 'cancelled_by', 'cancelled_by_name'];

    /**
     * @return BelongsTo<Payment, $this>
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }
}
