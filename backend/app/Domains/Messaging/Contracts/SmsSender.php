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

    /**
     * Un fournisseur est configuré : un SMS peut réellement partir. Faux en production tant qu'aucun fournisseur
     * n'est choisi : l'interface ne promet alors aucun SMS et les envois ne sont pas proposés.
     */
    public function available(): bool;
}
