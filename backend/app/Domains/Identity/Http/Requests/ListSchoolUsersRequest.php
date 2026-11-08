<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Requests;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;

final class ListSchoolUsersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', User::class) === true;
    }

    /**
     * Filtres : `search` (nom, e-mail, ou au moins 4 chiffres du téléphone), `role` (clé de rôle), `cycle_id`,
     * `status` (`all` par défaut, `active`, `deactivated`) ; `cursor` pour la page suivante.
     *
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', 'string', 'max:64'],
            'cycle_id' => ['nullable', 'uuid'],
            'status' => ['nullable', 'in:all,active,deactivated'],
            'cursor' => ['nullable', 'string'],
        ];
    }

    public function search(): ?string
    {
        $search = trim($this->string('search')->toString());

        return $search === '' ? null : $search;
    }

    public function role(): ?string
    {
        return $this->filled('role') ? $this->string('role')->toString() : null;
    }

    public function cycleId(): ?string
    {
        return $this->filled('cycle_id') ? $this->string('cycle_id')->toString() : null;
    }

    /**
     * @return 'all'|'active'|'deactivated'
     */
    public function status(): string
    {
        return match ($this->string('status')->toString()) {
            'active' => 'active',
            'deactivated' => 'deactivated',
            default => 'all',
        };
    }
}
