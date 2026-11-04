<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Data;

use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;

/**
 * École créée, avec son directeur. $provisionalPassword : mot de passe provisoire d'un compte créé pour l'occasion,
 * renvoyé une seule fois (null si le directeur avait déjà un compte : il garde son mot de passe).
 */
final readonly class CreatedSchool
{
    public function __construct(
        public School $school,
        public User $director,
        public ?string $provisionalPassword,
    ) {}
}
