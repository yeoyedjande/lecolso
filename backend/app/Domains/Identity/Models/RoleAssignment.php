<?php

declare(strict_types=1);

namespace App\Domains\Identity\Models;

use App\Domains\Academic\Models\Cycle;
use App\Domains\Identity\Enums\Role;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Database\Factories\RoleAssignmentFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Rôle d'un utilisateur dans une école, limité à un cycle si cycle_id est renseigné (nul = toute l'école).
 * $role : clé d'un rôle système (App\Domains\Identity\Enums\Role) ou identifiant d'un rôle personnalisé
 * de l'école (school_roles). Permissions : App\Domains\Identity\Authorization\Authorizer.
 *
 * @property string $id
 * @property string $school_id
 * @property string $user_id
 * @property string $role
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
     * Toutes les affectations actives d'un utilisateur, dans toutes ses écoles (/me, droits, « se souvenir de moi ») :
     * celles des écoles où son compte est désactivé (member_deactivations) sont exclues.
     *
     * Seule exception au scope « école courante » (test d'architecture) : justifiée, car la RLS
     * (politique own_assignments_select) ne laisse lire hors de l'école courante que les lignes de
     * l'utilisateur courant (app.user_id), posé par le fournisseur d'utilisateurs à l'authentification.
     *
     * @return Builder<RoleAssignment>
     */
    public static function ofUser(User $user): Builder
    {
        return self::query()->withoutGlobalScope('school')->where('user_id', $user->id)
            // Écoles où le compte est désactivé : aucune affectation active (ses propres lignes, visibles par la RLS)
            ->whereNotIn('school_id', MemberDeactivation::query()->withoutGlobalScope('school')
                ->where('user_id', $user->id)->select('school_id'));
    }

    protected static function booted(): void
    {
        self::saving(static function (RoleAssignment $assignment): void {
            $system = Role::tryFrom($assignment->role);

            if ($system !== null && ! $system->isAssignableToSchool()) {
                throw new InvalidArgumentException('super_admin n’est pas une affectation d’école (voir users.is_super_admin).');
            }

            // Rôle personnalisé : il doit exister dans l'école de l'affectation (école courante, scope + RLS) ;
            // verrou partagé : sa suppression (DeleteCustomRole, verrou exclusif) attend la fin de cette transaction
            if ($system === null && ! (Str::isUuid($assignment->role)
                && SchoolRole::query()->whereKey($assignment->role)->whereNull('system_key')->sharedLock()->exists())) {
                throw new InvalidArgumentException('Rôle inconnu dans cette école.');
            }
        });
    }

    protected static function newFactory(): RoleAssignmentFactory
    {
        return RoleAssignmentFactory::new();
    }

    /**
     * Accepte un rôle système (énumération) ou une clé de rôle ; stocké en texte.
     *
     * @return Attribute<string, Role|string>
     */
    protected function role(): Attribute
    {
        return Attribute::make(
            set: static fn (Role|string $value): string => $value instanceof Role ? $value->value : $value,
        );
    }
}
