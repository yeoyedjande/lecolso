<?php

declare(strict_types=1);

namespace App\Domains\Academic\Actions;

use App\Domains\Academic\Models\Cycle;
use App\Domains\Tenancy\Models\School;
use App\Support\Cycles\CycleSettings;
use App\Support\Tenancy\TenantContext;
use Illuminate\Contracts\Config\Repository as Config;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Collection;
use InvalidArgumentException;

/**
 * Ouvre des cycles dans une école à partir du catalogue (config/cycles.php), avec leurs niveaux.
 * Idempotent : un cycle déjà présent (même code) est laissé tel quel.
 */
final readonly class ProvisionCycles
{
    public function __construct(
        private TenantContext $context,
        private DatabaseManager $db,
        private Config $config,
    ) {}

    /**
     * @param  list<string>|null  $codes  codes du catalogue ; null = tous les cycles du catalogue
     * @return Collection<int, Cycle> cycles de l'école, dans l'ordre du catalogue
     */
    public function handle(School $school, ?array $codes = null): Collection
    {
        $catalog = $this->catalog();
        $codes ??= array_keys($catalog);

        $unknown = array_diff($codes, array_keys($catalog));
        if ($unknown !== []) {
            throw new InvalidArgumentException('Cycles absents du catalogue : '.implode(', ', $unknown));
        }

        return $this->context->run($school, fn (): Collection => $this->db->connection(TenantContext::CONNECTION)
            ->transaction(function () use ($catalog, $codes, $school): Collection {
                $positions = array_flip(array_keys($catalog));

                foreach ($codes as $code) {
                    $entry = $catalog[$code];

                    // Filtre explicite sur l'école : le scope « école courante » ne s'applique pas dans
                    // Platform::run (seeders), où un autre établissement a des cycles de même code
                    $cycle = Cycle::query()->where('school_id', $school->id)->firstOrCreate(['code' => $code], [
                        'name' => $entry['name'],
                        'position' => $positions[$code],
                        'settings' => CycleSettings::fromArray($entry['settings']),
                    ]);

                    foreach ($entry['levels'] as $position => $level) {
                        $cycle->levels()->firstOrCreate(['code' => $level['code']], [
                            'name' => $level['name'],
                            'position' => $position,
                        ]);
                    }
                }

                return Cycle::query()->where('school_id', $school->id)->with('levels')->orderBy('position')->get();
            }));
    }

    /**
     * @return array<string, array{name: string, levels: list<array{code: string, name: string}>, settings: array<string, string>}>
     */
    private function catalog(): array
    {
        /** @var array<string, array{name: string, levels: list<array{code: string, name: string}>, settings: array<string, string>}> $catalog */
        $catalog = $this->config->array('cycles');

        return $catalog;
    }
}
