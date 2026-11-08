<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Domains\Billing\Enums\ReceiptFileStatus;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Reçu PDF d'un paiement (version normale, ou « ANNULÉ » après une annulation), dans le stockage privé.
 *
 * @property string $id
 * @property string $school_id
 * @property string $payment_id
 * @property bool $cancelled
 * @property ReceiptFileStatus $status
 * @property string|null $path
 * @property Carbon|null $rendered_at
 * @property Carbon $updated_at
 */
final class ReceiptFile extends Model
{
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['payment_id', 'cancelled', 'status', 'path', 'rendered_at'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cancelled' => 'boolean',
            'status' => ReceiptFileStatus::class,
            'rendered_at' => 'datetime',
        ];
    }
}
