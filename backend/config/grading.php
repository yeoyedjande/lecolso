<?php

declare(strict_types=1);

/*
| Notes et compétences : listes proposées à la création d'une année (modifiables par la direction).
| - subjects : matières et coefficients d'un niveau des cycles en moyenne pondérée ;
| - skills : référentiel des cycles en compétences (domaine, compétence).
*/

return [
    'subjects' => [
        ['name' => 'Français', 'coefficient' => 3],
        ['name' => 'Mathématiques', 'coefficient' => 3],
        ['name' => 'Éveil (histoire, géographie, sciences)', 'coefficient' => 2],
        ['name' => 'Anglais', 'coefficient' => 1],
        ['name' => 'Éducation physique et sportive', 'coefficient' => 1],
        ['name' => 'Arts et musique', 'coefficient' => 1],
    ],
    'skills' => [
        ['domain' => 'Langage oral', 'label' => 'S’exprime par une phrase complète'],
        ['domain' => 'Langage oral', 'label' => 'Récite une comptine'],
        ['domain' => 'Langage écrit', 'label' => 'Reconnaît son prénom'],
        ['domain' => 'Mathématiques', 'label' => 'Dénombre une collection jusqu’à 10'],
        ['domain' => 'Mathématiques', 'label' => 'Reconnaît les formes simples'],
        ['domain' => 'Motricité', 'label' => 'Tient correctement son crayon'],
        ['domain' => 'Motricité', 'label' => 'Découpe en suivant un trait'],
        ['domain' => 'Vivre ensemble', 'label' => 'Respecte les règles de la classe'],
        ['domain' => 'Vivre ensemble', 'label' => 'Partage avec ses camarades'],
        ['domain' => 'Arts', 'label' => 'Chante en groupe'],
    ],
];
