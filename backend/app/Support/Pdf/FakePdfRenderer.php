<?php

declare(strict_types=1);

namespace App\Support\Pdf;

/**
 * Rendu factice (tests, local sans Gotenberg) : un PDF minimal valide, et le HTML reçu gardé pour les assertions.
 * Le HTML n'est jamais journalisé (données d'élèves).
 */
final class FakePdfRenderer implements PdfRenderer
{
    /** @var list<string> */
    public array $rendered = [];

    public bool $failing = false;

    public function render(string $html): string
    {
        if ($this->failing) {
            throw new PdfRenderingFailed('Rendu PDF factice en échec.');
        }
        $this->rendered[] = $html;

        return "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [] /Count 0 >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n";
    }
}
