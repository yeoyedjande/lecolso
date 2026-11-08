<?php

declare(strict_types=1);

namespace App\Domains\Students\Events;

use Illuminate\Foundation\Events\Dispatchable;

/** Un élève vient d'être inscrit (identifiants seulement : aucune donnée de l'enfant dans l'événement). */
final readonly class StudentEnrolled
{
    use Dispatchable;

    public function __construct(
        public string $schoolId,
        public string $studentId,
        public string $enrollmentId,
    ) {}
}
