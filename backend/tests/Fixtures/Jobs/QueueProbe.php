<?php

declare(strict_types=1);

namespace Tests\Fixtures\Jobs;

use App\Domains\Academic\Models\Level;
use Illuminate\Support\Facades\DB;

/**
 * Relevé de ce qu'un job voit sur le worker (même processus que le test).
 *
 * @phpstan-type Observation array{job: string, pg_school_id: mixed, pg_user_id: mixed, raw_level_schools: list<string>, eloquent_levels: int}
 */
final class QueueProbe
{
    /** @var list<Observation> */
    private static array $observations = [];

    public static function reset(): void
    {
        self::$observations = [];
    }

    /**
     * Relevés indexés par libellé de job.
     *
     * @return array<string, Observation>
     */
    public static function byJob(): array
    {
        return array_column(self::$observations, null, 'job');
    }

    public static function record(string $job): void
    {
        // SQL brut volontaire : on vérifie ce que la RLS laisse voir, indépendamment du scope Eloquent
        $schools = [];
        foreach (DB::select('select distinct school_id from levels order by school_id') as $row) {
            $schools[] = is_object($row) && isset($row->school_id) && is_string($row->school_id) ? $row->school_id : '?';
        }

        self::$observations[] = [
            'job' => $job,
            'pg_school_id' => DB::scalar("select current_setting('app.school_id', true)"),
            'pg_user_id' => DB::scalar("select current_setting('app.user_id', true)"),
            'raw_level_schools' => $schools,
            'eloquent_levels' => Level::query()->count(),
        ];
    }
}
