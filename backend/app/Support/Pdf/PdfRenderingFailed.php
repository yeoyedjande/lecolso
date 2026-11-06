<?php

declare(strict_types=1);

namespace App\Support\Pdf;

use RuntimeException;

/** Le service de rendu PDF n'a pas produit le document (indisponible, non configuré, refus). */
final class PdfRenderingFailed extends RuntimeException {}
