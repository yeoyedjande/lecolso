<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Domains\Billing\Enums\ReminderStatus;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Relance SMS d'un payeur pour ses factures en retard. Le texte n'est pas stocké (prénoms des enfants).
 *
 * @property string $id
 * @property string $school_id
 * @property string|null $payer_id
 * @property list<string> $invoice_ids
 * @property string $phone
 * @property int $overdue_amount
 * @property ReminderStatus $status
 * @property string|null $failure
 * @property Carbon|null $sent_at
 * @property string $created_by
 * @property string $created_by_name
 * @property Carbon $created_at
 * @property-read Payer|null $payer
 */
final class PaymentReminder extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['payer_id', 'invoice_ids', 'phone', 'overdue_amount', 'status', 'failure', 'sent_at', 'created_by', 'created_by_name'];

    /**
     * @return BelongsTo<Payer, $this>
     */
    public function payer(): BelongsTo
    {
        return $this->belongsTo(Payer::class);
    }

    /**
     * Téléphone du parent : jamais dans le journal d'audit.
     *
     * @return list<string>
     */
    protected function auditExcept(): array
    {
        return ['phone'];
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'invoice_ids' => 'array',
            'overdue_amount' => 'integer',
            'status' => ReminderStatus::class,
            'sent_at' => 'datetime',
        ];
    }
}
