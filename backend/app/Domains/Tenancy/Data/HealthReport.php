<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Data;

use App\Domains\Tenancy\Enums\ComponentStatus;

/**
 * État des dépendances de l'API. Ne contient volontairement aucun détail d'erreur :
 * la route /health est publique (healthcheck Railway).
 */
final readonly class HealthReport
{
    public function __construct(
        public ComponentStatus $database,
        public ComponentStatus $redis,
    ) {}

    public function isHealthy(): bool
    {
        return $this->database === ComponentStatus::Ok
            && $this->redis === ComponentStatus::Ok;
    }

    public function status(): ComponentStatus
    {
        return $this->isHealthy() ? ComponentStatus::Ok : ComponentStatus::Error;
    }
}
