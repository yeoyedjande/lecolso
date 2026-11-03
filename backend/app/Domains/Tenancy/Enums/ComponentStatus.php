<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Enums;

enum ComponentStatus: string
{
    case Ok = 'ok';
    case Error = 'error';
}
