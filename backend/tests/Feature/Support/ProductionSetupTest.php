<?php

declare(strict_types=1);

use App\Providers\AppServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use function Pest\Laravel\withServerVariables;

it('fait confiance au proxy Railway : schéma https et IP réelle depuis X-Forwarded-*', function (): void {
    Route::get('/_proxy-probe', fn (Request $request): array => [
        'secure' => $request->secure(),
        'ip' => $request->ip(),
    ])->middleware('api');

    withServerVariables(['REMOTE_ADDR' => '10.0.0.7'])
        ->get('/_proxy-probe', ['X-Forwarded-Proto' => 'https', 'X-Forwarded-For' => '41.202.10.20'])
        ->assertOk()
        ->assertExactJson(['secure' => true, 'ip' => '41.202.10.20']);
});

it('génère des URL en https en staging et en production, pas en local', function (string $environment, string $scheme): void {
    app()->detectEnvironment(fn (): string => $environment);
    url()->forceScheme(null);
    (new AppServiceProvider(app()))->boot();

    expect(url('/api/v1/health'))->toStartWith("{$scheme}://");
})->with([
    'staging' => ['staging', 'https'],
    'production' => ['production', 'https'],
    'local' => ['local', 'http'],
]);

it('garde le bucket privé : aucune visibilité publique par défaut', function (): void {
    expect(config('filesystems.disks.s3.visibility'))->toBe('private');
});
