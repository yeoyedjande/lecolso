<?php

declare(strict_types=1);

namespace App\Support\Images;

use InvalidArgumentException;

/** Fichier qui n'est pas une image lisible (JPEG, PNG ou WebP). */
final class InvalidImage extends InvalidArgumentException {}
