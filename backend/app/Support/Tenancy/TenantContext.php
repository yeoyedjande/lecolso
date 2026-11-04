<?php

declare(strict_types=1);

namespace App\Support\Tenancy;

use App\Domains\Tenancy\Models\School;
use Illuminate\Database\DatabaseManager;
use Throwable;

/**
 * Contexte tenant : école courante (et utilisateur courant) côté PHP ET côté PostgreSQL
 * (variables de session app.school_id et app.user_id, lues par les politiques RLS).
 *
 * Toujours sur la connexion applicative (pgsql, rôle app_user). La remise à zéro est faite en fin de requête
 * (ResolveSchool) et avant/après chaque job (TenancyServiceProvider).
 */
final class TenantContext
{
    public const string CONNECTION = 'pgsql';

    private ?string $userId = null;

    public function __construct(
        private readonly DatabaseManager $db,
        private readonly CurrentSchool $currentSchool,
    ) {}

    public function schoolId(): ?string
    {
        return $this->currentSchool->id();
    }

    public function school(): ?School
    {
        return $this->currentSchool->get();
    }

    public function userId(): ?string
    {
        return $this->userId;
    }

    public function setSchool(School|string $school): void
    {
        $id = $school instanceof School ? $school->getKey() : $school;

        if (! is_string($id)) {
            throw new MissingTenantContext('Identifiant d’école invalide.');
        }

        $this->setVariable('app.school_id', $id);
        $this->currentSchool->set($id, $school instanceof School ? $school : null);
    }

    public function setUser(?string $userId): void
    {
        $this->setVariable('app.user_id', $userId ?? '');
        $this->userId = $userId;
    }

    /**
     * Remet le contexte à zéro. Si la connexion est inutilisable (transaction en erreur), elle est fermée :
     * une session neuve n'a aucun contexte.
     */
    public function clear(): void
    {
        $this->currentSchool->forget();
        $this->userId = null;

        // Connexion jamais ouverte : aucune variable de session à effacer
        if (! array_key_exists(self::CONNECTION, $this->db->getConnections())) {
            return;
        }

        try {
            $this->db->connection(self::CONNECTION)
                ->select("SELECT set_config('app.school_id', '', false), set_config('app.user_id', '', false)");
        } catch (Throwable) {
            $this->db->disconnect(self::CONNECTION);
        }
    }

    /**
     * Exécute $callback dans le contexte de $school, puis rétablit le contexte précédent (même en cas d'exception).
     *
     * @template TResult
     *
     * @param  callable(): TResult  $callback
     * @return TResult
     */
    public function run(School|string $school, callable $callback): mixed
    {
        $previousSchool = $this->currentSchool->id();
        $previousUser = $this->userId;

        $this->setSchool($school);

        try {
            return $callback();
        } finally {
            if ($previousSchool === null) {
                $this->clear();
                if ($previousUser !== null) {
                    $this->setUser($previousUser);
                }
            } else {
                $this->setSchool($previousSchool);
            }
        }
    }

    private function setVariable(string $name, string $value): void
    {
        // set_config avec paramètres liés (SET n'accepte pas de paramètre) ; false = pour toute la session
        $this->db->connection(self::CONNECTION)->select('SELECT set_config(?, ?, false)', [$name, $value]);
    }
}
