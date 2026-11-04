<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Requests;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;

final class AssignUserRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $actor = $this->user();
        $target = $this->target();

        return $actor instanceof User
            && $actor->can('manage', $target)
            && $actor->can('grantRole', [User::class, $target, $this->string('role')->toString(), $this->cycleId()]);
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'role' => ['required', 'string', 'max:64'],
            'cycle_id' => ['nullable', 'uuid'],
        ];
    }

    public function target(): User
    {
        $target = $this->route('user');

        return $target instanceof User ? $target : throw new \LogicException('Paramètre de route {user} manquant.');
    }

    public function role(): string
    {
        return $this->string('role')->toString();
    }

    public function cycleId(): ?string
    {
        $cycle = $this->input('cycle_id');

        return is_string($cycle) && $cycle !== '' ? $cycle : null;
    }
}
