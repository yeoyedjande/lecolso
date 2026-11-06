<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use Illuminate\Contracts\Config\Repository as Config;
use Illuminate\Contracts\Routing\UrlGenerator;
use Illuminate\Support\Carbon;

/**
 * Reçu PDF dans le stockage privé (`receipts/{uuid aléatoire}.pdf`, sans identifiant d'école, de payeur ni d'élève)
 * et son URL de lecture : signée par l'API, valable 10 minutes, mise seulement dans les réponses destinées à qui voit
 * la facture ; servie par GET /files/receipts/{fichier}.
 */
final readonly class ReceiptPdf
{
    public const int TTL_MINUTES = 10;

    public const string DIRECTORY = 'receipts';

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
            'files.receipt',
            Carbon::now()->addMinutes(self::TTL_MINUTES),
            ['file' => basename($path)],
            absolute: false,
        );

        return rtrim($this->config->string('app.url'), '/').$relative;
    }
}
