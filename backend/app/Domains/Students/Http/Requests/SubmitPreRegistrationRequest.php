<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use App\Domains\Students\Data\PreRegistrationInput;
use App\Domains\Students\Enums\Gender;
use App\Support\Phone\Phone;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/**
 * Pré-inscription depuis la page publique (sans connexion). `website` : champ piège invisible, rempli par les seuls
 * robots (refusé). `consent` : accord de la famille pour que l'école traite la demande.
 */
final class SubmitPreRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $today = Carbon::now('Africa/Abidjan')->toDateString();

        return [
            'cycle_code' => ['required', 'string', 'max:40'],
            'level_code' => ['required', 'string', 'max:40'],
            'child_last_name' => ['required', 'string', 'min:2', 'max:80'],
            'child_first_name' => ['required', 'string', 'min:2', 'max:80'],
            'child_gender' => ['required', Rule::enum(Gender::class)],
            'child_birth_date' => ['required', 'date_format:Y-m-d', 'before:'.$today, 'after:'.Carbon::parse($today)->subYears(25)->toDateString()],
            'guardian_name' => ['required', 'string', 'min:2', 'max:120'],
            'guardian_phone' => ['required', 'string', 'max:30', static function (string $attribute, mixed $value, Closure $fail): void {
                if (! is_string($value) || Phone::normalize($value) === null) {
                    $fail('Saisissez un numéro de téléphone valide.');
                }
            }],
            'guardian_email' => ['nullable', 'email', 'max:255'],
            'message' => ['nullable', 'string', 'max:500'],
            'consent' => ['accepted'],
            'website' => ['prohibited'],
        ];
    }

    public function preRegistration(): PreRegistrationInput
    {
        $email = trim($this->string('guardian_email')->toString());
        $message = trim($this->string('message')->toString());

        return new PreRegistrationInput(
            cycleCode: $this->string('cycle_code')->toString(),
            levelCode: $this->string('level_code')->toString(),
            childLastName: trim($this->string('child_last_name')->toString()),
            childFirstName: trim($this->string('child_first_name')->toString()),
            childGender: $this->enum('child_gender', Gender::class) ?? Gender::Female,
            childBirthDate: $this->string('child_birth_date')->toString(),
            guardianName: trim($this->string('guardian_name')->toString()),
            guardianPhone: Phone::normalize($this->string('guardian_phone')->toString()) ?? '',
            guardianEmail: $email === '' ? null : mb_strtolower($email),
            message: $message === '' ? null : $message,
        );
    }
}
