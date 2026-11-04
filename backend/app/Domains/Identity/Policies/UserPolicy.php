<?php

declare(strict_types=1);

namespace App\Domains\Identity\Policies;

use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Authorization\RoleCatalog;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Collection;

/**
 * Comptes de l'école courante (décisions du 04/11/2026, docs/decisions-metier.md) :
 * - périmètre : users.view / users.manage, dans la limite des cycles de l'acteur (une affectation de toute l'école
 *   exige la permission sur toute l'école) ;
 * - jamais son propre compte, jamais un super-admin ;
 * - hiérarchie : seul un promoteur touche un compte de promoteur, et attribue ou retire les rôles Promoteur et Direction ;
 * - pas d'élévation : on n'attribue un rôle que si l'on détient chacune de ses permissions sur le cycle visé
 *   (sauf le promoteur de toute l'école, autorité la plus haute, et les permissions propres aux parents).
 * Conséquence : le dernier compte qui gère les utilisateurs de toute l'école ne peut pas être retiré par un autre
 * (il faudrait le détenir soi-même sur toute l'école, donc il en resterait un).
 */
final readonly class UserPolicy
{
    /** Rôles que seul un promoteur attribue, retire, ou dont il gère les titulaires (promoteur). */
    private const array PROMOTER_ONLY_ROLES = [Role::Promoter, Role::Director];

    public function __construct(
        private Authorizer $authorizer,
        private TenantContext $context,
        private RoleCatalog $catalog,
    ) {}

    /** Permissions qui donnent accès à la liste des comptes (pour les gérer, ou pour réinitialiser un mot de passe). */
    public const array VIEW_PERMISSIONS = ['users.view', 'users.reset_password'];

    /** Liste des comptes de l'école : users.view ou users.reset_password, même limité à un cycle (liste filtrée). */
    public function viewAny(User $actor): bool
    {
        $schoolId = $this->context->schoolId();

        if ($schoolId === null) {
            return false;
        }

        $permissions = $this->authorizer->permissionsFor($actor, $schoolId);

        return array_intersect(self::VIEW_PERMISSIONS, array_keys($permissions)) !== [];
    }

    /** Fiche d'un compte : l'une de ces permissions sur au moins un cycle de ses affectations (ou toute l'école). */
    public function view(User $actor, User $target): bool
    {
        $schoolId = $this->context->schoolId();

        if ($schoolId === null) {
            return false;
        }

        if ($actor->id === $target->id) {
            return $this->viewAny($actor);
        }

        return $this->targetAssignments($target)->contains(function (RoleAssignment $assignment) use ($actor, $schoolId): bool {
            foreach (self::VIEW_PERMISSIONS as $permission) {
                if ($this->authorizer->allows($actor, $permission, $schoolId, $assignment->cycle_id)) {
                    return true;
                }
            }

            return false;
        });
    }

    /** Créer un compte : users.manage (au moins sur un cycle) ; chaque rôle attribué est vérifié par grantRole. */
    public function create(User $actor): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null && array_key_exists('users.manage', $this->authorizer->permissionsFor($actor, $schoolId));
    }

    /**
     * Modifier, désactiver, réactiver ou supprimer un compte de l'école : users.manage sur chacune de ses affectations,
     * jamais soi-même ni un super-admin ; un compte de promoteur seulement par un promoteur.
     */
    public function manage(User $actor, User $target): bool
    {
        $schoolId = $this->context->schoolId();

        if ($schoolId === null || $actor->id === $target->id || $target->isSuperAdmin()) {
            return false;
        }

        $assignments = $this->targetAssignments($target);

        if ($assignments->isEmpty()) {
            return false;
        }

        if ($assignments->contains(static fn (RoleAssignment $assignment): bool => $assignment->role === Role::Promoter->value)
            && ! $this->isPromoter($actor, $schoolId)) {
            return false;
        }

        return $assignments->every(fn (RoleAssignment $assignment): bool => $this->authorizer
            ->allows($actor, 'users.manage', $schoolId, $assignment->cycle_id));
    }

    /**
     * Attribuer le rôle $role (clé système ou rôle personnalisé), sur $cycleId (null = toute l'école), à un compte
     * (existant, ou en création : $target null). Le rôle doit exister dans l'école (sinon refus ; la validation
     * renvoie le message).
     */
    public function grantRole(User $actor, ?User $target, string $role, ?string $cycleId): bool
    {
        $schoolId = $this->context->schoolId();

        if ($schoolId === null || ($target !== null && ($actor->id === $target->id || $target->isSuperAdmin()))) {
            return false;
        }

        if (! $this->authorizer->allows($actor, 'users.manage', $schoolId, $cycleId)) {
            return false;
        }

        if ($this->isPromoterOnly($role) && ! $this->isPromoter($actor, $schoolId)) {
            return false;
        }

        // Compte existant : un promoteur ne se gère que par un promoteur
        if ($target !== null && $this->targetAssignments($target)->isNotEmpty() && ! $this->manage($actor, $target)) {
            return false;
        }

        $effective = $this->catalog->rolesOf($schoolId)[$role] ?? null;

        // Rôle inconnu : la validation (422) l'explique. Le promoteur, autorité la plus haute de l'école, attribue
        // tout rôle (la direction a des permissions de gestion courante qu'il n'a pas, comme valider les bulletins)
        if ($effective === null || $this->isPromoter($actor, $schoolId)) {
            return true;
        }

        // Pas d'élévation : chaque permission du rôle, sur ce cycle

        foreach ($effective->permissions as $permission) {
            // Permissions propres aux parents (payer, justifier pour SES enfants) : aucun membre du personnel ne les
            // détient, elles n'élèvent pas les droits de qui attribue le rôle Parent
            if ($this->catalog->isGuardianOnly($permission)) {
                continue;
            }

            if (! $this->authorizer->allows($actor, $permission, $schoolId, $cycleId)) {
                return false;
            }
        }

        return true;
    }

    /** Retirer une affectation : users.manage sur son cycle ; Promoteur et Direction par un promoteur seulement. */
    public function revokeRole(User $actor, User $target, RoleAssignment $assignment): bool
    {
        $schoolId = $this->context->schoolId();

        if ($schoolId === null || $assignment->user_id !== $target->id || ! $this->manage($actor, $target)) {
            return false;
        }

        return ! $this->isPromoterOnly($assignment->role) || $this->isPromoter($actor, $schoolId);
    }

    /**
     * Réinitialiser le mot de passe de $target dans l'école courante.
     *
     * - permission users.reset_password (directeur, secrétaire) ;
     * - jamais son propre compte (POST /auth/password) ni un super-admin ; un promoteur seulement par un promoteur ;
     * - $target doit avoir une affectation dans l'école courante, et chacune de ses affectations doit être
     *   couverte par les cycles de l'acteur (un rôle limité à la maternelle ne touche pas un compte du primaire
     *   ni un compte de toute l'école).
     */
    public function resetPassword(User $actor, User $target): bool
    {
        $schoolId = $this->context->schoolId();

        if ($schoolId === null || $actor->id === $target->id || $target->isSuperAdmin()) {
            return false;
        }

        $targetAssignments = RoleAssignment::query()->where('user_id', $target->id)->get();

        if ($targetAssignments->isEmpty()) {
            return false;
        }

        // Hiérarchie : le mot de passe d'un promoteur ne se réinitialise que par un promoteur
        if ($targetAssignments->contains(static fn (RoleAssignment $assignment): bool => $assignment->role === Role::Promoter->value)
            && ! $this->isPromoter($actor, $schoolId)) {
            return false;
        }

        return $targetAssignments->every(fn (RoleAssignment $assignment): bool => $this->authorizer->allows(
            $actor,
            'users.reset_password',
            $schoolId,
            $assignment->cycle_id,
        ));
    }

    /**
     * Affectations du compte dans l'école courante, y compris s'il y est désactivé.
     *
     * @return Collection<int, RoleAssignment>
     */
    private function targetAssignments(User $target): Collection
    {
        return RoleAssignment::query()->where('user_id', $target->id)->get()->toBase();
    }

    private function isPromoterOnly(string $role): bool
    {
        return in_array(Role::tryFrom($role), self::PROMOTER_ONLY_ROLES, true);
    }

    private function isPromoter(User $actor, string $schoolId): bool
    {
        return $this->authorizer->assignments($actor, $schoolId)->contains(
            static fn (RoleAssignment $assignment): bool => $assignment->role === Role::Promoter->value && $assignment->cycle_id === null,
        );
    }
}
