<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Data\ReceiptPdfView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Reçu PDF : `status` pending (rendu en cours : relire dans quelques secondes), ready (`url` signée, 10 minutes) ou
 * failed (relancer par POST). `cancelled` : version marquée « ANNULÉ ».
 *
 * @property-read ReceiptPdfView $resource
 */
final class ReceiptPdfResource extends JsonResource
{
    /**
     * @return array{status: string, cancelled: bool, url: string|null}
     */
    public function toArray(Request $request): array
    {
        return [
            'status' => $this->resource->status->value,
            'cancelled' => $this->resource->cancelled,
            'url' => $this->resource->url,
        ];
    }
}
