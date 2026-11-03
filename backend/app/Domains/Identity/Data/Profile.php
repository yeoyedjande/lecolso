<?php

declare(strict_types=1);

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\User;

final readonly class Profile
{
    /**
     * @param  list<SchoolMembership>  $schools
     */
    public function __construct(
        public User $user,
        public array $schools,
    ) {}
}
