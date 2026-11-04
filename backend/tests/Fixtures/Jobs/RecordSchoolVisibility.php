<?php

declare(strict_types=1);

namespace Tests\Fixtures\Jobs;

use App\Support\Tenancy\RunsInSchool;
use App\Support\Tenancy\TenantAware;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use RuntimeException;

final class RecordSchoolVisibility implements ShouldQueue, TenantAware
{
    use Dispatchable, InteractsWithQueue, Queueable, RunsInSchool;

    public int $tries = 1;

    public function __construct(
        public string $schoolId,
        public string $label,
        public bool $fail = false,
    ) {}

    public function handle(): void
    {
        QueueProbe::record($this->label);

        if ($this->fail) {
            throw new RuntimeException('Échec simulé du job '.$this->label);
        }
    }
}
