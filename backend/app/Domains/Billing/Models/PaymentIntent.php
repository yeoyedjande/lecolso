<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Domains\Billing\Enums\FeePayer;
use App\Domains\Billing\Enums\PaymentIntentStatus;
use App\Domains\Billing\Enums\PaymentMethod;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Demande de paiement Mobile Money d'un parent : montant crédité sur la facture, frais, montant débité, opérateur et
 * numéro (jamais journalisé), référence du prestataire, état ; le paiement enregistré une fois confirmée.
 *
 * @property string $id
 * @property string $school_id
 * @property string $invoice_id
 * @property string $student_id
 * @property string $requested_by
 * @property string $requested_by_name
 * @property PaymentMethod $method
 * @property string $phone
 * @property int $amount
 * @property int $fee
 * @property int $charged
 * @property FeePayer $fee_payer
 * @property string $provider
 * @property string|null $provider_reference
 * @property PaymentIntentStatus $status
 * @property string|null $failure_reason
 * @property string|null $payment_id
 * @property Carbon $expires_at
 * @property Carbon $created_at
 * @property-read Invoice $invoice
 * @property-read Payment|null $payment
 */
final class PaymentIntent extends Model
{
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'invoice_id', 'student_id', 'requested_by', 'requested_by_name', 'method', 'phone', 'amount', 'fee', 'charged',
        'fee_payer', 'provider', 'provider_reference', 'status', 'failure_reason', 'payment_id', 'expires_at',
    ];

    /**
     * @return BelongsTo<Invoice, $this>
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * @return BelongsTo<Payment, $this>
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'method' => PaymentMethod::class,
            'fee_payer' => FeePayer::class,
            'status' => PaymentIntentStatus::class,
            'amount' => 'integer',
            'fee' => 'integer',
            'charged' => 'integer',
            'expires_at' => 'datetime',
        ];
    }
}
