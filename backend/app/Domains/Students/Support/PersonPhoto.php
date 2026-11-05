<?php

declare(strict_types=1);

namespace App\Domains\Students\Support;

use Illuminate\Contracts\Config\Repository as Config;
use Illuminate\Contracts\Routing\UrlGenerator;
use Illuminate\Support\Carbon;

/**
 * Photo d'un élève ou d'un tuteur dans le stockage privé (`person-photos/{uuid aléatoire}.webp`) et son URL de
 * lecture : signée par l'API, valable 10 minutes, servie par GET /files/person-photos/{fichier}. L'URL n'est mise
 * que dans les réponses destinées à qui peut voir l'élève ; aucune page publique ne l'affiche.
 */
final readonly class PersonPhoto
{
    public const int TTL_MINUTES = 10;

    public const string DIRECTORY = 'person-photos';

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
            'files.person-photo',
            Carbon::now()->addMinutes(self::TTL_MINUTES),
            ['file' => basename($path)],
            absolute: false,
        );

        return rtrim($this->config->string('app.url'), '/').$relative;
    }
}
