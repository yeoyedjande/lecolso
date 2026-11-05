<?php

declare(strict_types=1);

namespace App\Domains\Students\Actions;

use App\Domains\Students\Models\Guardian;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\PersonPhoto;
use App\Support\Images\InvalidImage;
use App\Support\Images\WebpImage;
use Illuminate\Contracts\Filesystem\Factory as Filesystems;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

/**
 * Photo d'un élève ou d'un tuteur : redressée, réduite à 512 px et réencodée en WebP (métadonnées et position GPS
 * retirées), stockée sous un nom aléatoire ; l'ancienne photo est effacée une fois la nouvelle enregistrée.
 */
final readonly class ManagePhotos
{
    public const int MAX_SIDE = 512;

    public function __construct(private Filesystems $filesystems) {}

    /**
     * @throws ValidationException image illisible (champ `photo`)
     */
    public function store(Student|Guardian $person, UploadedFile $file): Student|Guardian
    {
        try {
            $webp = WebpImage::fromBytes((string) $file->get(), self::MAX_SIDE);
        } catch (InvalidImage $exception) {
            throw ValidationException::withMessages(['photo' => $exception->getMessage()]);
        }

        $disk = $this->filesystems->disk();
        $path = PersonPhoto::path(Str::uuid7()->toString().'.webp');
        $previous = $person->photo_path;

        // Disques configurés avec 'throw' => false : un échec d'écriture renvoie false. L'ancienne photo reste en place.
        if (! $disk->put($path, $webp)) {
            throw new RuntimeException('Enregistrement de la photo impossible : stockage indisponible.');
        }

        try {
            $person->photo_path = $path;
            $person->save();
        } catch (Throwable $exception) {
            $disk->delete($path);

            throw $exception;
        }

        if ($previous !== null && $previous !== $path) {
            $disk->delete($previous);
        }

        return $person;
    }

    public function remove(Student|Guardian $person): Student|Guardian
    {
        $previous = $person->photo_path;

        if ($previous === null) {
            return $person;
        }

        $person->photo_path = null;
        $person->save();
        $this->filesystems->disk()->delete($previous);

        return $person;
    }

    /** Efface le fichier d'une photo dont la ligne disparaît (dossier supprimé, tuteur sans plus aucun élève). */
    public function forget(?string $path): void
    {
        if ($path !== null && $path !== '') {
            $this->filesystems->disk()->delete($path);
        }
    }
}
