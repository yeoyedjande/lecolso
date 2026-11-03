<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Support\Timebox;

/** Timebox de test : note la durée minimale demandée sans attendre (les tests restent rapides). */
final class InstantTimebox extends Timebox
{
    /** @var list<int> */
    public array $durations = [];

    public function call(callable $callback, int $microseconds): mixed
    {
        $this->durations[] = $microseconds;

        return $callback($this);
    }
}
