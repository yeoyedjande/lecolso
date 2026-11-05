<?php

declare(strict_types=1);

namespace App\Domains\Students\Events;

use Illuminate\Foundation\Events\Dispatchable;

/** Le tuteur payeur d'un élève a changé, ou ses informations (identifiants seulement). */
final readonly class StudentPayerChanged
{
    use Dispatchable;

    public function __construct(
        public string $schoolId,
        public string $studentId,
    ) {}
}
