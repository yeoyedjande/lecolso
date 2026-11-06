<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

use App\Domains\Billing\Enums\ReceiptFileStatus;

/** Reçu PDF d'un paiement : état du rendu, version annulée ou non, URL signée (10 minutes) quand il est prêt. */
final readonly class ReceiptPdfView
{
    public function __construct(
        public ReceiptFileStatus $status,
        public bool $cancelled,
        public ?string $url,
    ) {}
}
