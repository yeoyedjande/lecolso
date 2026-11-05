<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;

use function Pest\Laravel\call;

/**
 * Client « navigateur » pour le frontend SPA : en-têtes Origin/Referer du frontend (requêtes stateful Sanctum),
 * cookies conservés d'une requête à l'autre (session, « se souvenir de moi »), et garde d'authentification
 * oublié entre deux requêtes : comme en production, chaque requête recharge l'utilisateur depuis la session,
 * donc par le fournisseur d'utilisateurs soumis à la RLS.
 */
final class SpaClient
{
    public const string FRONTEND = 'http://localhost:5173';

    /** @var array<string, string> */
    private static array $cookies = [];

    public static function reset(): void
    {
        self::$cookies = [];
    }

    /** @return array<string, string> */
    public static function cookies(): array
    {
        return self::$cookies;
    }

    public static function forgetCookie(string $name): void
    {
        unset(self::$cookies[$name]);
    }

    public static function setCookie(string $name, string $value): void
    {
        self::$cookies[$name] = $value;
    }

    /**
     * @param  array<array-key, mixed>  $data  corps JSON
     * @param  array<string, string>  $headers
     * @param  array<string, string>  $server
     * @return TestResponse<Response>
     */
    public static function request(string $method, string $uri, array $data = [], array $headers = [], array $server = []): TestResponse
    {
        $server['CONTENT_TYPE'] = 'application/json';

        return self::send($method, $uri, $headers, $server, [], json_encode($data, JSON_THROW_ON_ERROR));
    }

    /**
     * Envoi multipart/form-data (fichiers), avec les mêmes cookies et en-têtes que request().
     *
     * @param  array<string, UploadedFile>  $files
     * @param  array<string, string>  $headers
     * @return TestResponse<Response>
     */
    public static function upload(string $uri, array $files, array $headers = []): TestResponse
    {
        return self::send('POST', $uri, $headers, [], $files, null);
    }

    /**
     * @param  array<string, string>  $headers
     * @param  array<string, string>  $server
     * @param  array<string, UploadedFile>  $files
     * @return TestResponse<Response>
     */
    private static function send(string $method, string $uri, array $headers, array $server, array $files, ?string $content): TestResponse
    {
        app('auth')->forgetGuards();

        $headers = ['Origin' => self::FRONTEND, 'Referer' => self::FRONTEND.'/', 'Accept' => 'application/json'] + $headers;
        foreach ($headers as $name => $value) {
            $server['HTTP_'.strtoupper(str_replace('-', '_', $name))] = $value;
        }

        // Cookies gérés ici (et non par withCookies(), qui les cumule sur le test) : valeurs chiffrées renvoyées
        // telles quelles, comme le ferait un navigateur
        $response = call($method, $uri, [], self::$cookies, $files, $server, $content);

        foreach ($response->headers->getCookies() as $cookie) {
            $value = $cookie->getValue();

            if ($cookie->isCleared() || $value === null || $value === '') {
                unset(self::$cookies[$cookie->getName()]);
            } else {
                self::$cookies[$cookie->getName()] = $value;
            }
        }

        // Comme en production, la requête suivante repart sans utilisateur ni cookies en attente
        app('auth')->forgetGuards();
        app('cookie')->flushQueuedCookies();

        return $response;
    }
}
