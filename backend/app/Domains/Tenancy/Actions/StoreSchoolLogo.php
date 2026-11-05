<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Actions;

use App\Domains\Tenancy\Models\School;
use App\Domains\Tenancy\Support\SchoolLogo;
use App\Support\Images\InvalidImage;
use App\Support\Images\WebpImage;
use Illuminate\Contracts\Filesystem\Factory as Filesystems;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

/**
 * Remplace le logo de l'école courante : image normalisée en WebP (512 px au plus, sans métadonnées), stockée sous
 * un nom aléatoire dans le stockage privé ; l'ancien fichier est supprimé une fois le nouveau enregistré.
 */
final readonly class StoreSchoolLogo
{
    public const int MAX_SIDE = 512;

    public function __construct(private Filesystems $filesystems) {}

    public function handle(School $school, UploadedFile $file): School
    {
        try {
            $webp = WebpImage::fromBytes((string) $file->get(), self::MAX_SIDE);
        } catch (InvalidImage $exception) {
            throw ValidationException::withMessages(['logo' => $exception->getMessage()]);
        }

        $disk = $this->filesystems->disk();
        $path = SchoolLogo::path(Str::uuid7()->toString().'.webp');
        $previous = $school->logo_path;

        // Disques configurés avec 'throw' => false : un échec d'écriture renvoie false. L'ancien logo reste en place.
        if (! $disk->put($path, $webp)) {
            throw new RuntimeException('Enregistrement du logo impossible : stockage indisponible.');
        }

        try {
            $school->logo_path = $path;
            $school->save();
        } catch (Throwable $exception) {
            $disk->delete($path);

            throw $exception;
        }

        if ($previous !== null && $previous !== $path) {
            $disk->delete($previous);
        }

        return $school;
    }
}
