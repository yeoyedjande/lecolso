<?php

declare(strict_types=1);

use App\Support\Pdf\GotenbergPdfRenderer;
use App\Support\Pdf\PdfRenderingFailed;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;

it('envoie le HTML à Gotenberg en A4 et renvoie le PDF', function (): void {
    $http = new Factory;
    $http->fake(['gotenberg:3000/*' => $http->response("%PDF-1.7\n...", 200, ['Content-Type' => 'application/pdf'])]);

    $pdf = (new GotenbergPdfRenderer($http, 'http://gotenberg:3000/'))->render('<html><body>Bulletin</body></html>');

    expect($pdf)->toStartWith('%PDF');
    $http->assertSent(static fn (Request $request): bool => $request->url() === 'http://gotenberg:3000/forms/chromium/convert/html'
        && $request->isMultipart()
        && collect($request->data())->contains(static fn (array $part): bool => $part['name'] === 'files' && $part['filename'] === 'index.html')
        && collect($request->data())->contains(static fn (array $part): bool => $part['name'] === 'paperWidth' && $part['contents'] === '8.27'));
});

it('refuse sans service configuré ou quand Gotenberg échoue', function (): void {
    $http = new Factory;
    $http->fake(['*' => $http->response('erreur', 503)]);

    expect(static fn () => (new GotenbergPdfRenderer($http, ''))->render('<html></html>'))->toThrow(PdfRenderingFailed::class)
        ->and(static fn () => (new GotenbergPdfRenderer($http, 'http://gotenberg:3000'))->render('<html></html>'))->toThrow(PdfRenderingFailed::class, '503');
});
