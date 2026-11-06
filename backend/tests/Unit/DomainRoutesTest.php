<?php

declare(strict_types=1);

use App\Support\Routing\DomainRoutes;

it('charge un fichier de routes par domaine, dans un ordre stable', function (): void {
    $domains = array_map(
        static fn (string $file): string => basename(dirname($file)),
        DomainRoutes::files(),
    );

    expect($domains)->toBe([
        'Academic',
        'Attendance',
        'Billing',
        'Family',
        'Grading',
        'Identity',
        'Messaging',
        'Students',
        'Tenancy',
    ]);
});

it('expose les routes des domaines sous /api/v1', function (): void {
    expect(route('health', absolute: false))->toBe('/api/v1/health');
});
