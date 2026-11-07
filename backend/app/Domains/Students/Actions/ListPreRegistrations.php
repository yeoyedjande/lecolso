<?php

declare(strict_types=1);

namespace App\Domains\Students\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Students\Enums\PreRegistrationStatus;
use App\Domains\Students\Models\PreRegistration;
use App\Domains\Students\Support\PreRegistrationAccess;
use Illuminate\Database\Eloquent\Collection;

/** Pré-inscriptions visibles par l'utilisateur (cycles où il a students.manage), les plus récentes d'abord. */
final readonly class ListPreRegistrations
{
    public const int LIMIT = 200;

    public function __construct(private PreRegistrationAccess $access) {}

    /**
     * @return Collection<int, PreRegistration>
     */
    public function handle(User $user, ?PreRegistrationStatus $status): Collection
    {
        return $this->access->constrain(PreRegistration::query(), $user)
            ->when($status !== null, static fn ($query) => $query->where('status', $status))
            ->with('level.cycle')
            ->orderByDesc('created_at')
            ->orderByDesc('reference')
            ->limit(self::LIMIT)
            ->get();
    }
}
