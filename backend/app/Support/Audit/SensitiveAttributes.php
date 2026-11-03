<?php

declare(strict_types=1);

namespace App\Support\Audit;

/**
 * Attributs jamais écrits dans le journal d'audit (règle 5 : secrets, infos médicales).
 * Appliqué deux fois : exclus à la source (Auditable) et retirés avant l'écriture (Activity).
 */
final class SensitiveAttributes
{
    /** Noms exacts */
    public const array NAMES = [
        'password',
        'remember_token',
        'allergies',
        'blood_type',
        'disabilities',
        'treatments',
    ];

    /** Préfixes : toute colonne médicale ou de santé */
    public const array PREFIXES = ['medical_', 'health_'];

    public static function isSensitive(string $attribute): bool
    {
        $attribute = strtolower($attribute);

        if (in_array($attribute, self::NAMES, true)) {
            return true;
        }

        foreach (self::PREFIXES as $prefix) {
            if (str_starts_with($attribute, $prefix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Retire les attributs sensibles, à tous les niveaux (ex. properties.attributes.password).
     *
     * @param  array<array-key, mixed>  $values
     * @return array<array-key, mixed>
     */
    public static function scrub(array $values): array
    {
        $clean = [];

        foreach ($values as $key => $value) {
            if (is_string($key) && self::isSensitive($key)) {
                continue;
            }

            $clean[$key] = is_array($value) ? self::scrub($value) : $value;
        }

        return $clean;
    }
}
