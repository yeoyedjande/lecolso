<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Domains\Billing\Enums\FeeBilling;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Type de frais de l'école (inscription, scolarité, cantine…), facturé en une fois ou réparti sur les échéances.
 *
 * @property string $id
 * @property string $school_id
 * @property string $code
 * @property string $name
 * @property FeeBilling $billing
 * @property bool $is_optional
 * @property int $position
 */
final class FeeType extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['code', 'name', 'billing', 'is_optional', 'position'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['billing' => FeeBilling::class, 'is_optional' => 'boolean', 'position' => 'integer'];
    }
}
