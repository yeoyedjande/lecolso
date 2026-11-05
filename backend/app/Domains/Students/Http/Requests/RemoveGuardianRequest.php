<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

/** Retirer un tuteur du dossier (lien seulement ; le tuteur reste celui de ses autres enfants). */
final class RemoveGuardianRequest extends ManageStudentRequest
{
    use GuardianLinkRequest;
}
