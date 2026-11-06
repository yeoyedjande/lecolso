<?php

declare(strict_types=1);

namespace App\Domains\Grading\Support;

use App\Domains\Grading\Models\TermClosure;
use App\Support\Http\BusinessConflict;

/**
 * Période validée par la direction pour une classe : ses évaluations, notes, compétences et appréciations ne changent
 * plus (409 term_closed), en ligne comme hors connexion, jusqu'au déverrouillage motivé.
 */
final class TermLock
{
    public static function closure(string $classroomId, string $termId): ?TermClosure
    {
        return TermClosure::query()
            ->where('classroom_id', $classroomId)
            ->where('term_id', $termId)
            ->whereNull('reopened_at')
            ->first();
    }

    public static function isClosed(string $classroomId, string $termId): bool
    {
        return self::closure($classroomId, $termId) !== null;
    }

    /**
     * À appeler dans la transaction d'écriture, avant toute écriture : prend le verrou de la classe et de la période
     * (le même que CloseTerm et ReopenTerm), puis vérifie qu'elle n'est pas validée. Une saisie et une validation
     * simultanées passent donc l'une après l'autre : aucune note ne change après la validation.
     *
     * @throws BusinessConflict term_closed
     */
    public static function guard(string $classroomId, string $termId): void
    {
        GradingLock::acquire('closure', $classroomId, $termId);
        self::assertOpen($classroomId, $termId);
    }

    /** @throws BusinessConflict term_closed */
    public static function assertOpen(string $classroomId, string $termId): void
    {
        if (self::isClosed($classroomId, $termId)) {
            throw new BusinessConflict('term_closed', 'Les bulletins de cette période sont validés : la direction doit d’abord les déverrouiller.');
        }
    }
}
