<?php

declare(strict_types=1);

namespace App\Domains\Grading\Support;

use Illuminate\Contracts\Config\Repository as Config;
use Illuminate\Contracts\Routing\UrlGenerator;
use Illuminate\Support\Carbon;

/**
 * Bulletin PDF dans le stockage privé (`report-cards/{uuid aléatoire}.pdf`, sans identifiant d'école ni nom d'élève)
 * et son URL de lecture : signée par l'API, valable 10 minutes, mise seulement dans les réponses destinées à qui voit
 * la classe ; servie par GET /files/report-cards/{fichier}.
 */
final readonly class ReportCardFile
{
    public const int TTL_MINUTES = 10;

    public const string DIRECTORY = 'report-cards';

    public function __construct(
        private UrlGenerator $url,
        private Config $config,
    ) {}

    public static function path(string $file): string
    {
        return self::DIRECTORY.'/'.$file;
    }

    public function url(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        $relative = $this->url->temporarySignedRoute(
            'files.report-card',
            Carbon::now()->addMinutes(self::TTL_MINUTES),
            ['file' => basename($path)],
            absolute: false,
        );

        return rtrim($this->config->string('app.url'), '/').$relative;
    }
}
