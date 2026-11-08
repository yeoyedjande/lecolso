<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Support;

use Illuminate\Support\Str;

/**
 * Préfixe des matricules de l'école (« LAU » → LAU-000123) : 2 à 5 lettres majuscules.
 * Proposé à la création à partir de l'adresse de l'école ; la direction peut le changer tant qu'aucun matricule
 * n'a été émis (sinon les matricules d'une même école n'auraient pas le même préfixe).
 */
final class SchoolCode
{
    public const string PATTERN = '/^[A-Z]{2,5}$/';

    /** Mots ignorés pour la proposition (articles, « groupe scolaire »…). */
    private const array STOP_WORDS = ['le', 'la', 'les', 'l', 'de', 'du', 'des', 'd', 'groupe', 'scolaire', 'ecole', 'gs', 'complexe', 'institut', 'cours', 'prive', 'privee'];

    /** Trois premières lettres du premier mot significatif de l'adresse (« les-lauriers » → LAU). */
    public static function suggest(string $slug): string
    {
        $words = array_values(array_filter(
            explode('-', Str::lower(Str::ascii($slug))),
            static fn (string $word): bool => $word !== '' && ! in_array($word, self::STOP_WORDS, true),
        ));

        $letters = strtoupper((string) preg_replace('/[^a-z]/', '', implode('', $words)));

        return strlen($letters) >= 2 ? substr($letters, 0, 3) : 'ECO';
    }
}
