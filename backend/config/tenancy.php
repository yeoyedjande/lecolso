<?php

declare(strict_types=1);

/*
 * Routage par chemin (ADR 0005) : chaque établissement est servi sur https://app.<domaine>/{slug}/*.
 * Le slug n'est qu'un identifiant d'URL : les relations en base et l'en-tête X-School-Id utilisent l'UUID.
 */
return [

    /*
     * Premiers segments d'URL que le frontend ou l'infrastructure utilisent déjà (routes globales,
     * chemins techniques servis par le proxy, fichiers de l'application) ou pourraient utiliser :
     * aucune école ne peut prendre ces slugs. Équivalents anglais réservés aussi.
     * Le frontend vérifie que chacune de ses routes de premier niveau figure ici (test Vitest).
     */
    'reserved_slugs' => [
        // Routes globales du frontend (français)
        'connexion', 'deconnexion', 'mot-de-passe', 'etablissements', 'plateforme', 'compte', 'profil',
        'etat', 'design', 'ecole', 'ecoles', 'aide', 'contact', 'inscription', 'preinscription',
        'parametres', 'recherche', 'notifications', 'tableau-de-bord', 'gestion', 'parent', 'parents',
        'enseignant', 'enseignants', 'super-admin', 'mentions-legales', 'confidentialite', 'cgu',
        // Équivalents anglais
        'login', 'logout', 'register', 'signup', 'password', 'reset-password', 'schools', 'school',
        'platform', 'admin', 'account', 'profile', 'settings', 'dashboard', 'status', 'health', 'help',
        'support', 'search', 'teacher', 'teachers', 'guardian', 'privacy', 'terms', 'legal',
        // Chemins techniques (proxy Caddy, fichiers de la PWA, outils)
        'api', 'sanctum', 'horizon', 'telescope', 'pulse', 'docs', 'webhooks', 'assets', 'icons',
        'static', 'storage', 'build', 'fonts', 'images', 'media', 'uploads', 'files', 'favicon',
        'manifest', 'robots', 'sitemap', 'well-known', 'sw', 'offline',
        // Noms d'hôtes et d'environnements
        'app', 'www', 'mail', 'staging', 'preprod', 'production', 'demo', 'test', 'dev', 'local',
        'ekalewa', 'lecolso',
    ],

];
