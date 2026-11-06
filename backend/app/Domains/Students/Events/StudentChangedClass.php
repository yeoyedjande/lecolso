<?php

declare(strict_types=1);

namespace App\Domains\Students\Events;

use Illuminate\Foundation\Events\Dispatchable;

/** Un élève a changé de classe dans la même année (identifiants seulement : aucune donnée de l'enfant). */
final readonly class StudentChangedClass
{
    use Dispatchable;

    public function __construct(
        public string $schoolId,
        public string $studentId,
        public string $enrollmentId,
    ) {}
}
