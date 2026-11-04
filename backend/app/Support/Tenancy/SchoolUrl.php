<?php

declare(strict_types=1);

namespace App\Support\Tenancy;

use App\Domains\Tenancy\Models\School;
use InvalidArgumentException;

/**
 * Liens vers l'application web d'un établissement (ADR 0005) : https://app.<domaine>/{slug}/{chemin}.
 * À utiliser pour tout lien envoyé à un utilisateur (e-mail, SMS, WhatsApp, PDF) : jamais de sous-domaine
 * ni d'URL construite à la main. Le lien ne donne aucun droit : l'écran vérifie la session et l'appartenance.
 */
final class SchoolUrl
{
    /**
     * @param  string  $path  chemin dans l'établissement, ex. « eleves/0190… » ou « /parent/paiements » ;
     *                        vide pour la page publique de l'école
     * @param  array<string, string|int>  $query
     */
    public static function to(School $school, string $path = '', array $query = []): string
    {
        $path = trim($path, '/');
        // Chemin relatif uniquement : ni schéma, ni hôte, ni remontée (un lien ne sort jamais de l'école)
        if (preg_match('#^[a-z0-9/_-]*$#i', $path) !== 1 || preg_match('#(^|/)\.\.?(/|$)#', $path) === 1) {
            throw new InvalidArgumentException('Chemin d’établissement invalide.');
        }

        $url = rtrim(config()->string('app.frontend_url'), '/').'/'.rawurlencode($school->slug);
        if ($path !== '') {
            $url .= '/'.$path;
        }

        return $query === [] ? $url : $url.'?'.http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }
}
