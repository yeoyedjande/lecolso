<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Notification du prestataire déjà traitée (clé : référence et état) : rejouée, elle n'a aucun effet.
 *
 * @property string $id
 * @property string $school_id
 * @property string $payment_intent_id
 * @property string $provider
 * @property string $event_key
 * @property string $status
 */
final class PaymentWebhookEvent extends Model
{
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['payment_intent_id', 'provider', 'event_key', 'status'];
}
