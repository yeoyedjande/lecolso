<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Controllers;

use App\Domains\Grading\Support\ReportCardFile;
use Illuminate\Contracts\Filesystem\Factory as Filesystems;
use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class ReportCardFileController
{
    /**
     * Lire un bulletin PDF.
     *
     * URL signée renvoyée par l'API (`pdf_url`) à qui voit la classe, valable 10 minutes ; sans signature valide : 403.
     * Jamais mise en cache partagé ni transmise dans l'en-tête Referer.
     */
    public function __invoke(string $file, Filesystems $filesystems): Response
    {
        $contents = $filesystems->disk()->get(ReportCardFile::path($file));

        if ($contents === null) {
            throw new NotFoundHttpException;
        }

        return new Response($contents, 200, [
            'Content-Type' => 'application/pdf',
            'Cache-Control' => 'private, max-age='.(ReportCardFile::TTL_MINUTES * 60),
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => 'inline; filename="bulletin.pdf"',
            'Referrer-Policy' => 'no-referrer',
        ]);
    }
}
