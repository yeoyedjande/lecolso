<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use App\Domains\Students\Enums\GuardianRelation;
use App\Support\Phone\Phone;

/**
 * Modifier un tuteur (nom, téléphone, e-mail, profession : partagés par la fratrie) et son lien avec l'élève
 * (parenté, payeur, contact principal, autorisé à récupérer). Champs envoyés seulement.
 */
final class UpdateGuardianRequest extends ManageStudentRequest
{
    use GuardianLinkRequest;
    use StudentFieldRules;

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return self::guardianRules('', false);
    }

    /**
     * @return array{name?: string, phone?: string, email?: string|null, profession?: string|null}
     */
    public function guardianChanges(): array
    {
        $changes = [];

        if ($this->has('name')) {
            $changes['name'] = trim($this->string('name')->toString());
        }
        if ($this->has('phone')) {
            $changes['phone'] = Phone::normalize($this->string('phone')->toString()) ?? '';
        }
        foreach (['email', 'profession'] as $field) {
            if ($this->exists($field)) {
                $value = trim($this->string($field)->toString());
                $changes[$field] = $value === '' ? null : ($field === 'email' ? mb_strtolower($value) : $value);
            }
        }

        return $changes;
    }

    /**
     * @return array{relation?: GuardianRelation, is_primary_contact?: bool, is_payer?: bool, can_pick_up?: bool}
     */
    public function linkChanges(): array
    {
        $changes = [];

        if ($this->has('relation')) {
            $changes['relation'] = GuardianRelation::from($this->string('relation')->toString());
        }
        foreach (['is_primary_contact', 'is_payer', 'can_pick_up'] as $flag) {
            if ($this->has($flag)) {
                $changes[$flag] = $this->boolean($flag);
            }
        }

        return $changes;
    }
}
