<?php

declare(strict_types=1);

namespace App\Support\Cycles\Enums;

/** Mode de présence (paramètre du cycle). */
enum AttendanceMode: string
{
    /** Appel journalier */
    case RollCall = 'roll_call';

    /** Arrivée et départ horodatés */
    case CheckInOut = 'check_in_out';

}
