<?php

declare(strict_types=1);

/*
| Catalogue des cycles proposés à l'ouverture d'une école (V1 : garderie, maternelle, primaire).
| Données uniquement : le code métier lit les paramètres (App\Support\Cycles\CycleSettings),
| jamais le code du cycle. Source : cahier des charges, « Spécificités par cycle ».
| V2 (collège, lycée) et V3 (filières) s'ajoutent ici, sans changer le code.
*/

return [
    'daycare' => [
        'name' => 'Garderie',
        'levels' => [
            ['code' => 'CRECHE', 'name' => 'Crèche'],
        ],
        'settings' => [
            'term_type' => 'free_period',
            'assessment_mode' => 'observation',
            'attendance_mode' => 'check_in_out',
            'billing_period' => 'monthly',
            'report_document' => 'none',
            'daily_log' => 'required',
        ],
    ],
    'kindergarten' => [
        'name' => 'Maternelle',
        'levels' => [
            ['code' => 'PS', 'name' => 'Petite section'],
            ['code' => 'MS', 'name' => 'Moyenne section'],
            ['code' => 'GS', 'name' => 'Grande section'],
        ],
        'settings' => [
            'term_type' => 'free_period',
            'assessment_mode' => 'competency',
            'attendance_mode' => 'roll_call',
            'billing_period' => 'quarterly',
            'report_document' => 'skills_booklet',
            'daily_log' => 'optional',
        ],
    ],
    'primary' => [
        'name' => 'Primaire',
        'levels' => [
            ['code' => 'CP1', 'name' => 'CP1'],
            ['code' => 'CP2', 'name' => 'CP2'],
            ['code' => 'CE1', 'name' => 'CE1'],
            ['code' => 'CE2', 'name' => 'CE2'],
            ['code' => 'CM1', 'name' => 'CM1'],
            ['code' => 'CM2', 'name' => 'CM2'],
        ],
        'settings' => [
            'term_type' => 'trimester',
            'assessment_mode' => 'weighted_average',
            'attendance_mode' => 'roll_call',
            'billing_period' => 'quarterly',
            'report_document' => 'report_card',
            'daily_log' => 'none',
            'grade_scale' => '10',
        ],
    ],
];
