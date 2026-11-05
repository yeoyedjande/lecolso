<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Controllers;

use App\Domains\Attendance\Support\AbsenceProof;
use Illuminate\Contracts\Filesystem\Factory as Filesystems;
use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class AbsenceProofFileController
{
    /**
     * Lire le justificatif d'une absence.
     *
     * URL signée (10 minutes) renvoyée à qui peut traiter la justification ; sans signature valide : 403.
     */
    public function __invoke(string $file, Filesystems $filesystems): Response
    {
        $contents = $filesystems->disk()->get(AbsenceProof::path($file));

        if ($contents === null) {
            throw new NotFoundHttpException;
        }

        return new Response($contents, 200, [
            'Content-Type' => 'image/webp',
            'Cache-Control' => 'private, max-age='.(AbsenceProof::TTL_MINUTES * 60),
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => 'inline',
            'Referrer-Policy' => 'no-referrer',
        ]);
    }
}
