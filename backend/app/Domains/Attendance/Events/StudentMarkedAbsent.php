<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Events;

use Illuminate\Foundation\Events\Dispatchable;

/**
 * Un élève a été noté absent (nouvelle absence d'un appel). Identifiants seulement : l'alerte du parent (SMS) s'y
 * branchera quand un fournisseur sera choisi (lot 10) ; l'absence est déjà visible dans l'espace parent.
 */
final readonly class StudentMarkedAbsent
{
    use Dispatchable;

    public function __construct(
        public string $schoolId,
        public string $studentId,
        public string $date,
    ) {}
}
