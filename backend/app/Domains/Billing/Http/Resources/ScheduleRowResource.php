<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Data\ScheduleRow;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read ScheduleRow $resource
 */
final class ScheduleRowResource extends JsonResource
{
    /**
     * @return array{due_on: string, label: string, expected: int, invoices: int}
     */
    public function toArray(Request $request): array
    {
        return [
            'due_on' => $this->resource->dueOn,
            'label' => $this->resource->label,
            'expected' => $this->resource->expected,
            'invoices' => $this->resource->invoices,
        ];
    }
}
