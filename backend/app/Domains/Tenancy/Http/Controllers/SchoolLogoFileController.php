<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Controllers;

use App\Domains\Tenancy\Support\SchoolLogo;
use Illuminate\Contracts\Filesystem\Factory as Filesystems;
use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class SchoolLogoFileController
{
    /**
     * Lire un logo d'école.
     *
     * URL signée renvoyée par l'API (`logo_url`), valable 30 minutes ; sans signature valide : 403. Aucune session :
     * la page publique de l'école l'affiche aussi.
     */
    public function __invoke(string $file, Filesystems $filesystems): Response
    {
        $disk = $filesystems->disk();
        $contents = $disk->get(SchoolLogo::path($file));

        if ($contents === null) {
            throw new NotFoundHttpException;
        }

        return new Response($contents, 200, [
            'Content-Type' => 'image/webp',
            'Cache-Control' => 'private, max-age='.(SchoolLogo::TTL_MINUTES * 60),
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => 'inline',
        ]);
    }
}
