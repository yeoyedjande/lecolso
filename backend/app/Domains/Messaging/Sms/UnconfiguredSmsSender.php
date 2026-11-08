<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Sms;

use App\Domains\Messaging\Contracts\SmsSender;
use RuntimeException;

/** Production sans fournisseur SMS : refus explicite plutôt qu'un envoi factice silencieux. */
final class UnconfiguredSmsSender implements SmsSender
{
    public function send(string $to, string $message): void
    {
        throw new RuntimeException('Aucun fournisseur SMS n’est configuré pour cet environnement.');
    }

    public function available(): bool
    {
        return false;
    }
}
