<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Contracts\PaymentGateway;
use App\Domains\Billing\Data\FinancialPolicyView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Politique financière de l'école. `departure` : cancel_unstarted (échéances des périodes non commencées annulées au
 * départ, par défaut) ou keep_all (toutes les échéances restent dues) ; `mobile_money` : qui paie les frais (school,
 * guardian) et leur taux en points de base ; `available` : un prestataire Mobile Money est configuré.
 *
 * @property-read FinancialPolicyView $resource
 */
final class FinancialPolicyResource extends JsonResource
{
    /**
     * @return array{departure: string, mobile_money: array{available: bool, fee_payer: string, fee_rate_bps: int}}
     */
    public function toArray(Request $request): array
    {
        return [
            'departure' => $this->resource->departure->value,
            'mobile_money' => [
                // Un prestataire est configuré : sinon, le paiement en ligne n'est pas proposé aux parents
                'available' => app(PaymentGateway::class)->name() !== 'none',
                'fee_payer' => $this->resource->mobileMoney->payer->value,
                'fee_rate_bps' => $this->resource->mobileMoney->rateBps,
            ],
        ];
    }
}
