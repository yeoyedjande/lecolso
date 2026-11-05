<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Enums\FeeBilling;
use App\Domains\Billing\Models\FeeType;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\TenantContext;
use Illuminate\Contracts\Config\Repository as Config;

/**
 * Crée dans une école les types de frais du catalogue (config/billing.php). Idempotent : un type déjà présent
 * (même code) est laissé tel quel. Appelée à la création d'une école et par le seeder de démonstration.
 */
final readonly class ProvisionFeeTypes
{
    public function __construct(
        private TenantContext $context,
        private Config $config,
    ) {}

    public function handle(School $school): void
    {
        /** @var array<string, array{name: string, billing: string, optional: bool}> $catalog */
        $catalog = $this->config->array('billing.fee_types');

        $this->context->run($school, static function () use ($catalog, $school): void {
            $position = 0;
            foreach ($catalog as $code => $type) {
                // Filtre explicite sur l'école : le scope « école courante » ne s'applique pas dans Platform::run
                FeeType::query()->where('school_id', $school->id)->firstOrCreate(['code' => $code], [
                    'name' => $type['name'],
                    'billing' => FeeBilling::from($type['billing']),
                    'is_optional' => $type['optional'],
                    'position' => $position,
                ]);
                $position++;
            }
        });
    }
}
