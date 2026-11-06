<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domains\Academic\Models\Level;
use App\Domains\Grading\Models\Assessment;
use App\Domains\Grading\Models\ReportCard;
use App\Support\Pdf\FakePdfRenderer;
use App\Support\Pdf\GotenbergPdfRenderer;
use App\Support\Pdf\PdfRenderer;
use Illuminate\Contracts\Config\Repository as Config;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\Client\Factory as Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/** Notes et bulletins : rendu PDF, paramètres de route (sous la RLS de l'école courante). */
final class GradingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Production : toujours Gotenberg (refus explicite s'il n'est pas configuré) ; ailleurs Gotenberg s'il est
        // configuré (Docker local), sinon le rendu factice
        $this->app->singleton(PdfRenderer::class, static function (Application $app): PdfRenderer {
            $url = $app->make(Config::class)->string('services.gotenberg.url');

            return $app->environment('production') || $url !== ''
                ? new GotenbergPdfRenderer($app->make(Http::class), $url)
                : new FakePdfRenderer;
        });
    }

    public function boot(): void
    {
        Route::model('level', Level::class);
        Route::model('assessment', Assessment::class);
        Route::model('reportCard', ReportCard::class);
    }
}
