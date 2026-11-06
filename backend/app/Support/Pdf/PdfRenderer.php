<?php

declare(strict_types=1);

namespace App\Support\Pdf;

/**
 * Rendu d'un document HTML (gabarit Blade) en PDF A4. Gotenberg en production et avec Docker en local,
 * FakePdfRenderer en test et sans Gotenberg configuré hors production.
 */
interface PdfRenderer
{
    /**
     * @return string octets du PDF
     *
     * @throws PdfRenderingFailed
     */
    public function render(string $html): string;
}
