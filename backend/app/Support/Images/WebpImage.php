<?php

declare(strict_types=1);

namespace App\Support\Images;

use GdImage;

/**
 * Normalise une image envoyée par un utilisateur avec GD (extension déjà présente, aucune dépendance) :
 * - décodage de l'image (JPEG, PNG ou WebP), refus de tout le reste ;
 * - réduction pour tenir dans un carré de $maxSide pixels (jamais d'agrandissement), transparence conservée ;
 * - réencodage en WebP : les métadonnées d'origine (EXIF, position GPS d'une photo prise au téléphone) disparaissent.
 */
final class WebpImage
{
    public const array ACCEPTED_TYPES = [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP];

    public static function fromBytes(string $bytes, int $maxSide = 512, int $quality = 85): string
    {
        $info = @getimagesizefromstring($bytes);

        if ($info === false || ! in_array($info[2], self::ACCEPTED_TYPES, true)) {
            throw new InvalidImage('Image illisible : envoyez un fichier JPEG, PNG ou WebP.');
        }

        $source = @imagecreatefromstring($bytes);

        if (! $source instanceof GdImage) {
            throw new InvalidImage('Image illisible : envoyez un fichier JPEG, PNG ou WebP.');
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $scale = min(1, $maxSide / max($width, $height));
        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));

        $target = imagecreatetruecolor($targetWidth, $targetHeight);
        imagealphablending($target, false);
        imagesavealpha($target, true);
        imagefill($target, 0, 0, (int) imagecolorallocatealpha($target, 0, 0, 0, 127));
        imagecopyresampled($target, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        ob_start();
        imagewebp($target, null, $quality);
        $webp = (string) ob_get_clean();

        if ($webp === '') {
            throw new InvalidImage('Conversion de l’image impossible.');
        }

        return $webp;
    }
}
