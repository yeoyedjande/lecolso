<?php

declare(strict_types=1);

namespace App\Support\Phone;

/**
 * Numéros de téléphone au format E.164 (+225…), sans bibliothèque externe.
 *
 * Saisie acceptée : « 07 00 00 00 00 », « 0700000000 », « +225 07 00 00 00 00 », « 00225 07… ».
 * Un numéro national à 10 chiffres est considéré ivoirien (+225, numérotation à 10 chiffres depuis 2021).
 */
final class Phone
{
    public const string DEFAULT_COUNTRY_CODE = '225';

    /** Normalise une saisie en E.164, ou null si ce n'est pas un numéro valide. */
    public static function normalize(string $input): ?string
    {
        $compact = preg_replace('/[\s.\-()]/', '', trim($input)) ?? '';

        if (str_starts_with($compact, '00')) {
            $compact = '+'.substr($compact, 2);
        }

        if (preg_match('/^\d{10}$/', $compact) === 1) {
            $compact = '+'.self::DEFAULT_COUNTRY_CODE.$compact;
        }

        return self::isE164($compact) ? $compact : null;
    }

    public static function isE164(string $value): bool
    {
        return preg_match('/^\+[1-9]\d{7,14}$/', $value) === 1;
    }

    /** Pour les logs (règle 5) : « +225******00 ». */
    public static function mask(string $e164): string
    {
        if (strlen($e164) <= 6) {
            return str_repeat('*', strlen($e164));
        }

        return substr($e164, 0, 4).str_repeat('*', strlen($e164) - 6).substr($e164, -2);
    }
}
