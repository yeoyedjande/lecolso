<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Middleware;

use App\Domains\Identity\Models\MemberDeactivation;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\TenantContext;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Résout l'école de la requête (en-tête X-School-Id) pour un utilisateur authentifié.
 *
 * - 400 : en-tête absent ou qui n'est pas un UUID ;
 * - 404 : école inexistante, ou l'utilisateur n'y a aucune affectation (même réponse : rien à deviner).
 *
 * Le contexte (PHP et PostgreSQL) est remis à zéro à la fin de la requête, même en cas d'exception.
 * Alias : « school », à placer après auth:sanctum.
 */
final readonly class ResolveSchool
{
    public const string HEADER = 'X-School-Id';

    public function __construct(private TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User) {
            throw new AuthenticationException;
        }

        $schoolId = $request->header(self::HEADER);

        if (! is_string($schoolId) || ! Str::isUuid($schoolId)) {
            return new JsonResponse([
                'message' => 'L’en-tête X-School-Id est absent ou invalide.',
                'code' => 'school_header_invalid',
            ], Response::HTTP_BAD_REQUEST);
        }

        try {
            // Contexte posé AVANT la vérification : la RLS ne laisse voir que cette école et ses affectations
            $this->context->setUser($user->id);
            $this->context->setSchool($schoolId);

            $school = School::query()->find($schoolId);
            // Membre actif : au moins une affectation, et compte non désactivé dans cette école
            $isMember = RoleAssignment::query()->where('user_id', $user->id)->exists()
                && ! MemberDeactivation::isDeactivated($user->id);

            if ($school === null || ! $isMember) {
                throw new NotFoundHttpException;
            }

            $this->context->setSchool($school);

            $response = $next($request);
            \assert($response instanceof Response);

            return $response;
        } finally {
            $this->context->clear();
        }
    }

    /** Filet de sécurité : la réponse est déjà envoyée, le contexte ne doit pas survivre à la requête. */
    public function terminate(): void
    {
        $this->context->clear();
    }
}
