<?php

declare(strict_types=1);

use App\Support\Tenancy\TenantContext;
use Illuminate\Queue\Worker;
use Illuminate\Queue\WorkerOptions;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;
use Tests\Fixtures\Jobs\QueueProbe;
use Tests\Fixtures\Jobs\RecordSchoolVisibility;
use Tests\Fixtures\Jobs\RecordWithoutSchool;

/*
| Worker Horizon (processus long) simulé : un seul Worker, une seule connexion PostgreSQL, des jobs
| de plusieurs écoles enchaînés sur une vraie file Redis. Aucun contexte ne doit passer d'un job au suivant.
*/

/**
 * Exécute $count jobs de $queue sur un même Worker, puis vide la file.
 */
function workQueue(string $queue, int $count, ?Closure $betweenJobs = null): void
{
    $worker = app(Worker::class, ['isDownForMaintenance' => static fn (): bool => false]);
    $options = new WorkerOptions(name: 'test', sleep: 0, maxTries: 1);

    try {
        for ($i = 0; $i < $count; $i++) {
            if ($i > 0 && $betweenJobs !== null) {
                $betweenJobs();
            }
            $worker->runNextJob('redis', $queue, $options);
        }
    } finally {
        Redis::connection()->command('del', ['queues:'.$queue]);
    }
}

function testQueueName(): string
{
    return 'tenancy-test-'.Str::lower(Str::random(8));
}

it('enchaîne des jobs de deux écoles sur le même worker sans fuite de contexte', function (): void {
    QueueProbe::reset();
    $schoolA = makeSchool(['kindergarten']);
    $schoolB = makeSchool(['primary']);
    $queue = testQueueName();

    RecordSchoolVisibility::dispatch($schoolA->id, 'école A')->onConnection('redis')->onQueue($queue);
    RecordSchoolVisibility::dispatch($schoolB->id, 'école B')->onConnection('redis')->onQueue($queue);
    RecordSchoolVisibility::dispatch($schoolA->id, 'école A en échec', true)->onConnection('redis')->onQueue($queue);
    RecordSchoolVisibility::dispatch($schoolB->id, 'école B après échec')->onConnection('redis')->onQueue($queue);
    RecordWithoutSchool::dispatch('sans école')->onConnection('redis')->onQueue($queue);

    workQueue($queue, 5);

    $byJob = QueueProbe::byJob();

    expect($byJob)->toHaveCount(5)
        ->and($byJob['école A'])->toMatchArray([
            'pg_school_id' => $schoolA->id,
            'raw_level_schools' => [$schoolA->id],
            'eloquent_levels' => 3,
        ])
        ->and($byJob['école B'])->toMatchArray([
            'pg_school_id' => $schoolB->id,
            'raw_level_schools' => [$schoolB->id],
            'eloquent_levels' => 6,
        ])
        ->and($byJob['école A en échec']['raw_level_schools'])->toBe([$schoolA->id])
        // Le job qui suit un échec voit sa propre école, et elle seule
        ->and($byJob['école B après échec'])->toMatchArray([
            'pg_school_id' => $schoolB->id,
            'raw_level_schools' => [$schoolB->id],
        ])
        // Le job sans école ne voit rien : mode fermé, aucun héritage du job précédent
        ->and($byJob['sans école'])->toMatchArray([
            'pg_school_id' => '',
            'pg_user_id' => '',
            'raw_level_schools' => [],
            'eloquent_levels' => 0,
        ])
        // Et rien ne reste après le dernier job
        ->and(app(TenantContext::class)->schoolId())->toBeNull();
});

it('efface un contexte laissé par erreur entre deux jobs', function (): void {
    QueueProbe::reset();
    $school = makeSchool(['primary']);
    $queue = testQueueName();

    RecordWithoutSchool::dispatch('avant')->onConnection('redis')->onQueue($queue);
    RecordWithoutSchool::dispatch('après')->onConnection('redis')->onQueue($queue);

    // Fuite simulée entre deux jobs (bogue d'un job qui pose un contexte sans le retirer) :
    // les écouteurs de file remettent tout à zéro avant le job suivant
    workQueue($queue, 2, static function () use ($school): void {
        app(TenantContext::class)->setSchool($school->id);
    });

    expect(QueueProbe::byJob()['après'] ?? null)->toMatchArray([
        'pg_school_id' => '',
        'raw_level_schools' => [],
    ]);
});
