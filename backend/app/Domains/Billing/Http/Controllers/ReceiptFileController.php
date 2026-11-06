<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Controllers;

use App\Domains\Billing\Support\ReceiptPdf;
use Illuminate\Contracts\Filesystem\Factory as Filesystems;
use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class ReceiptFileController
{
    /**
     * Lire un reçu PDF.
     *
     * URL signée renvoyée par l'API (`GET payments/{payment}/receipt-pdf`) à qui voit la facture, valable 10 minutes ;
     * sans signature valide : 403. Jamais mise en cache partagé ni transmise dans l'en-tête Referer.
     */
    public function __invoke(string $file, Filesystems $filesystems): Response
    {
        $contents = $filesystems->disk()->get(ReceiptPdf::path($file));

        if ($contents === null) {
            throw new NotFoundHttpException;
        }

        return new Response($contents, 200, [
            'Content-Type' => 'application/pdf',
            'Cache-Control' => 'private, max-age='.(ReceiptPdf::TTL_MINUTES * 60),
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => 'inline; filename="recu.pdf"',
            'Referrer-Policy' => 'no-referrer',
        ]);
    }
}
