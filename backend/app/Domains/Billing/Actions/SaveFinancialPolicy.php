<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Data\FinancialPolicyView;
use App\Domains\Billing\Data\MobileMoneyFees;
use App\Domains\Billing\Enums\DeparturePolicy;
use App\Domains\Billing\Support\FinancialPolicy;
use App\Domains\Tenancy\Actions\UpdateSchoolSettings;
use App\Domains\Tenancy\Models\School;

/**
 * Politique financière de l'école (schools.settings, par l'Action du domaine Tenancy) : départs, frais Mobile Money.
 * Journalisée avec l'école.
 */
final readonly class SaveFinancialPolicy
{
    public function __construct(private UpdateSchoolSettings $settings) {}

    public function handle(School $school, ?DeparturePolicy $departure, ?MobileMoneyFees $mobileMoney): FinancialPolicyView
    {
        $changes = [];
        if ($departure !== null) {
            $changes[FinancialPolicy::DEPARTURE_KEY] = $departure->value;
        }
        if ($mobileMoney !== null) {
            $changes[FinancialPolicy::MOBILE_MONEY_KEY] = ['fee_payer' => $mobileMoney->payer->value, 'fee_rate_bps' => $mobileMoney->rateBps];
        }
        if ($changes !== []) {
            $this->settings->handle($school, $changes);
        }
        $school->refresh();

        return new FinancialPolicyView(FinancialPolicy::departure($school), FinancialPolicy::mobileMoney($school));
    }
}
