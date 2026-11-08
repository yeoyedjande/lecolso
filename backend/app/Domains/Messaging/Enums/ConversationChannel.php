<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Enums;

/** Destinataire côté école d'un fil : le titulaire de la classe, ou l'administration (direction, secrétariat du cycle). */
enum ConversationChannel: string
{
    case Teacher = 'teacher';
    case Office = 'office';
}
