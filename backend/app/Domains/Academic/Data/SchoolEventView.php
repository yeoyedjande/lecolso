<?php

declare(strict_types=1);

namespace App\Domains\Academic\Data;

use App\Domains\Academic\Models\SchoolEvent;

/** Événement vu par un utilisateur : droit de le modifier. */
final readonly class SchoolEventView
{
    public function __construct(
        public SchoolEvent $event,
        public bool $canManage,
    ) {}
}
