<?php

declare(strict_types=1);

use App\Providers\AppServiceProvider;
use App\Providers\BillingServiceProvider;
use App\Providers\HorizonServiceProvider;
use App\Providers\IdentityServiceProvider;
use App\Providers\TenancyServiceProvider;

return [
    AppServiceProvider::class,
    HorizonServiceProvider::class,
    TenancyServiceProvider::class,
    IdentityServiceProvider::class,
    BillingServiceProvider::class,
];
