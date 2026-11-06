<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Domains\Billing\Enums\PaymentMethod;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * Paiement encaissé, immuable (aucune modification ni suppression, déclencheur en base). Numéro de reçu unique dans
 * l'école, jamais réutilisé ; une erreur se corrige par une annulation (PaymentCancellation).
 *
 * @property string $id
 * @property string $school_id
 * @property string $invoice_id
 * @property string|null $cash_session_id caisse du guichet ; null pour un paiement Mobile Money en ligne
 * @property string $receipt_number
 * @property int $amount
 * @property PaymentMethod $method
 * @property string|null $reference
 * @property string $payer_name
 * @property string $cashier_id
 * @property string $cashier_name
 * @property Carbon $paid_at
 * @property-read Invoice $invoice
 * @property-read CashSession|null $cashSession
 * @property-read PaymentCancellation|null $cancellation
 */
final class Payment extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['invoice_id', 'cash_session_id', 'receipt_number', 'amount', 'method', 'reference', 'payer_name', 'cashier_id', 'cashier_name', 'paid_at'];

    public function isCancelled(): bool
    {
        return $this->cancellation !== null;
    }

    /**
     * @return BelongsTo<Invoice, $this>
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * @return BelongsTo<CashSession, $this>
     */
    public function cashSession(): BelongsTo
    {
        return $this->belongsTo(CashSession::class);
    }

    /**
     * @return HasOne<PaymentCancellation, $this>
     */
    public function cancellation(): HasOne
    {
        return $this->hasOne(PaymentCancellation::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['amount' => 'integer', 'method' => PaymentMethod::class, 'paid_at' => 'datetime'];
    }
}
