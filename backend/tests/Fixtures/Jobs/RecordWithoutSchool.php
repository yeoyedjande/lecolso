<?php

declare(strict_types=1);

namespace Tests\Fixtures\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

/** Job sans école : il ne doit hériter d'aucun contexte du job précédent. */
final class RecordWithoutSchool implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public function __construct(public string $label) {}

    public function handle(): void
    {
        QueueProbe::record($this->label);
    }
}
