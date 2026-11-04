<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Requests;

use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class RevokeUserRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('revokeRole', [$this->target(), $this->assignment()]) === true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }

    public function target(): User
    {
        $target = $this->route('user');

        return $target instanceof User ? $target : throw new \LogicException('Paramètre de route {user} manquant.');
    }

    /** Affectation de ce compte dans l'école courante (une autre affectation : 404, rien à deviner). */
    public function assignment(): RoleAssignment
    {
        $assignment = $this->route('assignment');

        if (! $assignment instanceof RoleAssignment || $assignment->user_id !== $this->target()->id) {
            throw new NotFoundHttpException;
        }

        return $assignment;
    }
}
