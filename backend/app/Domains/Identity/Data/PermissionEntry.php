<?php

declare(strict_types=1);

namespace App\Domains\Identity\Data;

/** Une permission du catalogue (écran des rôles). */
final readonly class PermissionEntry
{
    public function __construct(
        public string $key,
        public string $group,
        public bool $staffAssignable,
    ) {}
}
