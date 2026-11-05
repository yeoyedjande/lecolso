<?php

declare(strict_types=1);

use App\Support\Images\InvalidImage;
use App\Support\Images\WebpImage;

/** Image PNG de test (avec transparence), en octets. */
function pngBytes(int $width, int $height): string
{
    $image = imagecreatetruecolor(max(1, $width), max(1, $height));
    imagesavealpha($image, true);
    imagefill($image, 0, 0, (int) imagecolorallocatealpha($image, 0, 0, 0, 127));
    imagefilledrectangle($image, 0, 0, intdiv($width, 2), intdiv($height, 2), (int) imagecolorallocate($image, 240, 140, 40));
    ob_start();
    imagepng($image);

    return (string) ob_get_clean();
}

it('réduit une grande image à 512 px au plus en WebP, proportions et transparence conservées', function (): void {
    $webp = WebpImage::fromBytes(pngBytes(1600, 800));
    $info = getimagesizefromstring($webp);
    \assert($info !== false);

    expect($info[2])->toBe(IMAGETYPE_WEBP)
        ->and([$info[0], $info[1]])->toBe([512, 256]);

    $decoded = imagecreatefromstring($webp);
    \assert($decoded instanceof GdImage);
    // Coin bas-droit transparent
    $alpha = (imagecolorat($decoded, 500, 250) >> 24) & 0x7F;
    expect($alpha)->toBeGreaterThan(100);
});

it('n’agrandit jamais une petite image', function (): void {
    $info = getimagesizefromstring(WebpImage::fromBytes(pngBytes(120, 80)));
    \assert($info !== false);

    expect([$info[0], $info[1]])->toBe([120, 80]);
});

it('refuse ce qui n’est pas une image JPEG, PNG ou WebP', function (string $bytes): void {
    expect(static fn () => WebpImage::fromBytes($bytes))->toThrow(InvalidImage::class);
})->with([
    'texte' => ['<?php echo "pas une image";'],
    'SVG' => ['<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'],
    'GIF' => [base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', true) ?: ''],
]);

/** JPEG de test avec une orientation EXIF (segment APP1 minimal : une seule balise Orientation). */
function jpegWithOrientation(int $width, int $height, int $orientation): string
{
    $image = imagecreatetruecolor(max(1, $width), max(1, $height));
    imagefilledrectangle($image, 0, 0, intdiv($width, 2), $height, (int) imagecolorallocate($image, 240, 140, 40));
    ob_start();
    imagejpeg($image);
    $jpeg = (string) ob_get_clean();

    $tiff = "MM\x00\x2A\x00\x00\x00\x08".pack('n', 1).pack('nnN', 0x0112, 3, 1).pack('nn', $orientation, 0).pack('N', 0);
    $app1 = "Exif\x00\x00".$tiff;

    return substr($jpeg, 0, 2)."\xFF\xE1".pack('n', strlen($app1) + 2).$app1.substr($jpeg, 2);
}

it('redresse une photo de téléphone selon son orientation EXIF', function (int $orientation, array $size): void {
    $info = getimagesizefromstring(WebpImage::fromBytes(jpegWithOrientation(200, 100, $orientation)));
    \assert($info !== false);

    expect([$info[0], $info[1]])->toBe($size);
})->with([
    'normale' => [1, [200, 100]],
    'tournée de 90°' => [6, [100, 200]],
    'tournée de 270°' => [8, [100, 200]],
    'à l’envers' => [3, [200, 100]],
]);

it('place le haut de la photo en haut après redressement', function (): void {
    // Orientation 6 : l'appareil était tourné d'un quart de tour ; la moitié gauche (orange) passe en haut
    $decoded = imagecreatefromstring(WebpImage::fromBytes(jpegWithOrientation(200, 100, 6)));
    \assert($decoded instanceof GdImage);

    $top = imagecolorat($decoded, 50, 20);
    $bottom = imagecolorat($decoded, 50, 180);
    expect(($top >> 16) & 0xFF)->toBeGreaterThan(200)
        ->and(($bottom >> 16) & 0xFF)->toBeLessThan(50);
});
