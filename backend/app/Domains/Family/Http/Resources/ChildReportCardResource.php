<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Resources;

use App\Domains\Grading\Models\ReportCard;
use App\Domains\Grading\Models\Term;
use App\Domains\Grading\Support\ReportCardFile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bulletin validé : période, date de validation et PDF (URL signée de 10 minutes).
 *
 * @property-read array{card: ReportCard, term: Term} $resource
 */
final class ChildReportCardResource extends JsonResource
{
    /**
     * @return array{id: string, term: string, validated_at: string, pdf_url: string|null}
     */
    public function toArray(Request $request): array
    {
        $card = $this->resource['card'];

        return [
            'id' => $card->id,
            'term' => $this->resource['term']->label,
            'validated_at' => $card->closure->closed_at->toIso8601String(),
            'pdf_url' => app(ReportCardFile::class)->url($card->path),
        ];
    }
}
