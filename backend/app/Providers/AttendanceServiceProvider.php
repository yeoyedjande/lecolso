<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domains\Attendance\Models\AbsenceJustification;
use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Models\PlannedAbsence;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/** Présences : paramètres de route (sous la RLS de l'école courante). */
final class AttendanceServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::model('mark', AttendanceMark::class);
        Route::model('justification', AbsenceJustification::class);
        Route::model('plannedAbsence', PlannedAbsence::class);
    }
}
