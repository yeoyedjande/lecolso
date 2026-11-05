<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

/** Retirer la photo d'un tuteur lié à l'élève de la route (gérer le dossier de l'élève). */
class GuardianPhotoRequest extends ManageStudentRequest
{
    use GuardianLinkRequest;
}
