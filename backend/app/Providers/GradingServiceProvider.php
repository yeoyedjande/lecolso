<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domains\Academic\Models\Level;
use App\Domains\Grading\Models\Assessment;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/** Notes : paramètres de route (sous la RLS de l'école courante). */
final class GradingServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::model('level', Level::class);
        Route::model('assessment', Assessment::class);
    }
}
