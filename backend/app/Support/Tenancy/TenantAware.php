<?php

declare(strict_types=1);

namespace App\Support\Tenancy;

/** Job exécuté dans le contexte d'une école : le middleware SetTenantContext le rétablit sur le worker. */
interface TenantAware
{
    public function schoolId(): string;
}
