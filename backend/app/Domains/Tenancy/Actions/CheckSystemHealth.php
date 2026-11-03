<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Actions;

use App\Domains\Tenancy\Data\HealthReport;
use App\Domains\Tenancy\Enums\ComponentStatus;
use Illuminate\Database\DatabaseManager;
use Illuminate\Redis\RedisManager;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Vérifie que la base PostgreSQL et Redis répondent.
 */
final readonly class CheckSystemHealth
{
    public function __construct(
        private DatabaseManager $database,
        private RedisManager $redis,
    ) {}

    public function handle(): HealthReport
    {
        return new HealthReport(
            database: $this->probe('database', function (): void {
                // Requête sans table : aucune donnée métier n'est lue, la RLS n'est pas concernée.
                $this->database->connection()->select('select 1');
            }),
            redis: $this->probe('redis', function (): void {
                $this->redis->connection()->command('ping');
            }),
        );
    }

    /**
     * @param  callable(): void  $check
     */
    private function probe(string $component, callable $check): ComponentStatus
    {
        try {
            $check();

            return ComponentStatus::Ok;
        } catch (Throwable $exception) {
            // Seule la classe de l'exception est journalisée : le message peut contenir hôte ou identifiants.
            Log::warning('health.check_failed', [
                'component' => $component,
                'exception' => $exception::class,
            ]);

            return ComponentStatus::Error;
        }
    }
}
