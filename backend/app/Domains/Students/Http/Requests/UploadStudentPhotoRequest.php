<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

/** Photo de l'élève : gérer son dossier (students.manage sur son cycle) ; 404 hors du périmètre. */
final class UploadStudentPhotoRequest extends ManageStudentRequest
{
    use PhotoRules;
}
