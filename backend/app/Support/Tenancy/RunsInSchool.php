<?php

declare(strict_types=1);

namespace App\Support\Tenancy;

/**
 * Pour les jobs TenantAware : branche le middleware SetTenantContext.
 * Le job déclare une propriété publique $schoolId (sérialisée avec le job).
 */
trait RunsInSchool
{
    public function schoolId(): string
    {
        return $this->schoolId;
    }

    /**
     * @return list<object>
     */
    public function middleware(): array
    {
        return [app(SetTenantContext::class)];
    }
}
