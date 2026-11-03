<?php

declare(strict_types=1);

namespace App\Support\Cycles\Enums;

/** Journal quotidien (repas, sieste, change) (paramètre du cycle). */
enum DailyLogMode: string
{
    /** Non utilisé */
    case None = 'none';

    /** Optionnel */
    case Optional = 'optional';

    /** Obligatoire */
    case Required = 'required';

}
