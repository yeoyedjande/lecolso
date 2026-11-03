<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Contracts;

/**
 * Envoi de SMS (notifications futures : absences, relances…). Toujours appelé depuis un job en file.
 * Implémentations : FakeSmsSender (local, tests) ; fournisseur réel à choisir avant la production.
 */
interface SmsSender
{
    /**
     * @param  string  $to  numéro E.164 (+225…)
     */
    public function send(string $to, string $message): void;
}
