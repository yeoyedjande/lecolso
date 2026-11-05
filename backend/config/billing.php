<?php

declare(strict_types=1);

/*
| Facturation (domaine Billing).
|
| - fee_types : types de frais créés dans chaque école (montants dans la grille de l'école, par niveau et par année).
|   `billing` : `once` (dû en entier à l'inscription) ou `recurring` (réparti sur les échéances du cycle, selon sa
|   périodicité de facturation). `optional` : service choisi à l'inscription (cantine, transport…).
| - Échéances par défaut d'une année (modifiables par l'école) : voir Billing\Support\DefaultCalendar.
*/

return [
    'fee_types' => [
        'registration' => ['name' => 'Inscription', 'billing' => 'once', 'optional' => false],
        'tuition' => ['name' => 'Scolarité', 'billing' => 'recurring', 'optional' => false],
        'canteen' => ['name' => 'Cantine', 'billing' => 'recurring', 'optional' => true],
        'transport' => ['name' => 'Transport', 'billing' => 'recurring', 'optional' => true],
        'daycare' => ['name' => 'Garderie du soir', 'billing' => 'recurring', 'optional' => true],
    ],
];
