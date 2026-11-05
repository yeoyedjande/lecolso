<?php

declare(strict_types=1);

namespace App\Domains\Students\Events;

use Illuminate\Foundation\Events\Dispatchable;

/** Un élève parti est revenu : son inscription est de nouveau active. */
final readonly class StudentReturned
{
    use Dispatchable;

    public function __construct(
        public string $schoolId,
        public string $enrollmentId,
    ) {}
}
