<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Data\SchoolUser;
use App\Domains\Identity\Models\MemberDeactivation;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * Comptes de l'école courante, par nom, avec filtres ; un acteur limité à des cycles ne voit que les comptes
 * affectés à l'un de ses cycles. Pagination par curseur.
 */
final readonly class ListSchoolUsers
{
    public const int PER_PAGE = 25;

    public function __construct(
        private Authorizer $authorizer,
        private PresentSchoolUser $present,
    ) {}

    /**
     * @param  'all'|'active'|'deactivated'  $status
     * @return CursorPaginator<int, SchoolUser>
     */
    public function handle(
        User $actor,
        School $school,
        ?string $search,
        ?string $role,
        ?string $cycleId,
        string $status,
    ): CursorPaginator {
        // users.view : null = toute l'école, sinon les cycles de l'acteur (absente : rien, la Policy l'a déjà refusé)
        $permissions = $this->authorizer->permissionsFor($actor, $school);
        $members = RoleAssignment::query()->select('user_id');

        if (! array_key_exists('users.view', $permissions)) {
            $members->whereRaw('false');
        } elseif ($permissions['users.view'] !== null) {
            $members->whereIn('cycle_id', $permissions['users.view']);
        }

        $query = User::query()->whereIn('id', $members);

        if ($role !== null) {
            $query->whereIn('id', RoleAssignment::query()->select('user_id')->where('role', $role));
        }

        if ($cycleId !== null) {
            $query->whereIn('id', RoleAssignment::query()->select('user_id')->where('cycle_id', $cycleId));
        }

        if ($status !== 'all') {
            $deactivated = MemberDeactivation::query()->select('user_id');
            $status === 'deactivated' ? $query->whereIn('id', $deactivated) : $query->whereNotIn('id', $deactivated);
        }

        if ($search !== null && $search !== '') {
            $like = '%'.addcslashes(mb_strtolower($search), '%_\\').'%';
            $digits = preg_replace('/\D+/', '', $search) ?? '';
            $query->where(static function (Builder $where) use ($like, $digits): void {
                $where->whereRaw('lower(name) like ?', [$like])->orWhereRaw('lower(email) like ?', [$like]);
                if (strlen($digits) >= 4) {
                    $where->orWhere('phone', 'like', '%'.$digits.'%');
                }
            });
        }

        $page = $query->orderBy('name')->orderBy('id')->cursorPaginate(self::PER_PAGE);
        $present = $this->present->many($actor, $school, array_values($page->items()));

        return $page->setCollection(collect($present));
    }
}
