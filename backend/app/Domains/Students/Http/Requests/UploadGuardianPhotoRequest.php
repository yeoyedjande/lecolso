<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

/** Photo d'un tuteur lié à l'élève de la route (partagée par la fratrie). */
final class UploadGuardianPhotoRequest extends GuardianPhotoRequest
{
    use PhotoRules;
}
