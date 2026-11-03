<?php

declare(strict_types=1);

namespace App\Domains\Identity\Models;

use App\Domains\Academic\Models\Cycle;
use App\Domains\Identity\Enums\Role;
use App\Models\User;
use App\Support\Tenancy\BelongsToSchool;
use Database\Factories\RoleAssignmentFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use InvalidArgumentException;

/**
 * Rôle d'un utilisateur dans une école, limité à un cycle si cycle_id est renseigné (nul = toute l'école).
 * Permissions et Authorizer : sprint 0, étape 4.
 *
 * @property string $id
 * @property string $school_id
 * @property string $user_id
 * @property Role $role
 * @property string|null $cycle_id
 */
final class RoleAssignment extends Model
{
    use BelongsToSchool;

    /** @use HasFactory<RoleAssignmentFactory> */
    use HasFactory;

    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['user_id', 'role', 'cycle_id'];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Cycle, $this>
     */
    public function cycle(): BelongsTo
    {
        return $this->belongsTo(Cycle::class);
    }

    protected static function booted(): void
    {
        self::saving(static function (RoleAssignment $assignment): void {
            if (! $assignment->role->isAssignableToSchool()) {
                throw new InvalidArgumentException('super_admin n’est pas une affectation d’école (voir users.is_super_admin).');
            }
        });
    }

    protected static function newFactory(): RoleAssignmentFactory
    {
        return RoleAssignmentFactory::new();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['role' => Role::class];
    }
}
