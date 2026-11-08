<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Data;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Academic\Models\Cycle;

/** Publics qu'un utilisateur peut viser : toute l'école, des cycles, des classes de l'année en cours. */
final readonly class AnnouncementTargets
{
    /**
     * @param  array<int, Cycle>  $cycles
     * @param  array<int, Classroom>  $classrooms
     */
    public function __construct(
        public bool $school,
        public array $cycles,
        public array $classrooms,
    ) {}
}
