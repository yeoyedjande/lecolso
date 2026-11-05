<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Enums\DeparturePolicy;
use App\Domains\Billing\Support\FinancialPolicy;
use App\Domains\Tenancy\Actions\UpdateSchoolSettings;
use App\Domains\Tenancy\Models\School;

/** Politique financière de l'école (schools.settings, par l'Action du domaine Tenancy). Journalisée avec l'école. */
final readonly class SaveFinancialPolicy
{
    public function __construct(private UpdateSchoolSettings $settings) {}

    public function handle(School $school, DeparturePolicy $departure): DeparturePolicy
    {
        $this->settings->handle($school, [FinancialPolicy::DEPARTURE_KEY => $departure->value]);

        return $departure;
    }
}
