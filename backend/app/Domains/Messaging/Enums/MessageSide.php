<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Enums;

/** Côté de l'auteur d'un message : le parent, ou l'école (titulaire, direction, secrétariat). */
enum MessageSide: string
{
    case Guardian = 'guardian';
    case School = 'school';
}
