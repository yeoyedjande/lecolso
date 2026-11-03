<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domains\Academic\Actions\ProvisionCycles;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\Platform;
use Illuminate\Database\Seeder;

/**
 * Ouvre garderie, maternelle et primaire (avec leurs niveaux) dans chaque école qui n'a encore aucun cycle.
 * Utilisé par les données de démo (sprint 0, étape 5). Idempotent.
 */
final class CycleSeeder extends Seeder
{
    public function run(ProvisionCycles $provisionCycles): void
    {
        // Liste de toutes les écoles : lecture super-admin explicite, hors contexte d'une école
        $schools = Platform::run(static fn () => School::query()->doesntHave('cycles')->get());

        foreach ($schools as $school) {
            $school->setConnection('pgsql');
            $provisionCycles->handle($school);
        }
    }
}
