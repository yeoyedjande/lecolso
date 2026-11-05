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
