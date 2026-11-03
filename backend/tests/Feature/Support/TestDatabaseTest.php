<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

it('utilise la base PostgreSQL de test avec le rôle applicatif', function (): void {
    $connection = DB::connection();

    expect($connection->getDriverName())->toBe('pgsql')
        ->and($connection->getDatabaseName())->toBe('gestion_ecole_test')
        ->and($connection->scalar('select current_user'))->toBe('app_user');
});
