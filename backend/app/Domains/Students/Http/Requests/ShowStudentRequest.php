<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use App\Domains\Identity\Models\User;

/**
 * Consultation d'un dossier. Un élève hors du périmètre de l'utilisateur (autre cycle, autre classe, enfant
 * d'un autre parent) répond 404, comme un élève d'une autre école : rien à deviner.
 */
final class ShowStudentRequest extends ManageStudentRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user instanceof User) {
            return false;
        }

        $this->assertVisible($user);

        return true;
    }
}
