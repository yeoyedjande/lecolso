<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // En staging et en production, le frontend appelle l'API sur sa propre origine (proxy Caddy, ADR 0005) :
    // aucune requête CORS. Seul le développement local (Vite sur localhost:5173 → API sur localhost:8080)
    // en a besoin. Jamais « * » ni motif de sous-domaines : les cookies de session accompagnent les requêtes.
    'allowed_origins' => array_filter([env('FRONTEND_URL')]),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Authentification SPA par cookie (Sanctum)
    'supports_credentials' => true,

];
