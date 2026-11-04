<?php

declare(strict_types=1);

namespace App\Domains\Identity\Models;

use App\Domains\Academic\Models\Cycle;
use App\Domains\Identity\Enums\Role;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Database\Factories\RoleAssignmentFactory;
use Illuminate\Database\Eloquent\Builder;
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
    use Auditable;
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

    /**
     * Toutes les affectations d'un utilisateur, dans toutes ses écoles (/me, « se souvenir de moi »).
     *
     * Seule exception au scope « école courante » (test d'architecture) : justifiée, car la RLS
     * (politique own_assignments_select) ne laisse lire hors de l'école courante que les lignes de
     * l'utilisateur courant (app.user_id), posé par le fournisseur d'utilisateurs à l'authentification.
     *
     * @return Builder<RoleAssignment>
     */
    public static function ofUser(User $user): Builder
    {
        return self::query()->withoutGlobalScope('school')->where('user_id', $user->id);
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
