<?php

declare(strict_types=1);

namespace App\Support\Pdf;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory as Http;

/**
 * Gotenberg (conteneur, réseau privé) : POST /forms/chromium/convert/html avec le document en `index.html`, A4,
 * marges de 1 cm, fonds imprimés. Le HTML est autonome (styles et images en ligne) : Gotenberg ne charge rien d'autre.
 */
final readonly class GotenbergPdfRenderer implements PdfRenderer
{
    public function __construct(
        private Http $http,
        private string $url,
    ) {}

    public function render(string $html): string
    {
        if ($this->url === '') {
            throw new PdfRenderingFailed('Aucun service de rendu PDF n’est configuré (GOTENBERG_URL).');
        }

        try {
            $response = $this->http->timeout(30)
                ->attach('files', $html, 'index.html')
                ->post(rtrim($this->url, '/').'/forms/chromium/convert/html', [
                    'paperWidth' => '8.27',
                    'paperHeight' => '11.7',
                    'marginTop' => '0.4',
                    'marginBottom' => '0.4',
                    'marginLeft' => '0.4',
                    'marginRight' => '0.4',
                    'printBackground' => 'true',
                ]);
        } catch (ConnectionException $exception) {
            throw new PdfRenderingFailed('Service de rendu PDF injoignable.', previous: $exception);
        }

        if (! $response->successful() || ! str_starts_with($response->body(), '%PDF')) {
            throw new PdfRenderingFailed('Le service de rendu PDF a refusé le document ('.$response->status().').');
        }

        return $response->body();
    }
}
