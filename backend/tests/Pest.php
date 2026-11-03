<?php

declare(strict_types=1);

use Tests\TestCase;

/*
| Tous les tests (Feature et Unit) démarrent l'application Laravel : les Actions testées en Unit
| ont besoin du conteneur. RefreshDatabase est ajouté au sprint 0, étape 3 (migrations via pgsql_owner).
*/
pest()->extend(TestCase::class)->in('Feature', 'Unit');
