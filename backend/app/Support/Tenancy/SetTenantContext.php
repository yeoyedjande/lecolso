<?php

declare(strict_types=1);

namespace App\Support\Tenancy;

use Closure;
use LogicException;

/**
 * Middleware de job : rétablit l'école du job (TenantAware) le temps de son exécution, puis remet à zéro.
 * Les écouteurs de file (TenancyServiceProvider) remettent aussi le contexte à zéro avant et après chaque job.
 */
final readonly class SetTenantContext
{
    public function __construct(private TenantContext $context) {}

    public function handle(object $job, Closure $next): mixed
    {
        if (! $job instanceof TenantAware) {
            throw new LogicException(sprintf('%s doit implémenter %s.', $job::class, TenantAware::class));
        }

        return $this->context->run($job->schoolId(), static fn (): mixed => $next($job));
    }
}
