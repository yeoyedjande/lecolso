<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Data\CashDeskView;
use App\Domains\Billing\Models\CashSession;
use App\Domains\Billing\Support\CashRegister;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Caisse d'un jour : sessions visibles (la sienne d'abord), total net de la journée (FCFA), `all_cashiers` : vrai si
 * l'utilisateur voit toutes les caisses de l'école.
 *
 * @property-read CashDeskView $resource
 */
final class CashDeskResource extends JsonResource
{
    /**
     * @return array{date: string, all_cashiers: bool, net_total: int, sessions: AnonymousResourceCollection<CashSessionResource>}
     */
    public function toArray(Request $request): array
    {
        $view = $this->resource;
        $sessions = $view->sessions->map(static fn (CashSession $session): array => ['session' => $session, 'mine' => $session->cashier_id === $view->userId]);

        return [
            'date' => $view->date,
            'all_cashiers' => $view->allCashiers,
            'net_total' => (int) $view->sessions->sum(static fn (CashSession $session): int => CashRegister::totals($session)['net_total']),
            'sessions' => CashSessionResource::collection($sessions),
        ];
    }
}
