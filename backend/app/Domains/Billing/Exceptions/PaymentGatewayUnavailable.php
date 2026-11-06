<?php

declare(strict_types=1);

namespace App\Domains\Billing\Exceptions;

use RuntimeException;

/** Prestataire Mobile Money non configuré ou injoignable. */
final class PaymentGatewayUnavailable extends RuntimeException {}
