<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Data\DashboardView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Tableau de bord de l'année en cours, dans les cycles de l'utilisateur : effectifs par cycle et, avec billing.view,
 * finances (FCFA) — sinon `finance` vaut null. `collection_rate` : part de l'échu à ce jour réellement réglée (%).
 *
 * @property-read DashboardView $resource
 */
final class DashboardResource extends JsonResource
{
    /**
     * @return array{today: string, academic_year_label: string|null, students: int, by_cycle: AnonymousResourceCollection<DashboardCycleResource>, finance: DashboardFinanceResource|null}
     */
    public function toArray(Request $request): array
    {
        $view = $this->resource;

        return [
            'today' => $view->today,
            'academic_year_label' => $view->yearLabel,
            'students' => (int) $view->students,
            'by_cycle' => DashboardCycleResource::collection($view->byCycle),
            'finance' => $view->finance === null ? null : new DashboardFinanceResource($view->finance),
        ];
    }
}
