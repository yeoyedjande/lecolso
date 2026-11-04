<?php

declare(strict_types=1);

namespace App\Domains\Identity\Models;

use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Database\Factories\SchoolRoleFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Rôle défini par l'école (table school_roles) : rôle personnalisé (system_key nul, nom obligatoire),
 * ou ajustement des permissions d'un rôle système modifiable (system_key renseigné, sans nom).
 * Rôles effectifs d'une école : App\Domains\Identity\Authorization\RoleCatalog.
 *
 * @property string $id
 * @property string $school_id
 * @property string|null $system_key
 * @property string|null $name
 * @property string|null $description
 * @property list<string> $permissions
 */
final class SchoolRole extends Model
{
    use Auditable;
    use BelongsToSchool;

    /** @use HasFactory<SchoolRoleFactory> */
    use HasFactory;

    use HasUuids;

    protected $table = 'school_roles';

    /** @var list<string> */
    protected $fillable = ['system_key', 'name', 'description', 'permissions'];

    /**
     * Rôles définis par une école donnée, même hors école courante (permissions de /me pour toutes ses écoles).
     *
     * Exception au scope « école courante » (test d'architecture), justifiée : la RLS (politique
     * member_school_roles_select) ne laisse lire hors de l'école courante que les rôles des écoles où l'utilisateur
     * courant (app.user_id) a une affectation ; aucune écriture n'est possible hors de l'école courante.
     *
     * @return Builder<SchoolRole>
     */
    public static function ofSchool(string $schoolId): Builder
    {
        return self::query()->withoutGlobalScope('school')->where('school_id', $schoolId);
    }

    public function isCustom(): bool
    {
        return $this->system_key === null;
    }

    protected static function newFactory(): SchoolRoleFactory
    {
        return SchoolRoleFactory::new();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['permissions' => 'array'];
    }
}
