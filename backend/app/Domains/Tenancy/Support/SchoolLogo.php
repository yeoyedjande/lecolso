<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Support;

use Illuminate\Contracts\Config\Repository as Config;
use Illuminate\Contracts\Routing\UrlGenerator;
use Illuminate\Support\Carbon;

/**
 * Logo d'une école dans le stockage privé (school-logos/{uuid aléatoire}.webp, sans identifiant d'école : l'URL
 * apparaît sur la page publique) et son URL de lecture : signée par l'API, valable 30 minutes, servie par
 * GET /files/school-logos/{fichier}.
 * Signature relative (chemin et paramètres seulement) : valable derrière le proxy Caddy comme en local ;
 * préfixée par APP_URL, la même origine que l'application en staging et en production.
 */
final readonly class SchoolLogo
{
    public const int TTL_MINUTES = 30;

    public function __construct(
        private UrlGenerator $url,
        private Config $config,
    ) {}

    public const string DIRECTORY = 'school-logos';

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
            'files.school-logo',
            Carbon::now()->addMinutes(self::TTL_MINUTES),
            ['file' => basename($path)],
            absolute: false,
        );

        return rtrim($this->config->string('app.url'), '/').$relative;
    }
}
