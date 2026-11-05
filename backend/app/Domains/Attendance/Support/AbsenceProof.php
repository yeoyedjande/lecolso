<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Support;

use Illuminate\Contracts\Config\Repository as Config;
use Illuminate\Contracts\Routing\UrlGenerator;
use Illuminate\Support\Carbon;

/**
 * Photo d'un justificatif d'absence (certificat) dans le stockage privé (`absence-proofs/{uuid}.webp`) et son URL
 * signée de 10 minutes, servie par GET /files/absence-proofs/{fichier}, donnée seulement à qui peut décider ou au
 * parent qui l'a envoyée.
 */
final readonly class AbsenceProof
{
    public const int TTL_MINUTES = 10;

    public const string DIRECTORY = 'absence-proofs';

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
            'files.absence-proof',
            Carbon::now()->addMinutes(self::TTL_MINUTES),
            ['file' => basename($path)],
            absolute: false,
        );

        return rtrim($this->config->string('app.url'), '/').$relative;
    }
}
