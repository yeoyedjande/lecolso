<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use App\Domains\Identity\Models\User;
use App\Domains\Students\Enums\PreRegistrationStatus;
use App\Domains\Students\Support\PreRegistrationAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Liste des pré-inscriptions : personnel avec students.manage (sinon 403). `status` : filtre facultatif. */
final class ListPreRegistrationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && app(PreRegistrationAccess::class)->any($user);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return ['status' => ['sometimes', Rule::enum(PreRegistrationStatus::class)]];
    }

    public function status(): ?PreRegistrationStatus
    {
        return $this->enum('status', PreRegistrationStatus::class);
    }
}
