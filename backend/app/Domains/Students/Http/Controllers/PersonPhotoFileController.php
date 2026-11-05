<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Controllers;

use App\Domains\Students\Support\PersonPhoto;
use Illuminate\Contracts\Filesystem\Factory as Filesystems;
use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class PersonPhotoFileController
{
    /**
     * Lire la photo d'un élève ou d'un tuteur.
     *
     * URL signée renvoyée par l'API (`photo_url`) à qui peut voir l'élève, valable 10 minutes ; sans signature valide :
     * 403. Jamais mise en cache partagé ni transmise dans l'en-tête Referer.
     */
    public function __invoke(string $file, Filesystems $filesystems): Response
    {
        $contents = $filesystems->disk()->get(PersonPhoto::path($file));

        if ($contents === null) {
            throw new NotFoundHttpException;
        }

        return new Response($contents, 200, [
            'Content-Type' => 'image/webp',
            'Cache-Control' => 'private, max-age='.(PersonPhoto::TTL_MINUTES * 60),
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => 'inline',
            'Referrer-Policy' => 'no-referrer',
        ]);
    }
}
