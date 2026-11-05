<?php

declare(strict_types=1);

namespace App\Domains\Students\Events;

use Illuminate\Foundation\Events\Dispatchable;

/** Un élève est parti en cours d'année (inscription, date de départ et motif sur l'inscription). */
final readonly class StudentLeft
{
    use Dispatchable;

    public function __construct(
        public string $schoolId,
        public string $enrollmentId,
    ) {}
}
