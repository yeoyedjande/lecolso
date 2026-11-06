<?php

declare(strict_types=1);

namespace App\Domains\Billing\Exceptions;

use RuntimeException;

/** Notification de paiement dont la signature est absente ou fausse : rejetée sans rien écrire. */
final class InvalidWebhookSignature extends RuntimeException {}
