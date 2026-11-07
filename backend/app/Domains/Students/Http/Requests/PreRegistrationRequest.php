<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\PreRegistration;
use App\Domains\Students\Support\PreRegistrationAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use LogicException;

/** Pré-inscription de la route : 404 hors du périmètre (autre cycle, autre école), comme une demande inexistante. */
class PreRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user instanceof User) {
            return false;
        }
        if (! app(PreRegistrationAccess::class)->sees($user, $this->preRegistration())) {
            throw new HttpResponseException(new JsonResponse(['message' => 'Not Found'], 404));
        }

        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }

    public function preRegistration(): PreRegistration
    {
        $preRegistration = $this->route('preRegistration');

        return $preRegistration instanceof PreRegistration ? $preRegistration : throw new LogicException('Pré-inscription de la route introuvable.');
    }
}
