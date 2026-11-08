<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Domains\Billing\Enums\NotificationStatus;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Confirmation d'un paiement envoyée au payeur (SMS) : une par paiement et par canal, texte jamais stocké.
 * `status` : queued, sent, failed (motif), skipped (aucun numéro de payeur).
 *
 * @property string $id
 * @property string $school_id
 * @property string $payment_id
 * @property string $channel
 * @property NotificationStatus $status
 * @property string|null $failure
 * @property Carbon|null $sent_at
 */
final class PaymentNotification extends Model
{
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['payment_id', 'channel', 'status', 'failure', 'sent_at'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['status' => NotificationStatus::class, 'sent_at' => 'datetime'];
    }
}
