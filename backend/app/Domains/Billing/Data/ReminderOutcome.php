<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

/** Résultat d'une demande de relance : SMS mis en file, payeurs écartés (relancés depuis moins de 7 jours, sans téléphone, plus en retard). */
final readonly class ReminderOutcome
{
    public function __construct(
        public int $queued,
        public int $recent,
        public int $noPhone,
        public int $notOverdue,
    ) {}
}
