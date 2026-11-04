<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Database\DatabaseManager;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Timebox;
use Tests\Support\InstantTimebox;
use Tests\Support\SpaClient;

/**
 * Base : DatabaseTruncation plutôt que RefreshDatabase. Les écoles sont écrites par la connexion super-admin
 * séparée (pgsql_platform) : dans une transaction de test sur pgsql, ces données ne seraient pas visibles
 * (et inversement). Les tables sont vidées avant chaque test.
 */
abstract class TestCase extends BaseTestCase
{
    use DatabaseTruncation;

    /**
     * Lu par DatabaseTruncation : vidage par le rôle propriétaire (app_user n'a pas le droit TRUNCATE).
     *
     * @var list<string>
     */
    protected array $connectionsToTruncate = ['pgsql_owner'];

    protected function setUp(): void
    {
        parent::setUp();

        // Connexion : durée minimale notée mais pas attendue (un test dédié vérifie la vraie Timebox)
        $this->app->instance(Timebox::class, new InstantTimebox);
        SpaClient::reset();

        // DatabaseTruncation ne ferme pas les connexions (RefreshDatabase le fait) : sans cela, chaque test
        // laisse jusqu'à trois sessions PostgreSQL ouvertes et le serveur finit par refuser les connexions
        $this->beforeApplicationDestroyed(function (): void {
            $db = $this->app->make(DatabaseManager::class);

            foreach (array_keys($db->getConnections()) as $name) {
                $db->disconnect($name);
            }
        });
    }

    /**
     * Migrations avec le rôle propriétaire (app_owner) ; les requêtes des tests passent par pgsql (app_user, RLS).
     *
     * @return array<string, mixed>
     */
    protected function migrateFreshUsing(): array
    {
        return [
            '--database' => 'pgsql_owner',
            '--drop-views' => false,
            '--drop-types' => false,
            '--seed' => false,
        ];
    }
}
