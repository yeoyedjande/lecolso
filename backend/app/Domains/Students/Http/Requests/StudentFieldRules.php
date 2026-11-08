<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use App\Domains\Students\Data\GuardianInput;
use App\Domains\Students\Enums\BloodType;
use App\Domains\Students\Enums\Gender;
use App\Domains\Students\Enums\GuardianRelation;
use App\Support\Phone\Phone;
use Closure;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/**
 * Règles communes du dossier élève et des tuteurs (préfixe `student.` ou `guardians.*.` selon la requête).
 */
trait StudentFieldRules
{
    /**
     * Champs médicaux (blood_type, allergies, medical_notes) : refusés (422) si $medicalAllowed est faux.
     *
     * @return array<string, list<mixed>>
     */
    private static function studentRules(string $prefix, bool $required, bool $medicalAllowed): array
    {
        $presence = $required ? 'required' : 'sometimes';
        $medical = $medicalAllowed ? 'sometimes' : 'prohibited';
        $today = Carbon::now(self::displayTimezone())->toDateString();

        return [
            $prefix.'first_name' => [$presence, 'string', 'min:1', 'max:80'],
            $prefix.'last_name' => [$presence, 'string', 'min:1', 'max:80'],
            $prefix.'gender' => [$presence, Rule::enum(Gender::class)],
            $prefix.'birth_date' => [$presence, 'date_format:Y-m-d', 'after:1990-01-01', 'before_or_equal:'.$today],
            $prefix.'birth_place' => ['sometimes', 'nullable', 'string', 'max:80'],
            $prefix.'address' => ['sometimes', 'nullable', 'string', 'max:160'],
            $prefix.'blood_type' => [$medical, 'nullable', Rule::enum(BloodType::class)],
            $prefix.'allergies' => [$medical, 'nullable', 'string', 'max:1000'],
            $prefix.'medical_notes' => [$medical, 'nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, list<mixed>>
     */
    private static function guardianRules(string $prefix, bool $required): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            $prefix.'name' => [$presence, 'string', 'min:2', 'max:120'],
            $prefix.'phone' => [$presence, 'string', 'max:30', static function (string $attribute, mixed $value, Closure $fail): void {
                if (! is_string($value) || Phone::normalize($value) === null) {
                    $fail('Saisissez un numéro de téléphone valide.');
                }
            }],
            $prefix.'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            $prefix.'profession' => ['sometimes', 'nullable', 'string', 'max:80'],
            $prefix.'relation' => [$presence, Rule::enum(GuardianRelation::class)],
            $prefix.'is_primary_contact' => ['sometimes', 'boolean'],
            $prefix.'is_payer' => ['sometimes', 'boolean'],
            $prefix.'can_pick_up' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Attributs du dossier présents dans la requête (chaîne vide = effacer un champ facultatif).
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private static function studentAttributes(array $input): array
    {
        $attributes = [];

        foreach (['first_name', 'last_name'] as $field) {
            if (array_key_exists($field, $input) && is_string($input[$field])) {
                $attributes[$field] = trim($input[$field]);
            }
        }

        if (array_key_exists('gender', $input) && is_string($input['gender'])) {
            $attributes['gender'] = Gender::from($input['gender']);
        }

        if (array_key_exists('birth_date', $input) && is_string($input['birth_date'])) {
            $attributes['birth_date'] = $input['birth_date'];
        }

        foreach (['birth_place', 'address', 'allergies', 'medical_notes'] as $field) {
            if (array_key_exists($field, $input)) {
                $value = is_string($input[$field]) ? trim($input[$field]) : '';
                $attributes[$field] = $value === '' ? null : $value;
            }
        }

        if (array_key_exists('blood_type', $input)) {
            $attributes['blood_type'] = is_string($input['blood_type']) && $input['blood_type'] !== ''
                ? BloodType::from($input['blood_type'])
                : null;
        }

        return $attributes;
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private static function guardianInput(array $input, bool $defaultPrimary, bool $defaultPayer): GuardianInput
    {
        $text = static function (string $field) use ($input): ?string {
            $value = isset($input[$field]) && is_string($input[$field]) ? trim($input[$field]) : '';

            return $value === '' ? null : $value;
        };

        return new GuardianInput(
            name: trim(is_string($input['name'] ?? null) ? $input['name'] : ''),
            phone: Phone::normalize(is_string($input['phone'] ?? null) ? $input['phone'] : '') ?? '',
            email: ($email = $text('email')) === null ? null : mb_strtolower($email),
            profession: $text('profession'),
            relation: GuardianRelation::from(is_string($input['relation'] ?? null) ? $input['relation'] : GuardianRelation::Guardian->value),
            isPrimaryContact: array_key_exists('is_primary_contact', $input) ? filter_var($input['is_primary_contact'], FILTER_VALIDATE_BOOL) : $defaultPrimary,
            isPayer: array_key_exists('is_payer', $input) ? filter_var($input['is_payer'], FILTER_VALIDATE_BOOL) : $defaultPayer,
            canPickUp: array_key_exists('can_pick_up', $input) ? filter_var($input['can_pick_up'], FILTER_VALIDATE_BOOL) : true,
        );
    }

    private static function displayTimezone(): string
    {
        $timezone = config('app.display_timezone');

        return is_string($timezone) ? $timezone : 'Africa/Abidjan';
    }
}
